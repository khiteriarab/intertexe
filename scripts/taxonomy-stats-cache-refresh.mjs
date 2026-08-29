#!/usr/bin/env node
/**
 * Refresh administrative node stats cache (not used in customer menus).
 * Usage: node --env-file=.env.development.local scripts/taxonomy-stats-cache-refresh.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REGION = "us";

if (!url || !key) {
  console.error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function browseTotal(dept, slug) {
  const rpc =
    dept === "shoes" ? "catalog_footwear_taxonomy_browse_page" : "catalog_taxonomy_browse_page";
  const base =
    dept === "shoes"
      ? {
          p_region: REGION,
          p_taxonomy_slug: slug,
          p_color: null,
          p_brand_slug: null,
          p_search: null,
          p_min_price: null,
          p_max_price: null,
          p_sort: "newest",
          p_limit: 1,
          p_offset: 0,
        }
      : {
          p_region: REGION,
          p_taxonomy_slug: slug,
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
          p_limit: 1,
          p_offset: 0,
        };
  const { data, error } = await sb.rpc(rpc, base);
  if (error) throw new Error(`${slug}: ${error.message}`);
  return Number(data?.total) || 0;
}

async function main() {
  const { data: nodes } = await sb.from("catalog_taxonomy_nodes").select("slug, department");
  const now = new Date().toISOString();

  for (const node of nodes ?? []) {
    const { count: offerCount } = await sb
      .from("product_taxonomy_assignments")
      .select("*", { count: "exact", head: true })
      .eq("taxonomy_version", "retail-v1")
      .eq("taxonomy_slug", node.slug)
      .eq("is_primary", true);

    let cardCount = 0;
    try {
      cardCount = await browseTotal(node.department, node.slug);
    } catch {
      cardCount = 0;
    }

    await sb.from("catalog_taxonomy_node_stats_cache").upsert({
      slug: node.slug,
      region: REGION,
      offer_count: offerCount ?? 0,
      card_count: cardCount,
      unresolved_leaf_offers: node.slug.endsWith("/all") ? offerCount ?? 0 : 0,
      computed_at: now,
    });
    console.log(node.slug, "offers=", offerCount, "cards=", cardCount);
  }

  console.log("Cache refreshed at", now);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
