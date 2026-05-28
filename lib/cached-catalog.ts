/**
 * Precomputed / cached catalog reads — luxury UX: fast repeat views, bounded cold paths.
 */
import { unstable_cache } from "next/cache";
import { fetchBrandStats, fetchSaleProducts } from "./supabase-server";
import { fetchPlatformStats, type PlatformStats } from "./platform-stats";

const STATS_REVALIDATE = 600;
const BRAND_DIR_REVALIDATE = 900;
const SALE_PAGE_REVALIDATE = 600;

export type BrandStat = {
  slug: string;
  name: string;
  count: number;
  avgNaturalFiber: number;
};

export const getCachedPlatformStats = unstable_cache(
  async (): Promise<PlatformStats> => fetchPlatformStats(),
  ["platform-stats-v4"],
  { revalidate: STATS_REVALIDATE, tags: ["platform-stats"] }
);

export const getCachedBrandStats = unstable_cache(
  async (): Promise<BrandStat[]> => fetchBrandStats(),
  ["brand-directory-v3"],
  { revalidate: BRAND_DIR_REVALIDATE, tags: ["brand-directory"] }
);

/** First sale grid + true total — full catalog scan, cached (not homepage merch preview). */
export const getCachedSalePageData = unstable_cache(
  async () =>
    fetchSaleProducts({
      limit: 36,
      offset: 0,
      useMerchFeedPreview: false,
      skipTotal: true,
    }),
  ["sale-page-first-v2"],
  { revalidate: SALE_PAGE_REVALIDATE, tags: ["sale-catalog"] }
);
