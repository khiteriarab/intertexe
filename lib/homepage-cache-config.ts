/** Shared ISR / CDN cache windows for homepage and catalog stats. */
export const HOMEPAGE_REVALIDATE_SEC = 3600;
export const HOMEPAGE_STATS_REVALIDATE_SEC = 21600;
export const HOMEPAGE_BRANDS_REVALIDATE_SEC = 21600;

export const HOMEPAGE_CACHE_HEADERS = {
  "Cache-Control": `public, s-maxage=${HOMEPAGE_REVALIDATE_SEC}, stale-while-revalidate=${HOMEPAGE_REVALIDATE_SEC * 2}`,
  "CDN-Cache-Control": `public, max-age=${HOMEPAGE_REVALIDATE_SEC}`,
} as const;

export const STATS_CACHE_HEADERS = {
  "Cache-Control": `public, s-maxage=${HOMEPAGE_STATS_REVALIDATE_SEC}, stale-while-revalidate=${HOMEPAGE_STATS_REVALIDATE_SEC * 2}`,
  "CDN-Cache-Control": `public, max-age=${HOMEPAGE_STATS_REVALIDATE_SEC}`,
} as const;
