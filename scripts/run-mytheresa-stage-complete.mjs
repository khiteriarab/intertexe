#!/usr/bin/env node
/**
 * Complete MyTheresa (MID 43172) stage-only ingest — all catalog files.
 * Writes ONLY to feed_staging_* . Never touches live products.
 * Kill switches stay armed; FEED_STAGE_DRY_RUN=1 required.
 *
 * Usage:
 *   FEED_STAGE_DRY_RUN=1 node scripts/run-mytheresa-stage-complete.mjs
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
for (const f of [".env.vercel.local", ".env.local", ".env"]) {
  dotenv.config({ path: path.join(root, f), quiet: true });
}
// Parent iOS .env often holds the working FTP password.
dotenv.config({ path: path.resolve(root, "../.env"), quiet: true });

process.env.FEED_LIVE_INGEST_ENABLED = "0";
process.env.FEED_STAGE_ONLY = "1";
process.env.FEED_STAGE_DRY_RUN = "1";
process.env.FEED_STAGE_FORCE_NEW_SESSION = "1";
process.env.CATALOG_ALLOW_MARK_INACTIVE = "0";
process.env.RAKUTEN_MARK_INACTIVE_ON_CYCLE = "false";
process.env.FEED_SYNC_ALERTS_MUTED = process.env.FEED_SYNC_ALERTS_MUTED || "1";
process.env.RAKUTEN_FTP_DIR_FILTER = process.env.RAKUTEN_FTP_DIR_FILTER || "43172";
// Process every discovered MyTheresa catalog file in one run.
process.env.RAKUTEN_CHUNK_FILE_LIMIT = process.env.RAKUTEN_CHUNK_FILE_LIMIT || "50";
delete process.env.FEED_SYNC_MAX_UPSERTS;
process.env.FEED_SYNC_OWNER = process.env.FEED_SYNC_OWNER || "mytheresa_stage_complete";

const require = createRequire(import.meta.url);
const { assertIngestAllowed, readStatusFlag } = require("../lib/feed-sync/ingest-guard.cjs");

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}
if (!(process.env.RAKUTEN_FTP_USER || process.env.RAKUTEN_FTP_USERNAME) || !process.env.RAKUTEN_FTP_PASSWORD) {
  console.error("RAKUTEN_FTP credentials required");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const outDir = path.join(root, "docs/p0-evidence");
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const evidencePath = path.join(outDir, `mytheresa-stage-complete-${stamp}.json`);

async function countProducts() {
  const { count, error } = await sb.from("products").select("id", { count: "estimated", head: true });
  if (error) throw error;
  return Number(count || 0);
}

async function countDisplayable() {
  const { data } = await sb
    .from("system_status")
    .select("value_json")
    .eq("key", "catalog_last_known_good")
    .maybeSingle();
  if (data?.value_json?.displayable != null) return Number(data.value_json.displayable);
  const { count, error } = await sb
    .from("products")
    .select("id", { count: "estimated", head: true })
    .eq("is_displayable", true);
  if (error) throw error;
  return Number(count || 0);
}

async function editorPickFingerprint() {
  const { count } = await sb
    .from("products")
    .select("id", { count: "estimated", head: true })
    .eq("is_editor_pick", true);
  const { data } = await sb
    .from("products")
    .select("product_id, is_editor_pick, approved, is_displayable, updated_at")
    .eq("is_editor_pick", true)
    .order("product_id", { ascending: true })
    .limit(10);
  return { editorPickCount: Number(count || 0), sampleFingerprint: JSON.stringify(data || []) };
}

function formatErr(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err, Object.getOwnPropertyNames(err || {}));
  } catch {
    return String(err);
  }
}

const evidence = {
  startedAt: new Date().toISOString(),
  merchant: "MyTheresa",
  mid: "43172",
  constraints: {
    FEED_LIVE_INGEST_ENABLED: process.env.FEED_LIVE_INGEST_ENABLED,
    FEED_STAGE_ONLY: process.env.FEED_STAGE_ONLY,
    FEED_STAGE_DRY_RUN: process.env.FEED_STAGE_DRY_RUN,
    FEED_STAGE_FORCE_NEW_SESSION: process.env.FEED_STAGE_FORCE_NEW_SESSION,
    CATALOG_ALLOW_MARK_INACTIVE: process.env.CATALOG_ALLOW_MARK_INACTIVE,
    RAKUTEN_FTP_DIR_FILTER: process.env.RAKUTEN_FTP_DIR_FILTER,
    RAKUTEN_CHUNK_FILE_LIMIT: process.env.RAKUTEN_CHUNK_FILE_LIMIT,
    hasSupabaseUrl: Boolean(url),
    hasServiceKey: Boolean(key),
    ftpUserLen: String(process.env.RAKUTEN_FTP_USER || process.env.RAKUTEN_FTP_USERNAME || "").length,
    ftpPassLen: String(process.env.RAKUTEN_FTP_PASSWORD || "").length,
  },
};

try {
  evidence.killSwitchesBefore = {
    catalog_publish_blocked: await readStatusFlag(sb, "catalog_publish_blocked"),
    feed_ingest_blocked: await readStatusFlag(sb, "feed_ingest_blocked"),
  };
  if (
    evidence.killSwitchesBefore.catalog_publish_blocked?.blocked !== true ||
    evidence.killSwitchesBefore.feed_ingest_blocked?.blocked !== true
  ) {
    throw new Error("Kill switches must remain armed during staging");
  }

  evidence.ingestGate = await assertIngestAllowed(sb);
  if (!evidence.ingestGate.ok || evidence.ingestGate.mode !== "stage") {
    throw new Error(`Expected stage mode, got ${JSON.stringify(evidence.ingestGate)}`);
  }

  evidence.productsBefore = await countProducts();
  evidence.displayableBefore = await countDisplayable();
  evidence.integrityBefore = await editorPickFingerprint();

  const { syncRakutenFeeds } = await import(
    pathToFileURL(path.join(root, "lib/feed-sync/rakuten-sync.js")).href
  );
  const syncResult = await syncRakutenFeeds({
    fileOffset: 0,
    fileLimit: Number(process.env.RAKUTEN_CHUNK_FILE_LIMIT || 50),
    markInactive: false,
  });

  if (syncResult.ingestBlocked) {
    throw new Error(`ingest blocked: ${JSON.stringify(syncResult.errors)}`);
  }
  if (syncResult.ingestMode && syncResult.ingestMode !== "stage") {
    throw new Error(`unexpected ingestMode=${syncResult.ingestMode}`);
  }

  evidence.syncResult = {
    upserted: syncResult.upserted,
    filesProcessed: syncResult.filesProcessed,
    totalCatalogFiles: syncResult.totalCatalogFiles,
    rejected: syncResult.stats?.rejected ?? syncResult.skippedOutOfScope,
    missingComposition: syncResult.stats?.missingComposition,
    totalProcessed: syncResult.stats?.totalProcessed,
    errors: (syncResult.errors || []).slice(0, 30),
    stagingSessionId: syncResult.stagingSessionId,
    ingestMode: syncResult.ingestMode || "stage",
    stats: syncResult.stats,
  };

  const sessionId = syncResult.stagingSessionId;
  if (!sessionId) throw new Error("No stagingSessionId returned");

  const { data: session } = await sb
    .from("feed_staging_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  evidence.stagingSession = session;

  const { count: stagedCount } = await sb
    .from("feed_staged_rows")
    .select("product_id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  evidence.stagedRowCount = Number(stagedCount || 0);

  // Classify staged vs live + displayable among staged.
  let alreadyInLive = 0;
  let newToLive = 0;
  let qualifyingDisplayable = 0;
  let offset = 0;
  const PAGE = 500;
  for (;;) {
    const { data: page, error } = await sb
      .from("feed_staged_rows")
      .select("product_id, payload")
      .eq("session_id", sessionId)
      .order("product_id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    const rows = page || [];
    if (!rows.length) break;

    for (const r of rows) {
      const p = r.payload || {};
      if (p.is_displayable === true && p.approved === "yes") qualifyingDisplayable += 1;
    }
    const ids = rows.map((r) => String(r.product_id));
    const { data: found } = await sb.from("products").select("product_id").in("product_id", ids);
    const foundSet = new Set((found || []).map((x) => x.product_id));
    alreadyInLive += foundSet.size;
    newToLive += ids.filter((id) => !foundSet.has(id)).length;

    offset += rows.length;
    if (rows.length < PAGE) break;
  }

  evidence.classification = {
    productsStaged: evidence.stagedRowCount,
    newProducts: newToLive,
    existingProductUpdates: alreadyInLive,
    qualifyingDisplayable,
    rejected: evidence.syncResult.rejected,
    rejectedReasons: {
      skippedOutOfScope: evidence.syncResult.rejected,
      missingComposition: evidence.syncResult.missingComposition || 0,
    },
  };

  evidence.productsAfter = await countProducts();
  evidence.displayableAfter = await countDisplayable();
  evidence.integrityAfter = await editorPickFingerprint();
  evidence.liveUntouched =
    evidence.productsBefore === evidence.productsAfter &&
    evidence.displayableBefore === evidence.displayableAfter &&
    evidence.integrityBefore.editorPickCount === evidence.integrityAfter.editorPickCount &&
    evidence.integrityBefore.sampleFingerprint === evidence.integrityAfter.sampleFingerprint;

  evidence.sessionComplete =
    session?.status === "complete" &&
    session?.cycle_complete === true &&
    Number(session?.files_processed || 0) >= Number(session?.total_catalog_files || 0) &&
    Number(session?.total_catalog_files || 0) > 0;

  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify(
      {
        evidencePath,
        sessionId,
        sessionComplete: evidence.sessionComplete,
        liveUntouched: evidence.liveUntouched,
        filesDiscovered: evidence.syncResult.totalCatalogFiles,
        filesProcessed: evidence.syncResult.filesProcessed,
        classification: evidence.classification,
        stagingStatus: session?.status,
        cycleComplete: session?.cycle_complete,
      },
      null,
      2
    )
  );

  if (!evidence.liveUntouched) process.exit(2);
  if (!evidence.sessionComplete) process.exit(3);
  process.exit(0);
} catch (err) {
  evidence.error = formatErr(err);
  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.error(evidence.error);
  console.error("wrote", evidencePath);
  process.exit(1);
}
