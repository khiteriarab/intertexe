/**
 * Precomputed / cached catalog reads — luxury UX: fast repeat views, bounded cold paths.
 */
import { unstable_cache } from "next/cache";
import { fetchBrandStats, fetchSaleProducts } from "./supabase-server";
import { fetchPlatformStats, type PlatformStats } from "./platform-stats";

const STATS_REVALIDATE = 600;
const BRAND_DIR_REVALIDATE = 900;
const SALE_PAGE_REVALIDATE = 600;
/** Keep build/request paths from hanging when Supabase Disk IO is elevated. */
const FETCH_BUDGET_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn(`[cached-catalog] ${label} timeout after ${ms}ms`);
      resolve(fallback);
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        console.warn(`[cached-catalog] ${label} failed`, err?.message || err);
        resolve(fallback);
      });
  });
}

export type BrandStat = {
  slug: string;
  name: string;
  count: number;
  avgNaturalFiber: number;
};

export const getCachedPlatformStats = unstable_cache(
  async (): Promise<PlatformStats> =>
    withTimeout(
      fetchPlatformStats(),
      FETCH_BUDGET_MS,
      { productCount: 0, brandCount: 0 },
      "platform-stats"
    ),
  ["platform-stats-v8"],
  { revalidate: STATS_REVALIDATE, tags: ["platform-stats"] }
);

export const getCachedBrandStats = unstable_cache(
  async (): Promise<BrandStat[]> =>
    withTimeout(fetchBrandStats(), FETCH_BUDGET_MS, [], "brand-directory"),
  ["brand-directory-v5"],
  { revalidate: BRAND_DIR_REVALIDATE, tags: ["brand-directory"] }
);

/** First sale grid — cached; skip exact count on cold path for faster TTFB. */
export const getCachedSalePageData = unstable_cache(
  async () =>
    withTimeout(
      fetchSaleProducts({
        limit: 24,
        offset: 0,
        useMerchFeedPreview: false,
        skipTotal: true,
      }),
      FETCH_BUDGET_MS,
      { products: [], total: 0, hasMore: false },
      "sale-page"
    ),
  ["sale-page-first-v5"],
  { revalidate: SALE_PAGE_REVALIDATE, tags: ["sale-catalog"] }
);
