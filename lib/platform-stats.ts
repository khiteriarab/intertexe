/**
 * Shared catalog stats for web + iOS parity (live_products_apparel gate).
 */
import { fetchShoppableBrandCount } from "./shoppable-brands";
import { liveProductsApparelFrom } from "./global-catalog-scope";
import { getServerSupabase } from "./supabase-service-client";

export type PlatformStats = {
  productCount: number;
  brandCount: number;
};

/** Shown only when Supabase is unreachable — matches current verified catalog size. */
const FALLBACK_PRODUCT_COUNT = 84_704;
const FALLBACK_BRAND_COUNT = 0;

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return { productCount: FALLBACK_PRODUCT_COUNT, brandCount: FALLBACK_BRAND_COUNT };
  }

  let productCount = 0;
  let brandCount = 0;

  try {
    const { count, error } = await liveProductsApparelFrom(supabase)
      
      .select("*", { count: "exact", head: true });
    if (!error && count != null && count > 0) {
      productCount = count;
    }
  } catch {
    /* ignore */
  }

  try {
    const { data: cache } = await supabase
      .from("platform_stats_cache")
      .select("product_count, brand_count, updated_at")
      .eq("id", "main")
      .maybeSingle();
    if (cache?.product_count != null && Number(cache.product_count) > 0) {
      productCount = Math.max(productCount, Number(cache.product_count));
      if (cache.brand_count != null && Number(cache.brand_count) > 0) {
        brandCount = Number(cache.brand_count);
      }
    }
  } catch {
    /* table may not exist until migration 20240036 */
  }

  try {
    const { data: summary } = await supabase
      .from("catalog_classification_summary")
      .select("visible_catalog_cards_approx")
      .maybeSingle();
    const cards = Number(summary?.visible_catalog_cards_approx);
    if (cards > 0) productCount = Math.max(productCount, cards);
  } catch {
    /* ignore */
  }

  try {
    const { data: countRaw, error } = await supabase.rpc("catalog_shoppable_brand_count", {
      p_min_products: 2,
    });
    if (!error && countRaw != null) brandCount = Number(countRaw) || 0;
  } catch {
    /* ignore */
  }

  if (brandCount <= 0) {
    brandCount = await fetchShoppableBrandCount();
  }

  return {
    productCount: productCount > 0 ? productCount : FALLBACK_PRODUCT_COUNT,
    brandCount: brandCount > 0 ? brandCount : FALLBACK_BRAND_COUNT,
  };
}

/** Vetted brands with live inventory (≥2 offers). */
export async function fetchVettedBrandCount(): Promise<number> {
  return fetchShoppableBrandCount();
}
