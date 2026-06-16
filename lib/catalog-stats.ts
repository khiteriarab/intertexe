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
export const CATALOG_STATS: CatalogStats = {
  productCount: 321859,
  productCountFormatted: "322,000+",
  brandCount: 562,
  brandCountFormatted: "560+",
  lastUpdated: new Date().toISOString(),
};
