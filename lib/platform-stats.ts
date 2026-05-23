/**
 * Shared catalog stats for web + iOS parity (live_products_apparel gate).
 */
import { fetchShoppableBrandCount } from "./shoppable-brands";
import { getServerSupabase } from "./supabase-service-client";

export type PlatformStats = {
  productCount: number;
  brandCount: number;
};

/** Shown only when Supabase is unreachable — keep conservative to avoid overstating. */
const FALLBACK_PRODUCT_COUNT = 0;
const FALLBACK_BRAND_COUNT = 0;

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

  const brandCount = await fetchShoppableBrandCount();

  return {
    productCount: productCount > 0 ? productCount : FALLBACK_PRODUCT_COUNT,
    brandCount: brandCount > 0 ? brandCount : FALLBACK_BRAND_COUNT,
  };
}

/** Vetted brands with live inventory (≥2 offers). */
export async function fetchVettedBrandCount(): Promise<number> {
  return fetchShoppableBrandCount();
}
