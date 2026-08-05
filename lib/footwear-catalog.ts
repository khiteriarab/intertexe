/**
 * Fast natural footwear catalog — uses footwear_catalog_page / live_products_footwear.
 * Do not route Shoes through materials/leather (apparel fiber browse — 30s+ cold path).
 */
import { getServerSupabase, mapProductRow, type Product } from "./supabase-server";
import { canonicalProductId } from "./canonical-product-id";

const FOOTWEAR_SELECT =
  "id, product_id, brand_slug, brand_name, name, url, image_url, price, original_price, composition, natural_fiber_percent, category, color, matching_set_id, is_sale, region, collection_slugs, stock_status, canonical_id, is_editor_pick, editor_picked_at";

function hasImageAndPrice(p: Product): boolean {
  return Boolean(String(p.imageUrl || "").trim() && String(p.price || "").trim());
}

function dedupeProducts(rows: Product[], limit: number): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const product of rows) {
    if (!hasImageAndPrice(product)) continue;
    const key = canonicalProductId(product) || product.productId || product.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(product);
    if (out.length >= limit) break;
  }
  return out;
}

function leadEditorPicks(products: Product[]): Product[] {
  const picks = products.filter((p) => p.isEditorPick);
  if (!picks.length) return products;
  const rest = products.filter((p) => !p.isEditorPick);
  return [...picks, ...rest];
}

/**
 * Fastest shoes page path: RPC → materialized view → stop.
 * Never falls back to full `products` ILIKE scan (that is the 30s+ path).
 */
export async function fetchFootwearCatalogPage(opts?: {
  region?: string;
  limit?: number;
  offset?: number;
}): Promise<{ products: Product[]; hasMore: boolean }> {
  const supabase = getServerSupabase();
  const region = (opts?.region || "us").toLowerCase();
  const limit = Math.min(Math.max(opts?.limit ?? 24, 1), 48);
  const offset = Math.max(opts?.offset ?? 0, 0);
  if (!supabase) return { products: [], hasMore: false };

  const mapped: Product[] = [];

  const ingest = (rows: unknown) => {
    const list = Array.isArray(rows)
      ? rows
      : rows && typeof rows === "object" && Array.isArray((rows as { products?: unknown }).products)
        ? ((rows as { products: unknown[] }).products as unknown[])
        : [];
    for (const row of list) {
      mapped.push(mapProductRow(row as Record<string, unknown>));
    }
  };

  try {
    const { data: rpcRows, error } = await supabase.rpc("footwear_catalog_page", {
      p_region: region,
      p_limit: limit + 8,
      p_offset: offset,
    });
    if (!error) ingest(rpcRows);
  } catch {
    // fall through to MV
  }

  if (mapped.length < 4) {
    try {
      let q = supabase
        .from("live_products_footwear")
        .select(FOOTWEAR_SELECT)
        .eq("region", region)
        .not("image_url", "is", null)
        .not("price", "is", null)
        .order("natural_fiber_percent", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit + 7);
      // is_editor_pick may be missing on older MV definitions — ignore select errors via retry without it
      let { data, error } = await q;
      if (error) {
        const retry = await supabase
          .from("live_products_footwear")
          .select(
            "id, product_id, brand_slug, brand_name, name, url, image_url, price, original_price, composition, natural_fiber_percent, category, color, matching_set_id, is_sale, region, collection_slugs, stock_status, canonical_id"
          )
          .eq("region", region)
          .not("image_url", "is", null)
          .not("price", "is", null)
          .order("natural_fiber_percent", { ascending: false })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit + 7);
        data = retry.data;
      }
      if (data?.length) ingest(data);
    } catch {
      // empty is better than a 30s products-table scan
    }
  }

  const products = leadEditorPicks(dedupeProducts(mapped, limit));
  return {
    products,
    hasMore: mapped.length > limit || products.length >= limit,
  };
}

export async function fetchFootwearCatalogCount(region = "us"): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;
  try {
    const { data } = await supabase.rpc("footwear_catalog_count", {
      p_region: region.toLowerCase(),
    });
    const n = typeof data === "number" ? data : Number(data);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    // ignore
  }
  try {
    const { count } = await supabase
      .from("live_products_footwear")
      .select("id", { count: "exact", head: true })
      .eq("region", region.toLowerCase());
    return count ?? 0;
  } catch {
    return 0;
  }
}
