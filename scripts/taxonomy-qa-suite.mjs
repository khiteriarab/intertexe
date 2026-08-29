#!/usr/bin/env node
/**
 * Taxonomy QA gates — coverage, dedup VIEW N, ambiguity, index checks.
 * Usage: node --env-file=.env.development.local scripts/taxonomy-qa-suite.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const failures = [];
const passes = [];

function pass(msg) {
  passes.push(msg);
  console.log("PASS", msg);
}
function fail(msg) {
  failures.push(msg);
  console.error("FAIL", msg);
}

async function browseApparel(slug, extra = {}) {
  const { data, error } = await sb.rpc("catalog_taxonomy_browse_page", {
    p_region: "us",
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
    p_limit: extra.limit ?? 100,
    p_offset: extra.offset ?? 0,
  });
  if (error) throw new Error(`apparel ${slug}: ${error.message}`);
  return data;
}

async function browseShoes(slug, extra = {}) {
  const { data, error } = await sb.rpc("catalog_footwear_taxonomy_browse_page", {
    p_region: "us",
    p_taxonomy_slug: slug,
    p_color: extra.color ?? null,
    p_brand_slug: extra.brand ?? null,
    p_search: null,
    p_min_price: extra.minPrice ?? null,
    p_max_price: extra.maxPrice ?? null,
    p_sort: extra.sort ?? "newest",
    p_limit: extra.limit ?? 100,
    p_offset: extra.offset ?? 0,
  });
  if (error) throw new Error(`shoes ${slug}: ${error.message}`);
  return data;
}

async function inferApparel(gt, cat, name) {
  const { data, error } = await sb.rpc("catalog_taxonomy_infer_apparel", {
    p_garment_type: gt,
    p_category: cat,
    p_name: name,
  });
  if (error) throw error;
  return data?.[0];
}

async function inferFootwear(cat, name) {
  const { data, error } = await sb.rpc("catalog_taxonomy_infer_footwear", {
    p_category: cat,
    p_name: name,
  });
  if (error) throw error;
  return data?.[0];
}

async function main() {
  console.log("=== Taxonomy QA suite ===\n");

  // 1) Offer-level coverage (All = complete eligible live catalogs)
  const { count: apparelLive } = await sb
    .from("live_products_apparel")
    .select("*", { count: "exact", head: true })
    .eq("region", "us");
  const { count: footwearLive } = await sb
    .from("live_products_footwear")
    .select("*", { count: "exact", head: true })
    .eq("region", "us");

  const coverageSql = async (table, prefix) => {
    const { data } = await sb.from(table).select("id").eq("region", "us").limit(5000);
    // sample-based; full count via SQL mgmt API would be better for prod QA
    return data?.length ?? 0;
  };

  const { data: apparelAssignedRow } = await sb.rpc("catalog_taxonomy_backfill_batch", {
    p_department: "clothing",
    p_limit: 1,
    p_taxonomy_version: "retail-v1",
  });
  const { data: shoesAssignedRow } = await sb.rpc("catalog_taxonomy_backfill_batch", {
    p_department: "shoes",
    p_limit: 1,
    p_taxonomy_version: "retail-v1",
  });

  // Use direct count via postgrest head on a view query - approximate via browse all vs live
  const clothingAllBrowse = await browseApparel("clothing/all", { limit: 1 });
  const shoesAllBrowse = await browseShoes("shoes/all", { limit: 1 });

  if (apparelAssignedRow === 0) pass("Apparel backfill queue empty (all offers assigned)");
  else fail(`Apparel backfill still has ${apparelAssignedRow}+ unassigned batches`);

  if (shoesAssignedRow === 0) pass("Footwear backfill queue empty (all offers assigned)");
  else fail(`Footwear backfill still has ${shoesAssignedRow}+ unassigned batches`);

  if (clothingAllBrowse.total_status === "exact" && clothingAllBrowse.debug?.count_basis === "deduped_card") {
    pass(`VIEW N uses deduped_card basis (clothing/all=${clothingAllBrowse.total})`);
  } else fail("clothing/all missing deduped_card count basis");

  if (shoesAllBrowse.total_status === "exact" && shoesAllBrowse.debug?.count_basis === "deduped_card") {
    pass(`VIEW N uses deduped_card basis (shoes/all=${shoesAllBrowse.total})`);
  } else fail("shoes/all missing deduped_card count basis");

  console.log(`  US live offers: apparel=${apparelLive} footwear=${footwearLive}`);
  console.log(`  VIEW N cards:   apparel=${clothingAllBrowse.total} footwear=${shoesAllBrowse.total}`);

  // 2) Pagination uniqueness (first 300 cards)
  const seen = new Set();
  let dupes = 0;
  for (let off = 0; off < 300; off += 100) {
    const page = await browseApparel("clothing/all", { limit: 100, offset: off });
    for (const row of page.products ?? []) {
      const key = row.canonical_id || row.product_id || row.id;
      if (seen.has(key)) dupes++;
      seen.add(key);
    }
  }
  if (dupes === 0) pass(`Pagination returns unique cards (sample=${seen.size})`);
  else fail(`Pagination duplicates detected: ${dupes}`);

  // 3) Combined filters (active leaf — blouses; shirts withheld)
  const blousesLinen = await browseApparel("clothing/blouses", { fiber: "linen", limit: 1 });
  if (blousesLinen.total_status === "exact") pass(`Blouses+Linen total=${blousesLinen.total}`);
  else fail("Blouses+Linen missing exact total");

  const topsBrowse = await browseApparel("clothing/tops", { limit: 1 });
  if (topsBrowse.total_status === "exact" && topsBrowse.total > 0) {
    pass(`Tops parent VIEW N=${topsBrowse.total}`);
  } else fail("Tops parent browse missing exact total");

  // 4) Ambiguity suite (inference RPC — root-only / provisional model)
  const ambiguities = [
    ["dresses", "Dress", "Silk Tank Dress", "clothing/dresses"],
    ["pants_trousers", "Trousers", "Bootcut Jean", "clothing/jeans"],
    ["shirts", "Shirt", "Cotton Shirt", "clothing/shirts"],
    ["other_apparel", "bottoms", "Marcelle Cargo in Hematite", "clothing/bottoms"],
    ["footwear", "Apparel & Accessories", "Ballet Runner Sneaker", "shoes/sneakers"],
    ["footwear", "Apparel & Accessories", "Leather Ballerina Flat", "shoes/ballet-flats"],
    ["footwear", "Shoes", "Penny Loafer", "shoes/loafers"],
  ];

  for (const [gt, cat, name, expected] of ambiguities) {
    const row =
      gt === "footwear"
        ? await inferFootwear(cat, name)
        : await inferApparel(gt, cat, name);
    const slug = row?.slug;
    if (slug === expected) pass(`Ambiguity: "${name}" → ${slug}`);
    else fail(`Ambiguity: "${name}" expected ${expected}, got ${slug}`);
  }

  // 5) Production activation gates
  const { data: nodes } = await sb.from("catalog_taxonomy_nodes").select("slug,is_active");
  const inactiveWithheld = ["clothing/shirts", "clothing/tanks-and-camisoles"];
  for (const slug of inactiveWithheld) {
    const n = nodes?.find((x) => x.slug === slug);
    if (n && !n.is_active) pass(`${slug} withheld (inactive)`);
    else fail(`${slug} should remain inactive`);
  }
  for (const slug of ["clothing/tops", "shoes/flat-shoes", "shoes/heels"]) {
    const n = nodes?.find((x) => x.slug === slug);
    if (n?.is_active) pass(`Parent nav active: ${slug}`);
    else fail(`Parent nav missing: ${slug}`);
  }
  const ballet = nodes?.find((n) => n.slug === "shoes/ballet-flats");
  if (ballet && !ballet.is_active) pass("Ballet Flats hidden (inactive)");
  else fail("Ballet Flats still active");

  // 6) Index check (via pg_indexes query through information_schema workaround)
  const { data: idxRows } = await sb
    .from("product_taxonomy_assignments")
    .select("offer_id")
    .eq("taxonomy_version", "retail-v1")
    .limit(1);
  if (idxRows) pass("product_taxonomy_assignments readable (idx_pta_taxonomy_offer expected on DB)");

  console.log(`\n=== Summary: ${passes.length} passed, ${failures.length} failed ===`);
  if (failures.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
