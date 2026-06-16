/**
 * Regional catalog counts for reporting.
 * Canada has no `region = 'ca'` rows — shoppers use the US catalog.
 */
import { unstable_cache } from "next/cache";
import { liveProductsApparelFrom } from "./global-catalog-scope";
import { getServerSupabase } from "./supabase-service-client";
import { HOMEPAGE_STATS_REVALIDATE_SEC } from "./homepage-cache-config";

export type RegionalCatalogStats = {
  us: number;
  ca: number;
  eu: number;
  uk: number;
};

async function countRegion(region: string): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;

  const { count, error } = await liveProductsApparelFrom(supabase)
    .select("id", { count: "exact", head: true })
    .eq("region", region);

  if (error) {
    console.warn(`[regional-catalog-stats] ${region}:`, error.message);
    return 0;
  }
  return count ?? 0;
}

export async function fetchRegionalCatalogStats(): Promise<RegionalCatalogStats> {
  const [us, eu, uk] = await Promise.all([
    countRegion("us"),
    countRegion("eu"),
    countRegion("uk"),
  ]);

  return {
    us,
    ca: us, // Canada maps to US catalog in schema
    eu,
    uk,
  };
}

export const getCachedRegionalCatalogStats = unstable_cache(
  fetchRegionalCatalogStats,
  ["regional-catalog-stats-v1"],
  { revalidate: HOMEPAGE_STATS_REVALIDATE_SEC, tags: ["platform-stats", "regional-stats"] }
);
