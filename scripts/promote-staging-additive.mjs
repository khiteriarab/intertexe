#!/usr/bin/env node
/**
 * Validate a completed staging session, then run additive-only promotion.
 *
 * Temporarily clears kill switches for promote only, then re-arms them.
 * Does NOT enable FEED_LIVE_INGEST_ENABLED or nightly schedule.
 *
 * Usage:
 *   node scripts/promote-staging-additive.mjs <session_id>
 *   node scripts/promote-staging-additive.mjs --latest-complete
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
for (const f of [".env.vercel.local", ".env.local", ".env"]) {
  dotenv.config({ path: path.join(root, f), quiet: true });
}
dotenv.config({ path: path.resolve(root, "../.env"), quiet: true });

process.env.FEED_LIVE_INGEST_ENABLED = "0";
process.env.CATALOG_ALLOW_MARK_INACTIVE = "0";
process.env.CATALOG_SMOKE_AUTOROLLBACK = process.env.CATALOG_SMOKE_AUTOROLLBACK || "1";

const require = createRequire(import.meta.url);
const { setCatalogKillSwitch, readStatusFlag } = require("../lib/feed-sync/ingest-guard.cjs");

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const arg = process.argv[2];
const outDir = path.join(root, "docs/p0-evidence");
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const evidencePath = path.join(outDir, `additive-promote-${stamp}.json`);

async function resolveSessionId() {
  if (arg && arg !== "--latest-complete") return arg;
  const { data } = await sb
    .from("feed_staging_sessions")
    .select("session_id, status, cycle_complete, row_count, total_catalog_files, files_processed, updated_at")
    .in("status", ["complete", "validated"])
    .eq("cycle_complete", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.session_id) throw new Error("No complete staging session found");
  return data.session_id;
}

async function countExact(filter = {}) {
  let q = sb.from("products").select("id", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
  const { count, error } = await q;
  if (error) throw error;
  return Number(count || 0);
}

async function classifySession(sessionId) {
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
  return { alreadyInLive, newToLive, qualifyingDisplayable, staged: alreadyInLive + newToLive };
}

const evidence = { startedAt: new Date().toISOString(), mode: "additive" };

try {
  const sessionId = await resolveSessionId();
  evidence.sessionId = sessionId;

  const { data: session } = await sb
    .from("feed_staging_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  evidence.sessionBefore = session;
  if (!session) throw new Error("session_not_found");
  if (session.status !== "complete" && session.status !== "validated") {
    throw new Error(`session not ready: ${session.status}`);
  }
  if (!session.cycle_complete) throw new Error("cycle_incomplete");
  if (Number(session.files_processed || 0) < Number(session.total_catalog_files || 0)) {
    throw new Error("partial_files_processed");
  }

  evidence.classification = await classifySession(sessionId);
  evidence.killSwitchesBefore = {
    catalog_publish_blocked: await readStatusFlag(sb, "catalog_publish_blocked"),
    feed_ingest_blocked: await readStatusFlag(sb, "feed_ingest_blocked"),
  };

  evidence.baseline = {
    products: await countExact(),
    displayable: await countExact({ is_displayable: true }),
    active: await countExact({ is_active: true }),
    editorPicks: await countExact({ is_editor_pick: true }),
  };

  // Mark validated before promote.
  await sb
    .from("feed_staging_sessions")
    .update({
      status: "validated",
      updated_at: new Date().toISOString(),
      meta: {
        ...(typeof session.meta === "object" && session.meta ? session.meta : {}),
        validatedAt: new Date().toISOString(),
        classification: evidence.classification,
        promoteMode: "additive",
      },
    })
    .eq("session_id", sessionId);

  // Temporarily clear kill switches for controlled promote window only.
  evidence.killSwitchClear = await setCatalogKillSwitch(
    sb,
    false,
    "temporary_clear_for_controlled_additive_mytheresa_promote"
  );

  // Run promote via tsx so TS imports resolve.
  const promoteScript = `
    import { createClient } from "@supabase/supabase-js";
    import { promoteStagingSession } from "./lib/feed-sync/promote-staging.ts";
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const result = await promoteStagingSession(sb, process.env.PROMOTE_SESSION_ID, { additiveOnly: true, skipSmoke: false });
    console.log(JSON.stringify(result));
  `;
  const tmp = path.join(outDir, `promote-runner-${stamp}.mjs`);
  fs.writeFileSync(tmp, promoteScript);
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", tmp],
    {
      cwd: root,
      env: {
        ...process.env,
        SUPABASE_URL: url,
        SUPABASE_SERVICE_ROLE_KEY: key,
        PROMOTE_SESSION_ID: sessionId,
        FEED_LIVE_INGEST_ENABLED: "0",
        CATALOG_SMOKE_AUTOROLLBACK: process.env.CATALOG_SMOKE_AUTOROLLBACK || "1",
      },
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    }
  );
  if (run.stdout) console.log(run.stdout);
  if (run.stderr) console.error(run.stderr);
  try {
    const lines = String(run.stdout || "")
      .trim()
      .split("\n")
      .filter(Boolean);
    evidence.promoteResult = JSON.parse(lines[lines.length - 1] || "{}");
  } catch {
    evidence.promoteResult = {
      ok: false,
      reason: `promote_runner_failed: ${run.status} ${String(run.stderr || "").slice(0, 500)}`,
    };
  }

  // Always re-arm kill switches.
  evidence.killSwitchRearm = await setCatalogKillSwitch(
    sb,
    true,
    "rearmed_after_controlled_additive_mytheresa_promote"
  );

  evidence.after = {
    products: await countExact(),
    displayable: await countExact({ is_displayable: true }),
    active: await countExact({ is_active: true }),
    editorPicks: await countExact({ is_editor_pick: true }),
  };

  evidence.verification = {
    productsDidNotDrop: evidence.after.products >= evidence.baseline.products,
    displayableDidNotDrop: evidence.after.displayable >= evidence.baseline.displayable,
    activeDidNotDrop: evidence.after.active >= evidence.baseline.active,
    editorPicksIntact: evidence.after.editorPicks === evidence.baseline.editorPicks,
    noDeactivations:
      evidence.after.active >= evidence.baseline.active &&
      evidence.promoteResult?.mode === "additive",
    productDelta: evidence.after.products - evidence.baseline.products,
    displayableDelta: evidence.after.displayable - evidence.baseline.displayable,
  };

  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ evidencePath, ...evidence.verification, promoteResult: evidence.promoteResult }, null, 2));

  const ok =
    evidence.promoteResult?.ok === true &&
    evidence.verification.productsDidNotDrop &&
    evidence.verification.displayableDidNotDrop &&
    evidence.verification.activeDidNotDrop &&
    evidence.verification.editorPicksIntact;
  process.exit(ok ? 0 : 1);
} catch (err) {
  try {
    await setCatalogKillSwitch(sb, true, "rearmed_after_promote_error");
  } catch {
    /* ignore */
  }
  evidence.error = err instanceof Error ? err.message : String(err);
  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.error(evidence.error);
  console.error("wrote", evidencePath);
  process.exit(1);
}
