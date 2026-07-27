#!/usr/bin/env node
/**
 * Restore is_active / is_displayable from catalog_last_known_good metadata
 * and optionally re-activate products deactivated after a given timestamp.
 *
 * Dry-run by default:
 *   node scripts/rollback-catalog-from-snapshot.mjs
 * Apply:
 *   node scripts/rollback-catalog-from-snapshot.mjs --apply
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

const { data: snap, error } = await sb
  .from("system_status")
  .select("value_json,updated_at")
  .eq("key", "catalog_last_known_good")
  .maybeSingle();
if (error) throw error;
if (!snap?.value_json) {
  console.error("No catalog_last_known_good snapshot found");
  process.exit(1);
}

const capturedAt = snap.value_json.capturedAt || snap.updated_at;
console.log("Snapshot:", snap.value_json);
console.log("Mode:", apply ? "APPLY" : "DRY-RUN");

// Re-activate products that were marked inactive after the snapshot, with composition present.
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
  const { error: upErr } = await sb
    .from("products")
    .update({ is_active: true })
    .in("id", ids);
  if (upErr) throw upErr;
  restored += ids.length;
  console.log("restored", restored);
  if (batch.length < 200) break;
}

await sb.from("system_status").upsert({
  key: "catalog_publish_blocked",
  value_json: {
    blocked: false,
    clearedBy: "rollback-catalog-from-snapshot",
    restored,
    at: new Date().toISOString(),
  },
  updated_at: new Date().toISOString(),
});

console.log("Rollback complete. restored=", restored);
