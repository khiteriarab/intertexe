import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { detectStaleMerchants, finalizeNightlySyncOps } from "./ops-monitor";
import { isSafetyBlockMessage } from "./sync-outcome-classify";
import { takeCatalogSnapshot, restoreCatalogFromSnapshot, latestCatalogSnapshot } from "../catalog-snapshot";
import {
  buildAiCatalogVerification,
  computeCatalogHealthScore,
  evaluatePromoteGates,
  persistCatalogHealthState,
  runCatalogSmokeTests,
} from "../catalog-health";

const CHUNK_STATE_KEY = "rakuten_feed_chunk_state";
const LOCK_KEY = "rakuten_feed_sync_lock";
const DEFAULT_FILE_LIMIT = Number(process.env.RAKUTEN_CHUNK_FILE_LIMIT || 2);
const LOCK_TTL_MS = 45 * 60 * 1000;

async function acquireFeedLock(
  supabase: SupabaseClient,
  owner: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const now = Date.now();
  const { data } = await supabase
    .from("system_status")
    .select("value_json")
    .eq("key", LOCK_KEY)
    .maybeSingle();
  const v = (data?.value_json || {}) as {
    locked?: boolean;
    owner?: string;
    expiresAt?: string;
  };
  const expiresAt = v.expiresAt ? Date.parse(v.expiresAt) : 0;
  if (v.locked && expiresAt > now && v.owner && v.owner !== owner) {
    return { ok: false, reason: `held_by_${v.owner}_until_${v.expiresAt}` };
  }
  await supabase.from("system_status").upsert({
    key: LOCK_KEY,
    value_json: {
      locked: true,
      owner,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
    },
    updated_at: new Date().toISOString(),
  });
  return { ok: true };
}

async function releaseFeedLock(supabase: SupabaseClient, owner: string) {
  const { data } = await supabase
    .from("system_status")
    .select("value_json")
    .eq("key", LOCK_KEY)
    .maybeSingle();
  const v = (data?.value_json || {}) as { owner?: string };
  if (v.owner && v.owner !== owner) return;
  await supabase.from("system_status").upsert({
    key: LOCK_KEY,
    value_json: {
      locked: false,
      owner: null,
      releasedAt: new Date().toISOString(),
      lastOwner: owner,
    },
    updated_at: new Date().toISOString(),
  });
}

export type RakutenChunkResult = {
  ok: boolean;
  fileOffset: number;
  nextFileOffset: number;
  fileLimit: number;
  cycleComplete: boolean;
  designersSynced?: number;
  homepageRefreshed?: boolean;
  alerted?: boolean;
  opsStatus?: string;
  emailSent?: boolean;
  emailError?: string | null;
  sync: {
    upserted?: number;
    rejected?: number;
    newProducts?: number;
    updatedProducts?: number;
    filesProcessed?: number;
    totalCatalogFiles?: number;
    stockStatusBackfilled?: number;
    errors: number;
    errorMessages?: string[];
  };
  error?: string;
  markInactiveError?: string;
  postCycleVerify?: Record<string, unknown>;
  preInactiveSnapshotId?: string;
};

function listingFailed(syncResult: {
  errors?: Array<{ message?: string } | string>;
  totalCatalogFiles?: number;
  upserted?: number;
  ingestBlocked?: boolean;
}): boolean {
  if (syncResult.ingestBlocked) return false;
  const msgs = (syncResult.errors || []).map((e) =>
    typeof e === "string" ? e : String(e?.message || "")
  );
  if (msgs.some((m) => isSafetyBlockMessage(m))) return false;
  if (msgs.some((m) => /could not list|zero catalog files|450/i.test(m))) return true;
  if (Number(syncResult.totalCatalogFiles || 0) === 0) return true;
  return false;
}

export async function runRakutenFeedChunk(
  supabase: SupabaseClient
): Promise<RakutenChunkResult> {
  const owner =
    process.env.FEED_SYNC_OWNER ||
    `runner_${process.env.GITHUB_RUN_ID || process.env.VERCEL_REGION || "local"}_${process.pid}`;
  const startedAt = new Date().toISOString();
  const lock = await acquireFeedLock(supabase, owner);
  if (!lock.ok) {
    return {
      ok: true,
      fileOffset: 0,
      nextFileOffset: 0,
      fileLimit: DEFAULT_FILE_LIMIT,
      cycleComplete: false,
      sync: { errors: 0, errorMessages: [`skipped_locked:${lock.reason}`] },
      error: `skipped_locked:${lock.reason}`,
    };
  }

  try {
    return await runRakutenFeedChunkLocked(supabase, startedAt);
  } finally {
    await releaseFeedLock(supabase, owner);
  }
}

async function recordOps(
  supabase: SupabaseClient,
  startedAt: string,
  partial: Record<string, unknown>
) {
  try {
    const ops = await finalizeNightlySyncOps(supabase, {
      startedAt,
      finishedAt: new Date().toISOString(),
      event: process.env.GITHUB_EVENT_NAME || "manual",
      source: process.env.FEED_SYNC_OWNER || "rakuten-feed-chunk",
      ...partial,
    });
    return {
      alerted: Boolean(ops.emailSent),
      opsStatus: String(ops.run.status || ""),
      emailSent: ops.emailSent,
      emailError: ops.emailError,
    };
  } catch (err) {
    console.warn(
      "[ops-monitor] finalize failed:",
      err instanceof Error ? err.message : String(err)
    );
    return { alerted: false, opsStatus: "failure", emailSent: false, emailError: String(err) };
  }
}

async function runRakutenFeedChunkLocked(
  supabase: SupabaseClient,
  startedAt: string
): Promise<RakutenChunkResult> {
  let fileOffset = 0;
  try {
    const { data } = await supabase
      .from("system_status")
      .select("value_json")
      .eq("key", CHUNK_STATE_KEY)
      .maybeSingle();
    fileOffset = Number(data?.value_json?.nextFileOffset ?? 0);
    // Self-heal: stuck offset with zero discovered files from prior failure.
    if (
      fileOffset > 0 &&
      Number(data?.value_json?.totalCatalogFiles ?? 0) === 0 &&
      Number(data?.value_json?.upserted ?? 0) === 0
    ) {
      fileOffset = 0;
    }
  } catch {
    fileOffset = 0;
  }

  const fileLimit = DEFAULT_FILE_LIMIT;

  // P0: refuse chunk runs that would mutate live catalog while kill switches are armed,
  // unless stage-only mode is active.
  const { createRequire } = await import("node:module");
  const requireCjs = createRequire(import.meta.url);
  const { assertIngestAllowed } = requireCjs("./ingest-guard.cjs");
  const ingestGate = await assertIngestAllowed(supabase);
  if (!ingestGate.ok) {
    const ops = await recordOps(supabase, startedAt, {
      ok: false,
      listingFailed: false,
      checkpointBefore: fileOffset,
      checkpointAfter: fileOffset,
      totalCatalogFiles: 0,
      filesProcessed: 0,
      upserted: 0,
      inserted: 0,
      updated: 0,
      rejected: 0,
      designersSynced: 0,
      errors: [ingestGate.reason],
      ingestBlocked: true,
    });
    return {
      ok: false,
      fileOffset,
      nextFileOffset: fileOffset,
      fileLimit,
      cycleComplete: false,
      sync: { errors: 1, errorMessages: [ingestGate.reason], upserted: 0 },
      error: ingestGate.reason,
      ...ops,
    };
  }

  const { syncRakutenFeeds } = await import("./rakuten-sync.js");

  let syncResult: Awaited<ReturnType<typeof syncRakutenFeeds>>;
  try {
    syncResult = await syncRakutenFeeds({
      fileOffset,
      fileLimit,
      markInactive: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("system_status").upsert({
      key: CHUNK_STATE_KEY,
      value_json: {
        nextFileOffset: 0,
        lastFileOffset: fileOffset,
        filesProcessed: 0,
        totalCatalogFiles: 0,
        cycleComplete: false,
        upserted: 0,
        listingFailed: true,
        lastError: message,
        updatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });
    await supabase.from("system_status").upsert({
      key: "rakuten_feed_sync",
      value_json: {
        errors: [message],
        upserted: 0,
        fileOffset,
        nextFileOffset: 0,
        filesProcessed: 0,
        totalCatalogFiles: 0,
        listingFailed: true,
      },
      updated_at: new Date().toISOString(),
    });
    const ops = await recordOps(supabase, startedAt, {
      ok: false,
      listingFailed: true,
      checkpointBefore: fileOffset,
      checkpointAfter: 0,
      totalCatalogFiles: 0,
      filesProcessed: 0,
      upserted: 0,
      inserted: 0,
      updated: 0,
      rejected: 0,
      designersSynced: 0,
      errors: [message],
      exceptionMessage: message,
      workflowFailed: true,
    });
    return {
      ok: false,
      fileOffset,
      nextFileOffset: 0,
      fileLimit,
      cycleComplete: false,
      alerted: ops.alerted,
      opsStatus: ops.opsStatus,
      emailSent: ops.emailSent,
      emailError: ops.emailError,
      sync: { errors: 1, errorMessages: [message] },
      error: message,
    };
  }

  const totalFiles = Number(syncResult.totalCatalogFiles ?? 0);
  const processed = Number(syncResult.filesProcessed ?? 0);
  const upserted = Number(syncResult.upserted ?? 0);
  const ingestBlocked = Boolean(
    (syncResult as { ingestBlocked?: boolean }).ingestBlocked
  );
  if (ingestBlocked) {
    const errorMessages = (syncResult.errors || []).map((e) =>
      typeof e === "string" ? e : String((e as { message?: string })?.message || e)
    );
    const ops = await recordOps(supabase, startedAt, {
      ok: false,
      listingFailed: false,
      ingestBlocked: true,
      checkpointBefore: fileOffset,
      checkpointAfter: fileOffset,
      totalCatalogFiles: 0,
      filesProcessed: 0,
      upserted: 0,
      inserted: 0,
      updated: 0,
      rejected: 0,
      designersSynced: 0,
      errors: errorMessages,
      workflowFailed: false,
    });
    return {
      ok: false,
      fileOffset,
      nextFileOffset: fileOffset,
      fileLimit,
      cycleComplete: false,
      sync: { errors: errorMessages.length, errorMessages, upserted: 0, totalCatalogFiles: 0 },
      error: errorMessages[0],
      ...ops,
    };
  }
  const failedList = listingFailed(syncResult);

  // Never advance checkpoint when listing failed or nothing was discovered.
  let nextOffset = fileOffset;
  if (!failedList && totalFiles > 0) {
    nextOffset = fileOffset + Math.max(processed, 0);
    if (nextOffset >= totalFiles) nextOffset = 0;
  } else {
    nextOffset = 0;
  }
  const cycleComplete = !failedList && totalFiles > 0 && nextOffset === 0 && fileOffset > 0;

  let markInactiveError: string | undefined;
  let homepageRefreshed = false;
  // Designer sync runs inside syncRakutenFeeds (scoped by this run). Do not call the
  // full-table RPC here — it times out and can mask successful product inserts.
  let designersSynced = Number((syncResult as { designersSynced?: number }).designersSynced || 0);

  let preInactiveSnapshotId: string | undefined;
  let postCycleVerify: Record<string, unknown> | undefined;

  if (cycleComplete) {
    // Row-level LKG before any inactive pass (incident 2026-07-27).
    try {
      const snap = await takeCatalogSnapshot(
        supabase,
        "pre_mark_inactive_cycle",
        "cycleComplete before markInactive"
      );
      preInactiveSnapshotId = snap.snapshotId;
    } catch (err: unknown) {
      markInactiveError = `snapshot_failed:${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (
    cycleComplete &&
    !markInactiveError &&
    process.env.RAKUTEN_MARK_INACTIVE_ON_CYCLE === "true"
  ) {
    try {
      const gates = await evaluatePromoteGates(supabase, { requirePrevious: true });
      if (!gates.ready) {
        markInactiveError = `promote_gates_blocked:${gates.blockers.join("|")}`;
        await supabase.from("system_status").upsert({
          key: "catalog_publish_blocked",
          value_json: {
            blocked: true,
            reason: "promote_gates_blocked",
            blockers: gates.blockers,
            warnings: gates.warnings,
            at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        });
      } else {
        await syncRakutenFeeds({
          fileOffset: 0,
          fileLimit: 0,
          feedUrls: [],
          markInactive: true,
          skipFtp: true,
        });
      }
    } catch (err: unknown) {
      markInactiveError = err instanceof Error ? err.message : String(err);
    }
  }

  if (cycleComplete) {
    try {
      const { error: railErr } = await supabase.rpc("refresh_homepage_feeds");
      homepageRefreshed = !railErr;
    } catch {
      homepageRefreshed = false;
    }

    // Production smoke + health score + advisory AI verification.
    try {
      const gates = await evaluatePromoteGates(supabase);
      const smoke = await runCatalogSmokeTests();
      const health = await computeCatalogHealthScore(supabase, smoke);
      const verification = buildAiCatalogVerification({
        previous: gates.previous,
        counts: gates.counts,
        smokeOk: smoke.ok,
        gates,
        health,
      });
      await persistCatalogHealthState(supabase, { health, smoke, verification, gates });

      let rolledBack = false;
      if (
        process.env.CATALOG_SMOKE_AUTOROLLBACK === "1" &&
        (!smoke.ok || verification.recommendation === "rollback") &&
        preInactiveSnapshotId
      ) {
        await restoreCatalogFromSnapshot(supabase, preInactiveSnapshotId);
        rolledBack = true;
      } else if (
        process.env.CATALOG_SMOKE_AUTOROLLBACK === "1" &&
        (!smoke.ok || verification.recommendation === "rollback")
      ) {
        const latest = await latestCatalogSnapshot(supabase);
        if (latest?.snapshotId) {
          await restoreCatalogFromSnapshot(supabase, latest.snapshotId);
          rolledBack = true;
        }
      }

      postCycleVerify = {
        smokeOk: smoke.ok,
        healthScore: health.score,
        recommendation: verification.recommendation,
        blockers: gates.blockers,
        rolledBack,
        preInactiveSnapshotId: preInactiveSnapshotId || null,
      };
    } catch (err: unknown) {
      postCycleVerify = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const errorMessages = (syncResult.errors || []).map((e: { message?: string } | string) =>
    typeof e === "string" ? e : String((e as { message?: string })?.message || e)
  );
  const designerFailed = errorMessages.some((m) => /designer_sync/i.test(m));

  try {
    await supabase.from("system_status").upsert({
      key: CHUNK_STATE_KEY,
      value_json: {
        nextFileOffset: nextOffset,
        lastFileOffset: fileOffset,
        filesProcessed: processed,
        totalCatalogFiles: totalFiles,
        cycleComplete,
        upserted,
        listingFailed: failedList,
        designersSynced,
        updatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });
    await supabase.from("system_status").upsert({
      key: "catalog_feed_revision",
      value_json: { revision: new Date().toISOString(), source: "rakuten-feed-chunk" },
      updated_at: new Date().toISOString(),
    });
    await supabase.from("system_status").upsert({
      key: "rakuten_feed_sync",
      value_json: {
        ...(syncResult.stats || {}),
        fileOffset,
        nextFileOffset: nextOffset,
        filesProcessed: processed,
        totalCatalogFiles: totalFiles,
        stockStatusBackfilled: syncResult.stockStatusBackfilled,
        upserted,
        listingFailed: failedList,
        designersSynced,
        homepageRefreshed,
        errors: errorMessages,
      },
      updated_at: new Date().toISOString(),
    });
  } catch {
    // non-fatal
  }

  const inserted = Number(syncResult.stats?.newProducts || 0);
  const updated = Number(syncResult.stats?.updatedProducts || 0);
  const rejected = Number(syncResult.stats?.rejected || 0);
  let staleMerchants: string[] = [];
  // Only surface stale feeds on cycle completion to avoid alert-every-chunk noise.
  if (cycleComplete) {
    try {
      staleMerchants = await detectStaleMerchants(supabase);
    } catch {
      staleMerchants = [];
    }
  }
  const ops = await recordOps(supabase, startedAt, {
    ok: !failedList && !designerFailed,
    listingFailed: failedList,
    designerFailed,
    cycleComplete,
    checkpointBefore: fileOffset,
    checkpointAfter: nextOffset,
    totalCatalogFiles: totalFiles,
    filesProcessed: processed,
    upserted,
    inserted,
    updated,
    rejected,
    designersSynced,
    errors: errorMessages,
    staleMerchants,
    affectedMerchants: staleMerchants,
    workflowFailed: failedList || designerFailed,
  });

  return {
    ok: !failedList && !designerFailed && !markInactiveError,
    fileOffset,
    nextFileOffset: nextOffset,
    fileLimit,
    cycleComplete,
    designersSynced,
    homepageRefreshed,
    alerted: ops.alerted,
    opsStatus: ops.opsStatus,
    emailSent: ops.emailSent,
    emailError: ops.emailError,
    markInactiveError,
    postCycleVerify,
    preInactiveSnapshotId,
    sync: {
      upserted,
      rejected,
      newProducts: inserted,
      updatedProducts: updated,
      filesProcessed: processed,
      totalCatalogFiles: totalFiles,
      stockStatusBackfilled: syncResult.stockStatusBackfilled,
      errors: errorMessages.length,
      errorMessages,
    },
    error: failedList
      ? errorMessages[0] || "FTP listing failed"
      : designerFailed
        ? "designer_sync_failed"
        : markInactiveError
          ? markInactiveError
          : undefined,
  };
}

export function getChunkSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}
