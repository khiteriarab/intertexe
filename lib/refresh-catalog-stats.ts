/**
 * Refresh platform_stats_cache — full verified catalog size + shoppable brand count.
 * Uses live_products_apparel (300k+ pieces), not catalog_list_count (~84k deduped shop cards).
 */
import { liveProductsApparelFrom } from "./global-catalog-scope";
import { fetchShoppableBrandCount } from "./shoppable-brands";
import { getServerSupabase } from "./supabase-service-client";

export type RefreshedCatalogStats = {
  productCount: number;
  brandCount: number;
  updatedAt: string;
};

async function fetchLiveCatalogTotal(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>
): Promise<number | null> {
  try {
    const { count, error } = await liveProductsApparelFrom(supabase)
      .select("id", { count: "exact", head: true })
      .gte("natural_fiber_percent", 80);
    if (error || count == null || count <= 0) return null;
    return count;
  } catch {
    return null;
  }
}

/** Compute live catalog + brand totals and upsert platform_stats_cache. */
export async function refreshPlatformStatsCache(): Promise<RefreshedCatalogStats> {
  const supabase = getServerSupabase();
  if (!supabase) {
    throw new Error("Supabase unavailable");
  }

  const [productCount, brandCount] = await Promise.all([
    fetchLiveCatalogTotal(supabase),
    fetchShoppableBrandCount(),
  ]);

  if (!productCount || productCount <= 0) {
    throw new Error("live_products_apparel count returned no rows");
  }

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("platform_stats_cache").upsert(
    {
      id: "main",
      product_count: productCount,
      brand_count: brandCount,
      updated_at: updatedAt,
    },
    { onConflict: "id" }
  );
  if (error) throw new Error(error.message);

  return { productCount, brandCount, updatedAt };
}
