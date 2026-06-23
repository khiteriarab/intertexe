/**
 * Shared marketing + shop catalog totals — prefers weekly platform_stats_cache.
 * Count = all verified live_products_apparel rows (300k+), not catalog_list_count deduped cards (~84k).
 */
import { unstable_cache } from "next/cache";
import { US_CATALOG_KNOWN_TOTAL_FALLBACK } from "./catalog-constants";
import { getServerSupabase } from "./supabase-service-client";

export type CachedCatalogStats = {
  /** Full verified catalog — homepage hero, shop header, SEO. */
  catalogProductCount: number;
  brandCount: number;
  updatedAt: string | null;
  source: "cache" | "fallback";
};

const CACHE_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;
/** Counts below this are treated as stale (e.g. deduped shop-card totals written to cache). */
const MIN_TRUSTED_PRODUCT_COUNT = 150_000;

async function readPlatformStatsCache(): Promise<CachedCatalogStats | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("platform_stats_cache")
      .select("product_count, brand_count, updated_at")
      .eq("id", "main")
      .maybeSingle();
    if (error || !data) return null;

    const productCount = Number(data.product_count) || 0;
    const brandCount = Number(data.brand_count) || 0;
    const updatedAt = data.updated_at ? String(data.updated_at) : null;
    if (productCount <= 0 || productCount < MIN_TRUSTED_PRODUCT_COUNT) return null;

    if (updatedAt) {
      const age = Date.now() - new Date(updatedAt).getTime();
      if (age > CACHE_MAX_AGE_MS) return null;
    }

    return {
      catalogProductCount: productCount,
      brandCount,
      updatedAt,
      source: "cache",
    };
  } catch {
    return null;
  }
}

function fallbackStats(): CachedCatalogStats {
  return {
    catalogProductCount: US_CATALOG_KNOWN_TOTAL_FALLBACK,
    brandCount: 0,
    updatedAt: null,
    source: "fallback",
  };
}

export async function getCachedCatalogStats(): Promise<CachedCatalogStats> {
  return (await readPlatformStatsCache()) ?? fallbackStats();
}

export const getCachedCatalogStatsMemo = unstable_cache(
  async () => getCachedCatalogStats(),
  ["cached-catalog-stats-v2"],
  { revalidate: 3600, tags: ["platform-stats", "catalog-stats"] }
);

/** Shop + homepage fast-path total — full live catalog count. */
export async function getShopCatalogKnownTotal(): Promise<number> {
  const stats = await getCachedCatalogStatsMemo();
  return stats.catalogProductCount;
}
