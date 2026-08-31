/**
 * Precompute fiber + taxonomy route counts for NAP-style instant toolbar totals.
 * Runs inside weekly refresh-catalog-stats cron — never at PLP browse time.
 */
import { fetchTaxonomyCounts } from "./catalog-taxonomy";
import type { CatalogRouteStatsPayload } from "./catalog-route-stats";
import { writeCatalogRouteStats } from "./catalog-route-stats";
import { fetchFootwearCatalogCount } from "./footwear-catalog";
import { fetchFiberCounts, resolveShopCatalogTotal } from "./supabase-server";
import { getServerSupabase } from "./supabase-service-client";

export type RefreshedCatalogRouteStats = CatalogRouteStatsPayload & {
  taxonomyRouteCount: number;
  fiberRouteCount: number;
};

/** Compute all shop route counts and persist to system_status. */
export async function refreshCatalogRouteStats(region = "us"): Promise<RefreshedCatalogRouteStats> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase unavailable");

  const normalizedRegion = region.toLowerCase();

  const [fiberCounts, clothingTaxonomy, shoesTaxonomy, catalogTotal, shoesTotal] = await Promise.all([
    fetchFiberCounts(),
    fetchTaxonomyCounts("clothing", normalizedRegion),
    fetchTaxonomyCounts("shoes", normalizedRegion),
    resolveShopCatalogTotal(supabase, {
      preferred: normalizedRegion,
      fallback: normalizedRegion,
      fiber: null,
      category: null,
      brandSlug: null,
      search: null,
    }),
    fetchFootwearCatalogCount(normalizedRegion),
  ]);

  const taxonomyCounts: Record<string, number> = {
    ...clothingTaxonomy,
    ...shoesTaxonomy,
  };

  if (catalogTotal > 0) {
    taxonomyCounts["clothing/all"] = catalogTotal;
  }
  if (shoesTotal > 0) {
    taxonomyCounts["shoes/all"] = shoesTotal;
  }

  const updatedAt = new Date().toISOString();
  const payload: CatalogRouteStatsPayload = {
    version: 1,
    updatedAt,
    region: normalizedRegion,
    catalogTotal: Math.max(0, catalogTotal),
    shoesTotal: Math.max(0, shoesTotal),
    fiberCounts,
    taxonomyCounts,
  };

  await writeCatalogRouteStats(payload);

  return {
    ...payload,
    taxonomyRouteCount: Object.keys(taxonomyCounts).length,
    fiberRouteCount: Object.keys(fiberCounts).length,
  };
}
