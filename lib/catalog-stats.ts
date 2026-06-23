export type CatalogStats = {
  productCount: number;
  productCountFormatted: string;
  brandCount: number;
  brandCountFormatted: string;
  lastUpdated: string;
};

/**
 * Single source of truth for marketing-facing catalog stats.
 * Update this file when live counts materially change.
 */
/** Static SEO fallback — live UI uses platform_stats_cache (weekly cron). */
export const CATALOG_STATS: CatalogStats = {
  productCount: 321_859,
  productCountFormatted: "322,000+",
  brandCount: 562,
  brandCountFormatted: "560+",
  lastUpdated: "2026-06-01T00:00:00.000Z",
};
