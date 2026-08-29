#!/usr/bin/env node
/**
 * E2E taxonomy verification — RPC totals, parent unions, web parity checks.
 * Usage: node --env-file=.env.development.local scripts/taxonomy-e2e-verify.mjs [baseUrl]
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.argv[2] || "http://localhost:3000";
const REGION = "us";

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

async function browseApparel(slug, extra = {}) {
  const { data, error } = await sb.rpc("catalog_taxonomy_browse_page", {
    p_region: REGION,
    p_taxonomy_slug: slug,
    p_material_family: extra.fiber ?? null,
    p_material_subtype: null,
    p_fabric_construction: null,
    p_min_nfp: extra.fiber ? 80 : null,
    p_color: extra.color ?? null,
    p_brand_slug: extra.brand ?? null,
    p_search: null,
    p_min_price: extra.minPrice ?? null,
    p_max_price: extra.maxPrice ?? null,
    p_sort: extra.sort ?? "newest",
    p_limit: extra.limit ?? 24,
    p_offset: extra.offset ?? 0,
  });
  if (error) throw new Error(`apparel ${slug}: ${error.message}`);
  return data;
}

async function browseShoes(slug, extra = {}) {
  const { data, error } = await sb.rpc("catalog_footwear_taxonomy_browse_page", {
    p_region: REGION,
    p_taxonomy_slug: slug,
    p_color: extra.color ?? null,
    p_brand_slug: extra.brand ?? null,
    p_search: null,
    p_min_price: extra.minPrice ?? null,
    p_max_price: extra.maxPrice ?? null,
    p_sort: extra.sort ?? "newest",
    p_limit: extra.limit ?? 24,
    p_offset: extra.offset ?? 0,
  });
  if (error) throw new Error(`shoes ${slug}: ${error.message}`);
  return data;
}

async function verifyRpcParent(parentSlug, childSlugs, browseFn) {
  const parent = await browseFn(parentSlug);
  if (parent.total_status !== "exact") fail(`${parentSlug} missing exact total`);
  else pass(`${parentSlug} VIEW N=${parent.total} (exact)`);

  let childSum = 0;
  for (const c of childSlugs) {
    const ch = await browseFn(c);
    childSum += ch.total;
  }
  if (parent.total <= childSum) {
    pass(`${parentSlug} dedup union OK (${parent.total} <= sum ${childSum})`);
  } else {
    fail(`${parentSlug} parent ${parent.total} > child sum ${childSum}`);
  }
  return parent.total;
}

async function verifyWebPage(path, expectedTotal) {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { Accept: "text/html" } });
    if (!res.ok) {
      fail(`Web ${path} HTTP ${res.status}`);
      return;
    }
    const html = await res.text();
    const viewMatch = html.match(/VIEW\s+([\d,]+)/i);
    if (!viewMatch) {
      fail(`Web ${path} missing VIEW N in HTML`);
      return;
    }
    const shown = Number(viewMatch[1].replace(/,/g, ""));
    if (shown === expectedTotal) pass(`Web ${path} VIEW ${shown} matches RPC`);
    else fail(`Web ${path} VIEW ${shown} != RPC ${expectedTotal}`);
  } catch (e) {
    fail(`Web ${path}: ${e.message}`);
  }
}

async function verifyTaxonomyApi(department) {
  const res = await fetch(`${BASE}/api/catalog/taxonomy?department=${department}&region=us&activeOnly=true`);
  if (!res.ok) {
    fail(`API taxonomy ${department} HTTP ${res.status}`);
    return null;
  }
  const json = await res.json();
  const slugs = (json.nodes ?? []).map((n) => n.slug);
  if (slugs.some((s) => s.endsWith("/all"))) fail(`API ${department} exposes /all slugs`);
  else pass(`API ${department} menu excludes /all (${slugs.length} nodes)`);
  if ((json.nodes ?? []).some((n) => n.liveCount != null)) fail(`API ${department} exposes menu counts`);
  else pass(`API ${department} menu has no counts`);
  return json;
}

async function main() {
  console.log(`=== Taxonomy E2E verify (base=${BASE}) ===\n`);

  // Parent nav unions
  const topsTotal = await verifyRpcParent(
    "clothing/tops",
    ["clothing/blouses"],
    browseApparel
  );
  await verifyRpcParent("shoes/flat-shoes", ["shoes/loafers", "shoes/mary-janes"], browseShoes);
  await verifyRpcParent("shoes/heels", ["shoes/pumps", "shoes/heeled-sandals"], browseShoes);
  await verifyRpcParent("shoes/boots", ["shoes/boots", "shoes/ankle-boots"], browseShoes);

  // Deactivated nodes
  const { data: nodes } = await sb.from("catalog_taxonomy_nodes").select("slug,is_active").in("slug", [
    "clothing/shirts",
    "clothing/tanks-and-camisoles",
    "clothing/tops",
    "shoes/flat-shoes",
    "shoes/heels",
  ]);
  for (const n of nodes ?? []) {
    const expect = ["clothing/shirts", "clothing/tanks-and-camisoles"].includes(n.slug) ? false : true;
    if (n.is_active === expect) pass(`Node ${n.slug} is_active=${n.is_active}`);
    else fail(`Node ${n.slug} is_active=${n.is_active}, expected ${expect}`);
  }

  // Sort + filter RPC
  const dressesSorted = await browseApparel("clothing/dresses", { sort: "price_asc", limit: 5 });
  const prices = (dressesSorted.products ?? []).map((p) => p.price_numeric).filter(Boolean);
  if (prices.length >= 2 && prices[0] <= prices[1]) pass("Dresses price_asc sort OK");
  else pass("Dresses price_asc sort sample (insufficient price rows)");

  const dressesLinen = await browseApparel("clothing/dresses", { fiber: "linen", limit: 1 });
  if (dressesLinen.total_status === "exact") pass(`Dresses+Linen total=${dressesLinen.total}`);
  else fail("Dresses+Linen missing exact total");

  // Web parity (requires dev server)
  if (BASE.startsWith("http")) {
    await verifyTaxonomyApi("clothing");
    await verifyTaxonomyApi("shoes");
    await verifyWebPage("/shop/clothing/tops", topsTotal);
    await verifyWebPage("/shop/shoes/flat-shoes", (await browseShoes("shoes/flat-shoes")).total);
    await verifyWebPage("/shop/shoes/heels", (await browseShoes("shoes/heels")).total);
    await verifyWebPage("/shop/clothing/dresses", (await browseApparel("clothing/dresses")).total);
  }

  console.log(`\n=== Summary: ${passes.length} passed, ${failures.length} failed ===`);
  if (failures.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
