#!/usr/bin/env node
/**
 * Diagnose taxonomy coverage gaps + dedup parity (consumer HQ, read-only).
 * Usage: node --env-file=.env.development.local scripts/taxonomy-gap-audit.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function sql(query) {
  const { data, error } = await sb.rpc("exec_sql_readonly", { query });
  if (error) throw new Error(error.message);
  return data;
}

// Use raw SQL via postgrest if exec_sql doesn't exist - fall back to incremental queries
async function main() {
  const region = "us";

  const { count: apparelLive } = await sb
    .from("live_products_apparel")
    .select("*", { count: "exact", head: true })
    .eq("region", region);

  const { count: footwearLive } = await sb
    .from("live_products_footwear")
    .select("*", { count: "exact", head: true })
    .eq("region", region);

  const { data: clothingCounts } = await sb.rpc("catalog_taxonomy_node_counts", {
    p_department: "clothing",
    p_region: region,
  });
  const { data: shoesCounts } = await sb.rpc("catalog_taxonomy_node_counts", {
    p_department: "shoes",
    p_region: region,
  });

  const clothingAll = Number(clothingCounts?.find((r) => r.slug === "clothing/all")?.live_count ?? 0);
  const shoesAll = Number(shoesCounts?.find((r) => r.slug === "shoes/all")?.live_count ?? 0);

  console.log("=== Coverage gap ===");
  console.log({
    apparelLive,
    clothingAll,
    apparelGap: apparelLive - clothingAll,
    footwearLive,
    shoesAll,
    footwearGap: footwearLive - shoesAll,
  });

  // Paginate US apparel IDs and check assignment coverage
  const pageSize = 1000;
  let offset = 0;
  let unassignedApparel = 0;
  let wrongDeptApparel = 0;
  const sampleUnassigned = [];

  while (offset < (apparelLive ?? 0)) {
    const { data: rows } = await sb
      .from("live_products_apparel")
      .select("id, garment_type, category, name")
      .eq("region", region)
      .range(offset, offset + pageSize - 1);
    if (!rows?.length) break;

    const ids = rows.map((r) => r.id);
    const { data: assignments } = await sb
      .from("product_taxonomy_assignments")
      .select("offer_id, taxonomy_slug")
      .eq("taxonomy_version", "retail-v1")
      .in("offer_id", ids);

    const byOffer = new Map();
    for (const a of assignments ?? []) {
      if (!byOffer.has(a.offer_id)) byOffer.set(a.offer_id, []);
      byOffer.get(a.offer_id).push(a.taxonomy_slug);
    }

    for (const row of rows) {
      const slugs = byOffer.get(row.id) ?? [];
      const clothingSlugs = slugs.filter((s) => s.startsWith("clothing/") && s !== "clothing/all");
      if (clothingSlugs.length === 0) {
        unassignedApparel++;
        if (sampleUnassigned.length < 15) {
          sampleUnassigned.push({
            garment_type: row.garment_type,
            category: row.category,
            name: (row.name ?? "").slice(0, 60),
            slugs: slugs.join(",") || "(none)",
          });
        }
      }
      if (slugs.some((s) => s.startsWith("shoes/"))) wrongDeptApparel++;
    }
    offset += pageSize;
    if (offset % 10000 === 0) process.stderr.write(`  apparel scan ${offset}…\n`);
  }

  console.log("\n=== US apparel assignment audit ===");
  console.log({ unassignedApparel, wrongDeptApparel });
  console.table(sampleUnassigned);

  // Footwear gap sample (first 2000 only for speed)
  const { data: shoeRows } = await sb
    .from("live_products_footwear")
    .select("id, category, name")
    .eq("region", region)
    .limit(2000);
  const shoeIds = shoeRows?.map((r) => r.id) ?? [];
  const { data: shoeAssign } = await sb
    .from("product_taxonomy_assignments")
    .select("offer_id, taxonomy_slug")
    .eq("taxonomy_version", "retail-v1")
    .in("offer_id", shoeIds);

  const shoeByOffer = new Map();
  for (const a of shoeAssign ?? []) {
    if (!shoeByOffer.has(a.offer_id)) shoeByOffer.set(a.offer_id, []);
    shoeByOffer.get(a.offer_id).push(a.taxonomy_slug);
  }
  let unassignedShoesSample = 0;
  const sampleShoes = [];
  for (const row of shoeRows ?? []) {
    const slugs = (shoeByOffer.get(row.id) ?? []).filter(
      (s) => s.startsWith("shoes/") && s !== "shoes/all"
    );
    if (slugs.length === 0) {
      unassignedShoesSample++;
      if (sampleShoes.length < 10) {
        sampleShoes.push({ category: row.category, name: (row.name ?? "").slice(0, 60) });
      }
    }
  }
  console.log("\n=== Footwear sample (first 2000) ===");
  console.log({ unassignedShoesSample, sampleShoes });

  // Browse vs node count
  const { data: browse } = await sb.rpc("catalog_taxonomy_browse_page", {
    p_region: region,
    p_taxonomy_slug: "clothing/all",
    p_limit: 1,
    p_offset: 0,
    p_sort: "newest",
  });
  console.log("\n=== Browse parity ===");
  console.log({
    browseTotal: browse?.total,
    nodeCount: clothingAll,
    match: browse?.total === clothingAll,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
