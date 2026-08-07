#!/usr/bin/env node
/**
 * Safe Footwear → shoes garment_type backfill.
 *
 *   node --import tsx scripts/backfill-footwear-garment-type.mjs
 *
 * Uses root ../.env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Updates products.garment_type only (Footwear → shoes), 400 ids/batch, max 100 batches.
 * Never touches external_captures.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(__dirname, "..");
const iosRoot = resolve(websiteRoot, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const fileEnv = {
  ...loadEnvFile(resolve(iosRoot, ".env")),
  ...loadEnvFile(resolve(websiteRoot, ".env.vercel.local")),
  ...loadEnvFile(resolve(websiteRoot, ".env")),
};

const url = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (expected in ../.env)");
  process.exit(1);
}

const BATCH = 400;
const MAX_BATCHES = 100;
const sb = createClient(url, key, { auth: { persistSession: false } });

async function selectFootwearCategoryBatch() {
  const { data, error } = await sb
    .from("products")
    .select("id")
    .ilike("category", "Footwear")
    .neq("garment_type", "shoes")
    .limit(BATCH);
  if (error) throw error;
  return (data || []).map((r) => r.id).filter(Boolean);
}

async function updateIds(ids) {
  const { data, error } = await sb
    .from("products")
    .update({ garment_type: "shoes" })
    .in("id", ids)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

async function remainingCount() {
  const { count, error } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .ilike("category", "Footwear")
    .neq("garment_type", "shoes");
  if (error) return null;
  return count;
}

async function main() {
  console.log("[backfill-footwear] start", {
    remaining: await remainingCount(),
    batch: BATCH,
    maxBatches: MAX_BATCHES,
  });

  let totalUpdated = 0;
  for (let i = 1; i <= MAX_BATCHES; i++) {
    const ids = await selectFootwearCategoryBatch();
    if (!ids.length) {
      console.log(`[backfill-footwear] batch ${i}: 0 ids — done`);
      break;
    }
    const updated = await updateIds(ids);
    totalUpdated += updated;
    console.log(
      `[backfill-footwear] batch ${i}: selected=${ids.length} updated=${updated} total=${totalUpdated} remaining≈${await remainingCount()}`
    );
    if (updated === 0) break;
  }

  console.log("[backfill-footwear] complete", {
    totalUpdated,
    remaining: await remainingCount(),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
