/**
 * NAP-style filter preview totals — read weekly precomputed counts, never live RPC at limit=1.
 */
import { readCatalogRouteStats } from "./catalog-route-stats";

/** Cached fiber / taxonomy total for iOS filter sheet preview (limit=1 browse). */
export async function resolveCachedCatalogPreviewTotal(opts: {
  fiber?: string | null;
  category?: string | null;
  taxonomySlug?: string | null;
  region?: string;
}): Promise<number | null> {
  const stats = await readCatalogRouteStats();
  if (!stats) return null;
  if (opts.region && stats.region !== opts.region.toLowerCase()) return null;

  const fiber = opts.fiber?.trim().toLowerCase();
  if (fiber && fiber !== "all") {
    const count = stats.fiberCounts[fiber];
    if (count != null && count > 0) return count;
  }

  const taxonomy = opts.taxonomySlug?.trim().toLowerCase();
  if (taxonomy) {
    const count = stats.taxonomyCounts[taxonomy];
    if (count != null && count > 0) return count;
  }

  const category = opts.category?.trim().toLowerCase();
  if (category && category !== "all" && category !== "clothing" && category !== "apparel") {
    const slug = `clothing/${category.replace(/\s+/g, "-")}`;
    const count = stats.taxonomyCounts[slug];
    if (count != null && count > 0) return count;
  }

  return null;
}
