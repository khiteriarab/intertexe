import { unstable_cache } from "next/cache";
import { cache } from "react";
import { fetchBrandStats, fetchSaleProducts, getServerSupabase } from "./supabase-server";
import { fetchPlatformStats, type PlatformStats } from "./platform-stats";
import { SHOPPABLE_MIN_PRODUCTS } from "./shoppable-brands";
import { sanitizeBrandName } from "./brand-display";

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

/** Direct designers-table directory — used when the full brand-stats path is slow. */
export async function fetchDesignersDirectoryFast(): Promise<BrandStat[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("designers")
    .select("slug, name, product_count, natural_fiber_percent")
    .eq("is_live", true)
    .gte("product_count", SHOPPABLE_MIN_PRODUCTS)
    .order("name");
  if (error || !data?.length) return [];
  return (data as any[]).map((row) => ({
    slug: String(row.slug || "").toLowerCase(),
    name: sanitizeBrandName(String(row.name || row.slug || "")),
    count: Number(row.product_count) || 0,
    avgNaturalFiber: Number(row.natural_fiber_percent) || 0,
  }));
}

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

export const getCachedBrandStats = cache(
  unstable_cache(
    async (): Promise<BrandStat[]> => {
      const full = await withTimeout(fetchBrandStats(), FETCH_BUDGET_MS, [] as BrandStat[], "brand-directory");
      if (full.length > 0) return full;
      // Never ship an empty directory if the designers table is healthy.
      return withTimeout(fetchDesignersDirectoryFast(), 4_000, [] as BrandStat[], "brand-directory-fast");
    },
    ["brand-directory-v7"],
    { revalidate: BRAND_DIR_REVALIDATE, tags: ["brand-directory"] }
  )
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
