#!/usr/bin/env node
/**
 * Restore catalog from row-level snapshot (preferred) or legacy timestamp heuristic.
 *
 * Dry-run:
 *   node scripts/rollback-catalog-from-snapshot.mjs
 * Apply latest row-level snapshot:
 *   node scripts/rollback-catalog-from-snapshot.mjs --apply
 * Apply specific snapshot:
 *   node scripts/rollback-catalog-from-snapshot.mjs --apply --snapshot=<uuid>
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const apply = process.argv.includes("--apply");
const snapshotArg = process.argv.find((a) => a.startsWith("--snapshot="));
const snapshotIdArg = snapshotArg ? snapshotArg.split("=")[1] : null;

function loadEnv() {
  for (const f of [
    path.join(root, "../.env"),
    path.join(root, ".env.vercel.local"),
    path.join(root, ".env.local"),
  ]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnv();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(
  /^"|"$/g,
  ""
);
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/^"|"$/g, "");
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

let snapshotId = snapshotIdArg;
if (!snapshotId) {
  const { data: latest } = await sb
    .from("catalog_product_snapshots")
    .select("snapshot_id, captured_at, displayable_count, source")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest?.snapshot_id) {
    snapshotId = latest.snapshot_id;
    console.log("Using latest row-level snapshot:", latest);
  }
}

if (snapshotId) {
  const MAX = Number(process.env.CATALOG_ROLLBACK_MAX || 20000);
  const PAGE = 500;
  let restored = 0;
  let offset = 0;
  console.log("Mode:", apply ? "APPLY" : "DRY-RUN", "snapshot=", snapshotId);

  while (restored < MAX) {
    const { data: page, error } = await sb
      .from("catalog_product_snapshot_rows")
      .select("product_id, id, is_active")
      .eq("snapshot_id", snapshotId)
      .eq("is_active", true)
      .order("product_id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!page?.length) break;

    if (apply) {
      const ids = page.map((r) => r.id).filter(Boolean);
      const productIds = page.map((r) => r.product_id).filter(Boolean);
      if (ids.length) {
        const { error: upErr } = await sb.from("products").update({ is_active: true }).in("id", ids);
        if (upErr) throw upErr;
      } else if (productIds.length) {
        const { error: upErr } = await sb
          .from("products")
          .update({ is_active: true })
          .in("product_id", productIds);
        if (upErr) throw upErr;
      }
    }
    restored += page.length;
    offset += page.length;
    console.log(apply ? "restored" : "would_restore", restored);
    if (page.length < PAGE) break;
  }

  if (apply) {
    await sb.from("system_status").upsert({
      key: "catalog_publish_blocked",
      value_json: {
        blocked: false,
        clearedBy: "rollback-catalog-from-snapshot",
        snapshotId,
        restored,
        at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });
  }
  console.log("Row-level rollback complete. restored=", restored, "apply=", apply);
  process.exit(0);
}

// Legacy fallback: timestamp heuristic from catalog_last_known_good
const { data: snap, error } = await sb
  .from("system_status")
  .select("value_json,updated_at")
  .eq("key", "catalog_last_known_good")
  .maybeSingle();
if (error) throw error;
if (!snap?.value_json) {
  console.error("No catalog_product_snapshots row and no catalog_last_known_good");
  process.exit(1);
}

const capturedAt = snap.value_json.capturedAt || snap.updated_at;
console.log("Legacy snapshot metadata:", snap.value_json);
console.log("Mode:", apply ? "APPLY" : "DRY-RUN");

const { count: candidates } = await sb
  .from("products")
  .select("id", { count: "exact", head: true })
  .eq("is_active", false)
  .not("composition", "is", null)
  .neq("composition", "")
  .gte("updated_at", capturedAt);

console.log("Candidates deactivated after snapshot with composition:", candidates);

if (!apply) {
  console.log("Re-run with --apply to restore is_active=true for those candidates (capped).");
  process.exit(0);
}

const MAX = Number(process.env.CATALOG_ROLLBACK_MAX || 5000);
let restored = 0;
while (restored < MAX) {
  const { data: batch, error: selErr } = await sb
    .from("products")
    .select("id")
    .eq("is_active", false)
    .not("composition", "is", null)
    .neq("composition", "")
    .gte("updated_at", capturedAt)
    .limit(Math.min(200, MAX - restored));
  if (selErr) throw selErr;
  if (!batch?.length) break;
  const ids = batch.map((r) => r.id);
  const { error: upErr } = await sb.from("products").update({ is_active: true }).in("id", ids);
  if (upErr) throw upErr;
  restored += ids.length;
  console.log("restored", restored);
  if (batch.length < 200) break;
}

await sb.from("system_status").upsert({
  key: "catalog_publish_blocked",
  value_json: {
    blocked: false,
    clearedBy: "rollback-catalog-from-snapshot-legacy",
    restored,
    at: new Date().toISOString(),
  },
  updated_at: new Date().toISOString(),
});

console.log("Legacy rollback complete. restored=", restored);
