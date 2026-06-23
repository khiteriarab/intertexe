/** Client-safe catalog pagination constants (no server/ingest imports). */
export const CATALOG_INITIAL_PAGE = 48;
export const CATALOG_PAGE_SIZE = 48;

/**
 * Last-resort catalog total when platform_stats_cache is empty (see refresh-catalog-stats cron).
 * Matches iOS `CatalogPagination.knownUSTotal` — full live_products_apparel count, not deduped shop cards.
 */
export const US_CATALOG_KNOWN_TOTAL_FALLBACK = 300_000;
