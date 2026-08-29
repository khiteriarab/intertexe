#!/usr/bin/env node
/**
 * Run taxonomy backfill batches + activation QA (consumer HQ Supabase only).
 * Usage: node --env-file=.env.development.local scripts/taxonomy-backfill-run.mjs
 */
import { createClient } from "@supabase/supabase-js";

const CONSUMER_REF = "burrylupizvggupsryuj";
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url?.includes(CONSUMER_REF) || !key) {
  console.error("Consumer SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function runBatch(dept, limit = 10000) {
  const { data, error } = await sb.rpc("catalog_taxonomy_backfill_batch", {
    p_department: dept,
    p_limit: limit,
    p_taxonomy_version: "retail-v1",
  });
  if (error) throw new Error(`${dept}: ${error.message}`);
  return data ?? 0;
}

async function counts(dept, region = "us") {
  const { data, error } = await sb.rpc("catalog_taxonomy_node_counts", {
    p_department: dept,
    p_region: region,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function activateEligible() {
  const { data: nodes } = await sb.from("catalog_taxonomy_nodes").select("*");
  const usClothing = await counts("clothing", "us");
  const usShoes = await counts("shoes", "us");
  const countMap = Object.fromEntries(
    [...usClothing, ...usShoes].map((r) => [r.slug, Number(r.live_count) || 0])
  );

  const activated = [];
  const withheld = [];
  for (const n of nodes ?? []) {
    const live = countMap[n.slug] ?? 0;
    const ok = n.slug.endsWith("/all") || live >= (n.min_count_threshold || 0);
    if (ok && !n.is_active) {
      await sb.from("catalog_taxonomy_nodes").update({ is_active: true }).eq("slug", n.slug);
      activated.push({ slug: n.slug, live });
    } else if (!ok) {
      withheld.push({ slug: n.slug, live, threshold: n.min_count_threshold });
    }
  }
  return { activated, withheld };
}

async function main() {
  console.log("Backfilling clothing…");
  for (let i = 0; i < 30; i++) {
    const n = await runBatch("clothing", 15000);
    console.log(`  batch ${i + 1}: +${n}`);
    if (n === 0) break;
  }

  console.log("Backfilling shoes…");
  for (let i = 0; i < 10; i++) {
    const n = await runBatch("shoes", 8000);
    console.log(`  batch ${i + 1}: +${n}`);
    if (n === 0) break;
  }

  console.log("\nCounts skipped (use scripts/taxonomy-stats-cache-refresh.mjs for admin cache).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
