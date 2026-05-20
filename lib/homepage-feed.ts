import { getServerSupabase } from "./supabase-server";
import type { Product } from "./supabase-server";
import { logSupabaseTiming } from "./supabase-timing";

/** Precomputed rails in Supabase (see docs/MERCHANDISING_AND_HOMEPAGE_FEEDS.md). */
export const HOMEPAGE_FEED_RAIL_KEYS = {
  newIn: "top:new_in",
  silk: "fabrics:silk",
  linen: "fabrics:linen",
  cashmere: "fabrics:cashmere",
  vacation: "collections:vacation",
  sale: "sale:all",
} as const;

export type HomepageFeedRailKey =
  (typeof HOMEPAGE_FEED_RAIL_KEYS)[keyof typeof HOMEPAGE_FEED_RAIL_KEYS];

const FEED_SELECT_COLS =
  "rank, source_id, product_id, brand_slug, brand_name, name, url, image_url, price, natural_fiber_percent, category, is_sale";

export function isHomepageFeedCacheEnabled(): boolean {
  return process.env.HOMEPAGE_USE_FEED_CACHE === "1";
}

function mapFeedRowToProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.source_id ?? ""),
    productId: String(row.product_id ?? ""),
    brandSlug: String(row.brand_slug ?? ""),
    brandName: String(row.brand_name ?? ""),
    name: String(row.name ?? ""),
    url: String(row.url ?? ""),
    imageUrl: String(row.image_url ?? ""),
    price: String(row.price ?? ""),
    composition: "",
    naturalFiberPercent: Number(row.natural_fiber_percent ?? 0),
    category: row.category != null ? String(row.category) : "",
    isSale: row.is_sale === true,
  };
}

/** Read one precomputed homepage rail from homepage_feed_items. */
export async function fetchHomepageFeedRail(
  railKey: HomepageFeedRailKey
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) {
    console.warn(`[homepage-feed-cache] rail=${railKey} no Supabase client`);
    return [];
  }

  const t0 = Date.now();
  const { data, error } = await supabase
    .from("homepage_feed_items")
    .select(FEED_SELECT_COLS)
    .eq("rail_key", railKey)
    .order("rank", { ascending: true });

  const rows = (data || []) as Record<string, unknown>[];
  logSupabaseTiming(`homepage feed rail ${railKey}`, t0, error ? `error:${error.message}` : `rows:${rows.length}`);
  console.log(`[homepage-feed-cache] rail=${railKey} rows=${rows.length}`);

  if (error) {
    console.warn(`[homepage-feed-cache] rail=${railKey} error:`, error.message);
    return [];
  }

  return rows.map(mapFeedRowToProduct);
}

export type HomepageFeedMetaRow = {
  rail_key: string;
  row_count: number | null;
  source_rows: number | null;
  refresh_ms: number | null;
  refreshed_at: string | null;
  last_error: string | null;
};

export async function fetchHomepageFeedMeta(): Promise<HomepageFeedMetaRow[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("homepage_feed_meta")
    .select("rail_key, row_count, source_rows, refresh_ms, refreshed_at, last_error")
    .order("rail_key");

  if (error) {
    console.warn("[homepage-feed-cache] meta error:", error.message);
    return [];
  }

  return (data || []) as HomepageFeedMetaRow[];
}

/** Head counts per rail_key only — for /api/homepage-debug (no product row payload). */
export async function fetchHomepageFeedItemCounts(): Promise<{
  counts: Partial<Record<HomepageFeedRailKey, number>>;
  errors: Partial<Record<HomepageFeedRailKey, string>>;
}> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { counts: {}, errors: { "top:new_in": "no_supabase_client" } };
  }

  const railKeys = Object.values(HOMEPAGE_FEED_RAIL_KEYS);
  const results = await Promise.all(
    railKeys.map(async (railKey) => {
      const { count, error } = await supabase
        .from("homepage_feed_items")
        .select("rail_key", { count: "exact", head: true })
        .eq("rail_key", railKey);
      return { railKey, count: count ?? 0, error: error?.message };
    })
  );

  const counts: Partial<Record<HomepageFeedRailKey, number>> = {};
  const errors: Partial<Record<HomepageFeedRailKey, string>> = {};
  for (const r of results) {
    counts[r.railKey] = r.count;
    if (r.error) errors[r.railKey] = r.error;
  }
  return { counts, errors };
}
