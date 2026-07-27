#!/usr/bin/env node
/**
 * Production Rakuten chunk runner for GitHub Actions / local ops.
 * Usage:
 *   node scripts/run-rakuten-feed-chunk.mjs
 *   RAKUTEN_CHUNK_FILE_LIMIT=2 node scripts/run-rakuten-feed-chunk.mjs
 */
import { spawnSync } from "child_process";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Large merchant XML + upsert can exhaust GitHub-hosted runners (~7GB RAM).
// Cap heap under physical RAM; process files in flushed waves (see rakuten-sync.js).
if (process.env.RAKUTEN_HEAP_RAISED !== "1") {
  const heapMb = Number(process.env.RAKUTEN_SYNC_HEAP_MB || 6144);
  const result = spawnSync(
    process.execPath,
    [`--max-old-space-size=${heapMb}`, __filename, ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: { ...process.env, RAKUTEN_HEAP_RAISED: "1" },
    }
  );
  process.exit(result.status === null ? 1 : result.status);
}

const root = path.resolve(__dirname, "..");
const require = createRequire(path.join(root, "package.json"));
const { finalizeNightlySyncOps } = require(path.join(root, "lib/feed-sync/ops-monitor.cjs"));

const LOCK_KEY = "rakuten_feed_sync_lock";
const CHUNK_STATE_KEY = "rakuten_feed_chunk_state";
const LOCK_TTL_MS = 45 * 60 * 1000;

function getSupabase() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function acquireLock(sb, owner) {
  const now = Date.now();
  const { data } = await sb.from("system_status").select("value_json").eq("key", LOCK_KEY).maybeSingle();
  const v = data?.value_json || {};
  const expiresAt = v.expiresAt ? Date.parse(v.expiresAt) : 0;
  if (v.locked && expiresAt > now && v.owner && v.owner !== owner) {
    return { ok: false, reason: `held_by_${v.owner}_until_${v.expiresAt}` };
  }
  await sb.from("system_status").upsert({
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

async function releaseLock(sb, owner) {
  const { data } = await sb.from("system_status").select("value_json").eq("key", LOCK_KEY).maybeSingle();
  const v = data?.value_json || {};
  if (v.owner && v.owner !== owner) return;
  await sb.from("system_status").upsert({
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

async function main() {
  const sb = getSupabase();
  if (!sb) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const owner = process.env.FEED_SYNC_OWNER || `gha_${process.env.GITHUB_RUN_ID || process.pid}`;
  const startedAt = new Date().toISOString();
  const lock = await acquireLock(sb, owner);
  if (!lock.ok) {
    console.log(JSON.stringify({ ok: false, skipped: true, reason: lock.reason }, null, 2));
    process.exit(0);
  }

  const { data: beforeRow } = await sb
    .from("system_status")
    .select("value_json")
    .eq("key", CHUNK_STATE_KEY)
    .maybeSingle();
  const checkpointBefore = Number(beforeRow?.value_json?.nextFileOffset ?? 0);

  try {
    let result;
    let opsAlreadyRecorded = false;
    try {
      const mod = await import(
        pathToFileURL(path.join(root, "lib/feed-sync/run-rakuten-chunk.ts")).href
      );
      result = await mod.runRakutenFeedChunk(sb);
      opsAlreadyRecorded = Boolean(result?.opsStatus);
    } catch (importErr) {
      console.warn("TS runner unavailable, using JS fallback:", importErr?.message || importErr);
      const { syncRakutenFeeds } = require(path.join(root, "lib/feed-sync/rakuten-sync.js"));
      let fileOffset = checkpointBefore;
      const fileLimit = Number(process.env.RAKUTEN_CHUNK_FILE_LIMIT || 2);
      const syncResult = await syncRakutenFeeds({
        fileOffset,
        fileLimit,
        markInactive: false,
      });
      const totalFiles = Number(syncResult.totalCatalogFiles ?? 0);
      const processed = Number(syncResult.filesProcessed ?? 0);
      const upserted = Number(syncResult.upserted ?? 0);
      const errorMessages = (syncResult.errors || []).map((e) =>
        typeof e === "string" ? e : e?.message || String(e)
      );
      const failedList =
        totalFiles === 0 ||
        errorMessages.some((m) => /could not list|450|zero catalog/i.test(m));
      let nextOffset = failedList ? 0 : fileOffset + Math.max(processed, 0);
      if (!failedList && totalFiles > 0 && nextOffset >= totalFiles) nextOffset = 0;

      await sb.from("system_status").upsert({
        key: CHUNK_STATE_KEY,
        value_json: {
          nextFileOffset: nextOffset,
          lastFileOffset: fileOffset,
          filesProcessed: processed,
          totalCatalogFiles: totalFiles,
          cycleComplete: !failedList && totalFiles > 0 && nextOffset === 0 && fileOffset > 0,
          upserted,
          listingFailed: failedList,
          designersSynced: syncResult.designersSynced || 0,
          source: owner,
          updatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
      await sb.from("system_status").upsert({
        key: "rakuten_feed_sync",
        value_json: {
          ...(syncResult.stats || {}),
          fileOffset,
          nextFileOffset: nextOffset,
          filesProcessed: processed,
          totalCatalogFiles: totalFiles,
          upserted,
          listingFailed: failedList,
          designersSynced: syncResult.designersSynced || 0,
          errors: errorMessages,
          source: owner,
          finished: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });

      result = {
        ok: !failedList && errorMessages.length === 0,
        fileOffset,
        nextFileOffset: nextOffset,
        fileLimit,
        designersSynced: syncResult.designersSynced || 0,
        sync: {
          upserted,
          rejected: Number(syncResult.stats?.rejected || 0),
          filesProcessed: processed,
          totalCatalogFiles: totalFiles,
          errors: errorMessages.length,
          errorMessages,
          newProducts: syncResult.stats?.newProducts,
          updatedProducts: syncResult.stats?.updatedProducts,
        },
        error: failedList ? errorMessages[0] : undefined,
      };

      const ops = await finalizeNightlySyncOps(sb, {
        startedAt,
        finishedAt: new Date().toISOString(),
        ok: result.ok,
        listingFailed: failedList,
        designerFailed: errorMessages.some((m) => /designer_sync/i.test(m)),
        checkpointBefore: fileOffset,
        checkpointAfter: nextOffset,
        totalCatalogFiles: totalFiles,
        filesProcessed: processed,
        upserted,
        inserted: Number(syncResult.stats?.newProducts || 0),
        updated: Number(syncResult.stats?.updatedProducts || 0),
        rejected: Number(syncResult.stats?.rejected || 0),
        designersSynced: syncResult.designersSynced || 0,
        errors: errorMessages,
        workflowFailed: !result.ok,
        source: owner,
      });
      result.opsStatus = ops.run.status;
      result.emailSent = ops.emailSent;
      result.emailError = ops.emailError;
      opsAlreadyRecorded = true;
    }

    const { data: afterRow } = await sb
      .from("system_status")
      .select("value_json")
      .eq("key", CHUNK_STATE_KEY)
      .maybeSingle();

    if (!opsAlreadyRecorded) {
      const sync = result.sync || {};
      const ops = await finalizeNightlySyncOps(sb, {
        startedAt,
        finishedAt: new Date().toISOString(),
        ok: result.ok,
        listingFailed: Number(sync.totalCatalogFiles || 0) === 0,
        designerFailed: (sync.errorMessages || []).some((m) => /designer_sync/i.test(String(m))),
        checkpointBefore,
        checkpointAfter: Number(afterRow?.value_json?.nextFileOffset ?? result.nextFileOffset),
        totalCatalogFiles: Number(sync.totalCatalogFiles || 0),
        filesProcessed: Number(sync.filesProcessed || 0),
        upserted: Number(sync.upserted || 0),
        inserted: Number(sync.newProducts || 0),
        updated: Number(sync.updatedProducts || 0),
        rejected: Number(sync.rejected || 0),
        designersSynced: Number(result.designersSynced || 0),
        errors: sync.errorMessages || [],
        workflowFailed: result.ok === false,
        source: owner,
      });
      result.opsStatus = ops.run.status;
      result.emailSent = ops.emailSent;
      result.emailError = ops.emailError;
    }

    const report = {
      ...result,
      checkpointBefore,
      checkpointAfter: Number(afterRow?.value_json?.nextFileOffset ?? result.nextFileOffset),
      owner,
    };
    console.log(JSON.stringify(report, null, 2));
    if (!result.ok && Number(result.sync?.totalCatalogFiles || 0) === 0) process.exit(1);
  } catch (err) {
    try {
      await finalizeNightlySyncOps(sb, {
        startedAt,
        finishedAt: new Date().toISOString(),
        ok: false,
        listingFailed: true,
        checkpointBefore,
        checkpointAfter: checkpointBefore,
        totalCatalogFiles: 0,
        filesProcessed: 0,
        upserted: 0,
        errors: [err?.message || String(err)],
        exceptionMessage: err?.message || String(err),
        workflowFailed: true,
        source: owner,
      });
    } catch (opsErr) {
      console.warn("[ops-monitor] finalize after exception failed:", opsErr?.message || opsErr);
    }
    throw err;
  } finally {
    await releaseLock(sb, owner);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
