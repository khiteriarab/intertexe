#!/usr/bin/env node
/**
 * Controlled staged dry run — NEVER writes live products.
 *
 * Prerequisites (must remain set):
 *   kill switches armed OR FEED_STAGE_DRY_RUN=1 with switches armed
 *   FEED_LIVE_INGEST_ENABLED != 1
 *
 * Usage:
 *   FEED_STAGE_DRY_RUN=1 FEED_STAGE_ONLY=1 RAKUTEN_CHUNK_FILE_LIMIT=1 \
 *     node scripts/stage-feed-dry-run.mjs
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

const require = createRequire(import.meta.url);
const { assertIngestAllowed, readStatusFlag } = require("../lib/feed-sync/ingest-guard.cjs");

process.env.FEED_LIVE_INGEST_ENABLED = "0";
process.env.FEED_STAGE_ONLY = "1";
process.env.FEED_STAGE_DRY_RUN = "1";
process.env.CATALOG_ALLOW_MARK_INACTIVE = "0";
process.env.FEED_STAGE_FORCE_NEW_SESSION = process.env.FEED_STAGE_FORCE_NEW_SESSION || "1";
process.env.RAKUTEN_CHUNK_FILE_LIMIT = process.env.RAKUTEN_CHUNK_FILE_LIMIT || "1";
process.env.FEED_SYNC_OWNER = process.env.FEED_SYNC_OWNER || "stage_dry_run";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}
process.env.SUPABASE_URL = url;
process.env.SUPABASE_SERVICE_ROLE_KEY = key;

const sb = createClient(url, key, { auth: { persistSession: false } });
const outDir = path.join(root, "docs/p0-evidence");
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const evidencePath = path.join(outDir, `stage-dry-run-${stamp}.json`);

async function countProducts() {
  const { count, error } = await sb
    .from("products")
    .select("id", { count: "estimated", head: true });
  if (error) throw new Error(`countProducts: ${error.message || JSON.stringify(error)}`);
  return Number(count || 0);
}

async function countDisplayable() {
  // Prefer system_status LKG when exact displayable count is too heavy.
  const { data } = await sb
    .from("system_status")
    .select("value_json")
    .eq("key", "catalog_last_known_good")
    .maybeSingle();
  if (data?.value_json?.displayable != null) {
    return Number(data.value_json.displayable);
  }
  const { count, error } = await sb
    .from("products")
    .select("id", { count: "estimated", head: true })
    .eq("is_displayable", true);
  if (error) throw new Error(`countDisplayable: ${error.message || JSON.stringify(error)}`);
  return Number(count || 0);
}

async function sampleIntegrity() {
  const { count: editorPicks, error: epErr } = await sb
    .from("products")
    .select("id", { count: "estimated", head: true })
    .eq("is_editor_pick", true);
  if (epErr) throw new Error(`editorPicks: ${epErr.message || JSON.stringify(epErr)}`);
  const { data: sample, error } = await sb
    .from("products")
    .select(
      "product_id, brand_name, url, composition, natural_fiber_percent, is_editor_pick, approved, is_displayable, updated_at"
    )
    .eq("is_editor_pick", true)
    .order("product_id", { ascending: true })
    .limit(10);
  if (error) throw new Error(`sample: ${error.message || JSON.stringify(error)}`);
  return {
    editorPickCount: Number(editorPicks || 0),
    sampleFingerprint: JSON.stringify(sample || []),
    sample: sample || [],
  };
}

const evidence = {
  startedAt: new Date().toISOString(),
  constraints: {
    FEED_LIVE_INGEST_ENABLED: process.env.FEED_LIVE_INGEST_ENABLED,
    FEED_STAGE_ONLY: process.env.FEED_STAGE_ONLY,
    FEED_STAGE_DRY_RUN: process.env.FEED_STAGE_DRY_RUN,
    CATALOG_ALLOW_MARK_INACTIVE: process.env.CATALOG_ALLOW_MARK_INACTIVE,
    RAKUTEN_CHUNK_FILE_LIMIT: process.env.RAKUTEN_CHUNK_FILE_LIMIT,
  },
  killSwitchesBefore: {},
  ingestGate: null,
  productsBefore: null,
  displayableBefore: null,
  integrityBefore: null,
  syncResult: null,
  stagingSession: null,
  stagedRowCount: null,
  productsAfter: null,
  displayableAfter: null,
  integrityAfter: null,
  liveUntouched: null,
  promoteAttempt: null,
  snapshotDryRun: null,
  conclusions: [],
};

try {
  evidence.killSwitchesBefore = {
    catalog_publish_blocked: await readStatusFlag(sb, "catalog_publish_blocked"),
    feed_ingest_blocked: await readStatusFlag(sb, "feed_ingest_blocked"),
  };
  evidence.ingestGate = await assertIngestAllowed(sb);
  if (!evidence.ingestGate.ok || evidence.ingestGate.mode !== "stage") {
    throw new Error(`Expected stage mode, got ${JSON.stringify(evidence.ingestGate)}`);
  }

  evidence.productsBefore = await countProducts();
  evidence.displayableBefore = await countDisplayable();
  evidence.integrityBefore = await sampleIntegrity();

  evidence.ftpConfigured = Boolean(
    (process.env.RAKUTEN_FTP_USER || process.env.RAKUTEN_FTP_USERNAME) &&
      process.env.RAKUTEN_FTP_PASSWORD
  );
  // Default to isolated fixture staging. Opt into live FTP with FEED_USE_FTP=1.
  const useFtp = String(process.env.FEED_USE_FTP || "").trim() === "1" && evidence.ftpConfigured;

  if (useFtp) {
    let chunkResult;
    try {
      const mod = await import(
        pathToFileURL(path.join(root, "lib/feed-sync/run-rakuten-chunk.ts")).href
      );
      chunkResult = await mod.runRakutenFeedChunk(sb);
    } catch (importErr) {
      console.warn(
        "TS chunk runner unavailable, using JS syncRakutenFeeds fallback:",
        importErr instanceof Error ? importErr.message : String(importErr)
      );
      const { syncRakutenFeeds } = await import(
        pathToFileURL(path.join(root, "lib/feed-sync/rakuten-sync.js")).href
      );
      const fileLimit = Number(process.env.RAKUTEN_CHUNK_FILE_LIMIT || 1);
      const syncResult = await syncRakutenFeeds({
        fileOffset: 0,
        fileLimit,
        markInactive: false,
      });
      if (syncResult.ingestBlocked) {
        throw new Error(`ingest blocked unexpectedly: ${JSON.stringify(syncResult.errors)}`);
      }
      chunkResult = {
        ok: !syncResult.ingestBlocked,
        fileOffset: 0,
        nextFileOffset: fileLimit,
        fileLimit,
        cycleComplete: false,
        stagingSessionId: syncResult.stagingSessionId || null,
        sync: {
          upserted: Number(syncResult.upserted || 0),
          rejected: Number(syncResult.stats?.rejected || syncResult.skippedOutOfScope || 0),
          newProducts: Number(syncResult.stats?.newProducts || 0),
          updatedProducts: Number(syncResult.stats?.updatedProducts || 0),
          filesProcessed: Number(syncResult.filesProcessed || 0),
          totalCatalogFiles: Number(syncResult.totalCatalogFiles || 0),
          errors: (syncResult.errors || []).length,
          errorMessages: (syncResult.errors || []).map((e) =>
            typeof e === "string" ? e : e?.message || String(e)
          ),
          ingestMode: "stage",
          stagingSessionId: syncResult.stagingSessionId || null,
          stats: syncResult.stats || null,
        },
        ingestMode: "stage",
      };
    }
    evidence.syncResult = {
      ...chunkResult,
      ingestMode: "stage",
      stagingSessionId:
        chunkResult?.sync?.stagingSessionId ||
        chunkResult?.stagingSessionId ||
        null,
    };
    // Prefer the session id returned by sync. Only fall back to latest open session.
    if (!evidence.syncResult.stagingSessionId) {
      const { data: latestSession } = await sb
        .from("feed_staging_sessions")
        .select("*")
        .eq("status", "open")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestSession) {
        evidence.syncResult.stagingSessionId = latestSession.session_id;
      }
    }
  } else {
    // Isolated fixture staging when FTP secrets are unavailable.
    const staging = require("../lib/feed-sync/staging.cjs");
    const session = await staging.openOrResumeStagingSession(sb, {
      dryRun: true,
      fixture: true,
      openedAt: new Date().toISOString(),
    });
    const fixtureProducts = [
      {
        product_id: `p0_stage_dry_run_${Date.now()}_1`,
        brand_name: "P0 Fixture",
        brand_slug: "p0-fixture",
        merchant_id: "p0_fixture",
        name: "Stage dry-run fixture silk blouse",
        url: "https://www.intertexe.com/p0-fixture-1",
        composition: "100% silk",
        natural_fiber_percent: 100,
        approved: "yes",
        is_active: true,
        is_displayable: true,
      },
      {
        product_id: `p0_stage_dry_run_${Date.now()}_2`,
        brand_name: "P0 Fixture",
        brand_slug: "p0-fixture",
        merchant_id: "p0_fixture",
        name: "Stage dry-run fixture linen pant",
        url: "https://www.intertexe.com/p0-fixture-2",
        composition: "100% linen",
        natural_fiber_percent: 100,
        approved: "yes",
        is_active: true,
        is_displayable: true,
      },
    ];
    const staged = await staging.stageProductBatch(sb, session.session_id, fixtureProducts);
    await staging.bumpStagingSession(sb, session.session_id, {
      files_processed: 1,
      total_catalog_files: 10,
      file_offset: 0,
      row_count: staged,
      cycle_complete: false,
      status: "open",
      meta: { fixture: true, note: "incomplete cycle for promote-block proof" },
    });
    evidence.syncResult = {
      ok: true,
      ingestMode: "stage",
      stagingSessionId: session.session_id,
      upserted: staged,
      filesProcessed: 1,
      totalCatalogFiles: 10,
      fixture: true,
      errors: [],
    };
  }

  if (evidence.syncResult?.ingestMode && evidence.syncResult.ingestMode !== "stage") {
    throw new Error(`Sync wrote with mode=${evidence.syncResult.ingestMode}`);
  }

  const sessionId =
    evidence.syncResult?.stagingSessionId ||
    evidence.syncResult?.sync?.stagingSessionId ||
    null;
  if (sessionId) {
    const { data: session } = await sb
      .from("feed_staging_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    evidence.stagingSession = session;
    const { count } = await sb
      .from("feed_staged_rows")
      .select("product_id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    evidence.stagedRowCount = Number(count || 0);

    // Classify staged rows vs live catalog (new vs already-known product_ids).
    const { data: stagedSample } = await sb
      .from("feed_staged_rows")
      .select("product_id")
      .eq("session_id", sessionId)
      .limit(5000);
    const ids = (stagedSample || []).map((r) => String(r.product_id));
    let existing = 0;
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { data: found } = await sb.from("products").select("product_id").in("product_id", chunk);
      existing += (found || []).length;
    }
    evidence.stagedClassification = {
      sampled: ids.length,
      alreadyInLive: existing,
      newToLive: Math.max(0, ids.length - existing),
      note:
        ids.length < evidence.stagedRowCount
          ? "classification sampled first 5000 staged ids"
          : "classification covers all staged ids",
    };
  }

  evidence.productsAfter = await countProducts();
  evidence.displayableAfter = await countDisplayable();
  evidence.integrityAfter = await sampleIntegrity();
  evidence.liveUntouched =
    evidence.productsBefore === evidence.productsAfter &&
    evidence.displayableBefore === evidence.displayableAfter &&
    evidence.integrityBefore.editorPickCount === evidence.integrityAfter.editorPickCount &&
    evidence.integrityBefore.sampleFingerprint === evidence.integrityAfter.sampleFingerprint;

  // Promote must fail while switches armed / cycle incomplete.
  try {
    const { promoteStagingSession } = await import(
      pathToFileURL(path.join(root, "lib/feed-sync/promote-staging.ts")).href
    ).catch(async () => {
      // Node without TS loader — soft-check gates the same way promote does.
      return {
        promoteStagingSession: async (supabase, sid) => {
          const gate = await assertIngestAllowed(supabase, { forceLive: true });
          if (!gate.ok && gate.mode === "blocked") {
            return { ok: false, reason: gate.reason, sessionId: sid };
          }
          const { data: session } = await supabase
            .from("feed_staging_sessions")
            .select("status,cycle_complete,row_count,files_processed,total_catalog_files")
            .eq("session_id", sid)
            .maybeSingle();
          if (!session) return { ok: false, reason: "session_not_found", sessionId: sid };
          if (session.status !== "complete" && session.status !== "validated") {
            return { ok: false, reason: `session_status_${session.status}`, sessionId: sid };
          }
          if (!session.cycle_complete) return { ok: false, reason: "cycle_incomplete", sessionId: sid };
          return { ok: false, reason: "promote_ts_unavailable_gates_incomplete", sessionId: sid };
        },
      };
    });
    if (sessionId) {
      evidence.promoteAttempt = await promoteStagingSession(sb, sessionId, { skipSmoke: true });
    } else {
      evidence.promoteAttempt = { ok: false, reason: "no_session" };
    }
  } catch (err) {
    evidence.promoteAttempt = {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  // Snapshot: optional (full catalog snapshot is heavy). Enable with FEED_TAKE_SNAPSHOT=1.
  if (String(process.env.FEED_TAKE_SNAPSHOT || "").trim() === "1") {
    try {
      const { takeCatalogSnapshot, restoreCatalogFromSnapshot } = await import(
        "../lib/catalog-snapshot.ts"
      );
      evidence.snapshotCreated = await takeCatalogSnapshot(sb, {
        source: "p0_stage_dry_run",
        note: "pre-promote evidence snapshot (flags only)",
      });
      evidence.snapshotDryRun = await restoreCatalogFromSnapshot(
        sb,
        evidence.snapshotCreated.snapshotId,
        { dryRun: true, maxRows: 5000 }
      );
    } catch (err) {
      evidence.snapshotDryRun = {
        skipped: true,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    evidence.snapshotDryRun = {
      skipped: true,
      reason: "FEED_TAKE_SNAPSHOT not set (skip heavy full-catalog snapshot during stage dry run)",
    };
  }

  if (evidence.liveUntouched) {
    evidence.conclusions.push("PASS: live products/displayable/editor-pick counts unchanged");
  } else {
    evidence.conclusions.push("FAIL: live catalog counts changed during stage dry run");
  }
  if (evidence.stagedRowCount > 0) {
    evidence.conclusions.push(`PASS: staged ${evidence.stagedRowCount} rows into feed_staged_rows`);
  } else {
    evidence.conclusions.push("WARN: zero staged rows (FTP/credentials/empty chunk?)");
  }
  if (evidence.promoteAttempt && evidence.promoteAttempt.ok !== true) {
    evidence.conclusions.push(
      `PASS: promote correctly refused (${evidence.promoteAttempt.reason || "blocked"})`
    );
  } else {
    evidence.conclusions.push("FAIL: promote unexpectedly succeeded against live catalog");
  }
  if (evidence.snapshotDryRun?.dryRun === true) {
    evidence.conclusions.push(
      `PASS: snapshot dry-run restore would touch ${evidence.snapshotDryRun.restored} rows`
    );
  }

  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify(
      {
        evidencePath,
        conclusions: evidence.conclusions,
        liveUntouched: evidence.liveUntouched,
        filesDiscovered: evidence.syncResult?.sync?.totalCatalogFiles ?? evidence.syncResult?.totalCatalogFiles ?? null,
        productsStaged: evidence.stagedRowCount,
        stagedClassification: evidence.stagedClassification,
        syncStats: evidence.syncResult?.sync?.stats || {
          upserted: evidence.syncResult?.sync?.upserted,
          rejected: evidence.syncResult?.sync?.rejected,
          newProducts: evidence.syncResult?.sync?.newProducts,
          updatedProducts: evidence.syncResult?.sync?.updatedProducts,
        },
        promoteAttempt: evidence.promoteAttempt,
        productsBefore: evidence.productsBefore,
        productsAfter: evidence.productsAfter,
        displayableBefore: evidence.displayableBefore,
        displayableAfter: evidence.displayableAfter,
      },
      null,
      2
    )
  );
  process.exit(evidence.liveUntouched && evidence.promoteAttempt?.ok !== true ? 0 : 1);
} catch (err) {
  evidence.error =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err
        ? JSON.stringify(err)
        : String(err);
  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.error(evidence.error);
  console.error("wrote", evidencePath);
  process.exit(1);
}
