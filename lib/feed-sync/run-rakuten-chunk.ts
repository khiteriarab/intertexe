import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CHUNK_STATE_KEY = "rakuten_feed_chunk_state";
const LOCK_KEY = "rakuten_feed_sync_lock";
const DEFAULT_FILE_LIMIT = Number(process.env.RAKUTEN_CHUNK_FILE_LIMIT || 2);
const ALERT_EMAIL = process.env.FEED_ALERT_EMAIL || "info@intertexe.com";
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
  sync: {
    upserted?: number;
    rejected?: number;
    filesProcessed?: number;
    totalCatalogFiles?: number;
    stockStatusBackfilled?: number;
    errors: number;
    errorMessages?: string[];
  };
  error?: string;
  markInactiveError?: string;
};

function listingFailed(syncResult: {
  errors?: Array<{ message?: string } | string>;
  totalCatalogFiles?: number;
  upserted?: number;
}): boolean {
  const msgs = (syncResult.errors || []).map((e) =>
    typeof e === "string" ? e : String(e?.message || "")
  );
  if (msgs.some((m) => /could not list|zero catalog files|450/i.test(m))) return true;
  if (Number(syncResult.totalCatalogFiles || 0) === 0) return true;
  return false;
}

async function sendFeedAlert(subject: string, body: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "INTERTEXE <info@mail.intertexe.com>",
        to: [ALERT_EMAIL],
        subject,
        text: body,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runRakutenFeedChunk(
  supabase: SupabaseClient
): Promise<RakutenChunkResult> {
  const owner =
    process.env.FEED_SYNC_OWNER ||
    `runner_${process.env.GITHUB_RUN_ID || process.env.VERCEL_REGION || "local"}_${process.pid}`;
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
    return await runRakutenFeedChunkLocked(supabase);
  } finally {
    await releaseFeedLock(supabase, owner);
  }
}

async function runRakutenFeedChunkLocked(
  supabase: SupabaseClient
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
    const alerted = await sendFeedAlert(
      "INTERTEXE CRITICAL: Rakuten FTP sync failed",
      [`Offset ${fileOffset}`, message, new Date().toISOString()].join("\n")
    );
    return {
      ok: false,
      fileOffset,
      nextFileOffset: 0,
      fileLimit,
      cycleComplete: false,
      alerted,
      sync: { errors: 1, errorMessages: [message] },
      error: message,
    };
  }

  const totalFiles = Number(syncResult.totalCatalogFiles ?? 0);
  const processed = Number(syncResult.filesProcessed ?? 0);
  const upserted = Number(syncResult.upserted ?? 0);
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

  if (cycleComplete && process.env.RAKUTEN_MARK_INACTIVE_ON_CYCLE === "true") {
    try {
      await syncRakutenFeeds({
        fileOffset: 0,
        fileLimit: 0,
        feedUrls: [],
        markInactive: true,
        skipFtp: true,
      });
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
  }

  const errorMessages = (syncResult.errors || []).map((e: { message?: string } | string) =>
    typeof e === "string" ? e : String((e as { message?: string })?.message || e)
  );
  const designerFailed = errorMessages.some((m) => /designer_sync/i.test(m));
  if (upserted > 0 && designerFailed) {
    await sendFeedAlert(
      "INTERTEXE WARNING: designer sync failed after product upserts",
      [
        `upserted=${upserted}`,
        `designersSynced=${designersSynced}`,
        `errors=${errorMessages.join(" | ")}`,
        new Date().toISOString(),
      ].join("\n")
    );
  }

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

  let alerted = false;
  if (failedList || (totalFiles > 0 && processed === 0 && upserted === 0)) {
    alerted = await sendFeedAlert(
      failedList
        ? "INTERTEXE CRITICAL: Rakuten FTP listing failed"
        : "INTERTEXE WARNING: Rakuten sync upserted 0 products",
      [
        `fileOffset=${fileOffset}`,
        `nextOffset=${nextOffset}`,
        `totalCatalogFiles=${totalFiles}`,
        `filesProcessed=${processed}`,
        `upserted=${upserted}`,
        `errors=${errorMessages.join(" | ") || "none"}`,
        new Date().toISOString(),
      ].join("\n")
    );
  }

  return {
    ok: !failedList && !designerFailed,
    fileOffset,
    nextFileOffset: nextOffset,
    fileLimit,
    cycleComplete,
    designersSynced,
    homepageRefreshed,
    alerted,
    markInactiveError,
    sync: {
      upserted,
      rejected: Number(syncResult.stats?.rejected || 0),
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
