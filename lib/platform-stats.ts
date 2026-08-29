/**
 * Shared catalog stats for web + iOS parity.
 * Product count = live regional offers (not deduped cards, not 300k fallback).
 */
import { getCachedCatalogStats } from "./cached-catalog-stats";
import { fetchShoppableBrandCount } from "./shoppable-brands";
import { liveProductsApparelFrom } from "./global-catalog-scope";
import { getServerSupabase } from "./supabase-service-client";

export type PlatformStats = {
  productCount: number;
  brandCount: number;
};

async function fetchLiveProductCount(): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;
  try {
    const { count, error } = await liveProductsApparelFrom(supabase)
      .select("id", { count: "exact", head: true })
      .gte("natural_fiber_percent", 80);
    if (!error && count != null && count > 0) return count;
  } catch {
    /* ignore */
  }
  return 0;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const cached = await getCachedCatalogStats();
  let productCount = cached.catalogProductCount ?? 0;
  let brandCount = cached.brandCount;

  if (productCount <= 0) {
    productCount = await fetchLiveProductCount();
  }
  if (brandCount <= 0) {
    brandCount = await fetchShoppableBrandCount();
  }

  return {
    productCount,
    brandCount,
  };
}

/** Vetted brands with live inventory (≥2 offers). */
export async function fetchVettedBrandCount(): Promise<number> {
  return fetchShoppableBrandCount();
}
