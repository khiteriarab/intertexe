/**
 * Shared catalog stats for web + iOS parity (live_products_apparel gate).
 */
import { getServerSupabase } from "./supabase-server";

export type PlatformStats = {
  productCount: number;
  brandCount: number;
};

const FALLBACK_PRODUCT_COUNT = 24_000;
const FALLBACK_BRAND_COUNT = 99;

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { productCount: FALLBACK_PRODUCT_COUNT, brandCount: FALLBACK_BRAND_COUNT };
  }

  let productCount = 0;
  try {
    const { count, error } = await supabase
      .from("live_products_apparel")
      .select("id", { count: "exact", head: true })
      .gte("natural_fiber_percent", 80);
    if (!error && count != null) productCount = count;
  } catch {
    /* ignore */
  }

  if (productCount < 1000) {
    try {
      const { data, error } = await supabase.rpc("catalog_list_count", {
        p_preferred_region: "us",
        p_fallback_region: "us",
        p_fiber: null,
        p_category: null,
        p_brand_slug: null,
        p_search: null,
        p_min_nfp: 80,
      });
      if (!error && data != null) productCount = Number(data) || productCount;
    } catch {
      /* ignore */
    }
  }

  const brandCount = await fetchBrandCountFast(supabase);

  return {
    productCount: productCount > 0 ? productCount : FALLBACK_PRODUCT_COUNT,
    brandCount: brandCount > 0 ? brandCount : FALLBACK_BRAND_COUNT,
  };
}

/** Avoid slow catalog_brand_directory + full-table scan during homepage SSR / Vercel build. */
async function fetchBrandCountFast(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>
): Promise<number> {
  try {
    const { data, error } = await Promise.race([
      supabase.rpc("catalog_brand_directory", { p_limit: 120 }),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 6_000)
      ),
    ]);
    if (!error && data?.length) {
      return data.filter((r: { product_count?: number }) => (Number(r.product_count) || 0) >= 2).length;
    }
  } catch {
    /* ignore */
  }

  try {
    const { data } = await supabase
      .from("live_products_apparel")
      .select("brand_slug")
      .gte("natural_fiber_percent", 80)
      .not("brand_slug", "is", null)
      .limit(5000);
    const n = new Set((data || []).map((r) => r.brand_slug).filter(Boolean)).size;
    if (n > 0) return n;
  } catch {
    /* ignore */
  }

  return FALLBACK_BRAND_COUNT;
}
