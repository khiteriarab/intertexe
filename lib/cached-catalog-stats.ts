/**
 * Shared marketing + shop catalog totals.
 *
 * Count definitions:
 * - liveOfferCount: regional offers in live_products_apparel (not deduped cards)
 * - PLP filter totals: exact from browse RPC total_status=exact (never use fallback here)
 * - platform_stats_cache.product_count: legacy deduped card count when cache fresh (~24k)
 *
 * Do NOT use US_CATALOG_KNOWN_TOTAL_FALLBACK for filter-result or VIEW N counts.
 */
import { unstable_cache } from "next/cache";
import { getServerSupabase } from "./supabase-service-client";

export type CachedCatalogStats = {
  /** Live regional offers — marketing hero only when explicitly unfiltered. */
  catalogProductCount: number | null;
  brandCount: number;
  updatedAt: string | null;
  source: "live_count" | "cache" | "unavailable";
};

const CACHE_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;
const MIN_TRUSTED_PRODUCT_COUNT = 1_000;

async function readLiveApparelCount(region = "us"): Promise<number | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  try {
    const { count, error } = await supabase
      .from("live_products_apparel")
      .select("id", { count: "exact", head: true })
      .eq("region", region.toLowerCase());
    if (error || count == null || count < MIN_TRUSTED_PRODUCT_COUNT) return null;
    return count;
  } catch {
    return null;
  }
}

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
    if (productCount <= 0) return null;

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

function unavailableStats(): CachedCatalogStats {
  return {
    catalogProductCount: null,
    brandCount: 0,
    updatedAt: null,
    source: "unavailable",
  };
}

export async function getCachedCatalogStats(region = "us"): Promise<CachedCatalogStats> {
  const live = await readLiveApparelCount(region);
  if (live != null) {
    return {
      catalogProductCount: live,
      brandCount: 0,
      updatedAt: new Date().toISOString(),
      source: "live_count",
    };
  }
  return (await readPlatformStatsCache()) ?? unavailableStats();
}

export const getCachedCatalogStatsMemo = unstable_cache(
  async () => getCachedCatalogStats("us"),
  ["cached-catalog-stats-v3-live-offers"],
  { revalidate: 3600, tags: ["platform-stats", "catalog-stats"] }
);

/** Marketing-only unfiltered hint — never substitute for filtered PLP totals. */
export async function getShopCatalogKnownTotal(): Promise<number | null> {
  const stats = await getCachedCatalogStatsMemo();
  return stats.catalogProductCount;
}
