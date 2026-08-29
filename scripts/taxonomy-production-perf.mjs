#!/usr/bin/env node
/**
 * Production query-performance probe for taxonomy browse RPCs + web routes.
 * Run against consumer HQ before enabling CATALOG_TAXONOMY_NAV.
 *
 * Usage: node --env-file=.env.development.local scripts/taxonomy-production-perf.mjs [baseUrl]
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.argv[2] || "https://www.intertexe.com";
const REGION = "us";
const LATENCY_BUDGET_MS = 2500;

const sb = createClient(url, key, { auth: { persistSession: false } });
const failures = [];
const passes = [];

function pass(m) {
  passes.push(m);
  console.log("PASS", m);
}
function fail(m) {
  failures.push(m);
  console.error("FAIL", m);
}

async function timedRpc(label, fn) {
  const t0 = performance.now();
  const data = await fn();
  const ms = Math.round(performance.now() - t0);
  if (ms <= LATENCY_BUDGET_MS) pass(`${label} ${ms}ms`);
  else fail(`${label} ${ms}ms > ${LATENCY_BUDGET_MS}ms budget`);
  return { data, ms };
}

async function timedFetch(label, path) {
  const t0 = performance.now();
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "text/html" } });
  const ms = Math.round(performance.now() - t0);
  if (res.status === 404 && path.includes("/shirts")) {
    if (ms <= LATENCY_BUDGET_MS) pass(`${label} HTTP 404 ${ms}ms`);
    else fail(`${label} HTTP 404 ${ms}ms > budget`);
  } else if (res.ok) {
    if (ms <= LATENCY_BUDGET_MS) pass(`${label} HTTP ${res.status} ${ms}ms`);
    else fail(`${label} HTTP ${res.status} ${ms}ms > budget`);
  } else {
    fail(`${label} HTTP ${res.status} ${ms}ms`);
  }
  return { res, ms };
}

const PROBES = [
  { slug: "clothing/tops", rpc: "catalog_taxonomy_browse_page" },
  { slug: "clothing/dresses", rpc: "catalog_taxonomy_browse_page" },
  { slug: "shoes/flat-shoes", rpc: "catalog_footwear_taxonomy_browse_page" },
  { slug: "shoes/heels", rpc: "catalog_footwear_taxonomy_browse_page" },
  { slug: "clothing/all", rpc: "catalog_taxonomy_browse_page" },
];

async function main() {
  console.log(`=== Taxonomy production perf (${BASE}) ===\n`);

  for (const p of PROBES) {
    await timedRpc(p.slug, async () => {
      const params =
        p.rpc === "catalog_footwear_taxonomy_browse_page"
          ? {
              p_region: REGION,
              p_taxonomy_slug: p.slug,
              p_color: null,
              p_brand_slug: null,
              p_search: null,
              p_min_price: null,
              p_max_price: null,
              p_sort: "newest",
              p_limit: 24,
              p_offset: 0,
            }
          : {
              p_region: REGION,
              p_taxonomy_slug: p.slug,
              p_material_family: null,
              p_material_subtype: null,
              p_fabric_construction: null,
              p_min_nfp: null,
              p_color: null,
              p_brand_slug: null,
              p_search: null,
              p_min_price: null,
              p_max_price: null,
              p_sort: "newest",
              p_limit: 24,
              p_offset: 0,
            };
      const { data, error } = await sb.rpc(p.rpc, params);
      if (error) throw error;
      return data;
    });
  }

  await timedFetch("API taxonomy clothing", "/api/catalog/taxonomy?department=clothing&activeOnly=true");
  await timedFetch("Route tops", "/shop/clothing/tops");
  await timedFetch("Route deactivated shirts", "/shop/clothing/shirts");

  const filtered = await timedRpc("tops+silk filter", async () => {
    const { data, error } = await sb.rpc("catalog_taxonomy_browse_page", {
      p_region: REGION,
      p_taxonomy_slug: "clothing/tops",
      p_material_family: "silk",
      p_material_subtype: null,
      p_fabric_construction: null,
      p_min_nfp: 80,
      p_color: null,
      p_brand_slug: null,
      p_search: null,
      p_min_price: null,
      p_max_price: null,
      p_sort: "newest",
      p_limit: 24,
      p_offset: 0,
    });
    if (error) throw error;
    return data;
  });

  if (filtered.data?.total_status === "exact") pass("Filter total_status=exact");
  else fail("Filter missing exact total");

  console.log(`\n=== Summary: ${passes.length} passed, ${failures.length} failed ===`);
  if (failures.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
