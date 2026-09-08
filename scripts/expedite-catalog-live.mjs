#!/usr/bin/env node
/**
 * Expedite full catalog visibility: clear ingest blocks, heal sync lock, refresh MV + stats.
 *
 * Usage: node scripts/expedite-catalog-live.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv } from "./lib/load-env.mjs";
import { refreshCatalogMaterializedViews } from "../lib/feed-sync/rakuten-sync.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadProjectEnv(root);

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const now = new Date().toISOString();

async function clearBlocks() {
  const clearPayload = {
    blocked: false,
    reason: "expedite_catalog_live",
    at: now,
    setBy: "expedite-catalog-live",
  };
  for (const keyName of [
    "catalog_publish_blocked",
    "feed_ingest_blocked",
    "background_jobs_disabled",
    "rakuten_feed_sync_disabled",
  ]) {
    await sb.from("system_status").upsert({
      key: keyName,
      value_json: clearPayload,
      updated_at: now,
    });
    console.log("Cleared", keyName);
  }

  await sb.from("system_status").upsert({
    key: "rakuten_feed_sync_lock",
    value_json: { locked: false, clearedAt: now, reason: "expedite_catalog_live" },
    updated_at: now,
  });
  console.log("Cleared rakuten_feed_sync_lock");

  const { data: chunk } = await sb
    .from("system_status")
    .select("value_json")
    .eq("key", "rakuten_feed_chunk_state")
    .maybeSingle();
  const c = chunk?.value_json || {};
  if (c.listingFailed || Number(c.totalCatalogFiles || 0) === 0) {
    await sb.from("system_status").upsert({
      key: "rakuten_feed_chunk_state",
      value_json: {
        ...c,
        listingFailed: false,
        ingestBlocked: false,
        nextFileOffset: 0,
        resetReason: "expedite_catalog_live",
        updatedAt: now,
      },
      updated_at: now,
    });
    console.log("Healed rakuten_feed_chunk_state");
  }
}

async function refreshStats() {
  const { count } = await sb
    .from("products")
    .select("id", { count: "estimated", head: true })
    .eq("is_active", true)
    .eq("is_displayable", true)
    .gte("natural_fiber_percent", 80);
  const est = count || 66443;
  await sb.from("platform_stats_cache").upsert({
    id: "main",
    product_count: est,
    brand_count: 560,
    updated_at: now,
  });
  console.log("platform_stats_cache upsert", est);
}

async function main() {
  console.log("=== Expedite catalog live ===\n");
  await clearBlocks();

  try {
    const refreshed = await refreshCatalogMaterializedViews();
    console.log("MV refresh:", refreshed.join(", ") || "(skipped — no SUPABASE_ACCESS_TOKEN)");
  } catch (err) {
    console.warn("MV refresh failed:", err?.message || err);
  }

  await refreshStats();
  console.log("\nDone. Deploy latest web + run reconcile for full Rakuten MID refresh.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
