import type { SupabaseClient } from "@supabase/supabase-js";
import { liveProductsApparelFrom } from "./global-catalog-scope";
import { getBrandHeroImage } from "./brand-hero-images";
import { pickBestEditorialImage } from "./editorial-image-score";

export type BrandHeroInput = {
  slug: string;
  name: string;
  hero_image?: string | null;
  heroImage?: string | null;
};

const PRODUCT_CARD_COLS =
  "id, product_id, brand_slug, brand_name, name, image_url, category, natural_fiber_percent";

export async function fetchBrandTopProducts(
  supabase: SupabaseClient,
  brandSlug: string,
  limit = 10
): Promise<{ imageUrl: string; name: string }[]> {
  const { data } = await liveProductsApparelFrom(supabase)
    
    .select(PRODUCT_CARD_COLS)
    .eq("brand_slug", brandSlug)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .gte("natural_fiber_percent", 80)
    .order("natural_fiber_percent", { ascending: false })
    .limit(Math.max(limit * 3, 24));

  return (data || [])
    .map((row: any) => ({
      imageUrl: String(row.image_url || ""),
      name: String(row.name || ""),
    }))
    .filter((p) => p.imageUrl);
}

/** Manual hero → top editorial product image → static brand asset. */
export async function resolveBrandHeroImage(
  supabase: SupabaseClient,
  brand: BrandHeroInput
): Promise<string | null> {
  const manual = brand.hero_image || brand.heroImage;
  if (manual && String(manual).trim()) return String(manual).trim();

  const products = await fetchBrandTopProducts(supabase, brand.slug, 10);
  const fromCatalog = pickBestEditorialImage(products, { preferFullLength: true });
  if (fromCatalog) return fromCatalog;

  return getBrandHeroImage(brand.name);
}

export async function enrichDesignersWithHeroImages<T extends BrandHeroInput>(
  supabase: SupabaseClient,
  designers: T[]
): Promise<(T & { heroImageUrl: string | null })[]> {
  return Promise.all(
    designers.map(async (d) => ({
      ...d,
      heroImageUrl: await resolveBrandHeroImage(supabase, d),
    }))
  );
}
