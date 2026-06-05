import { getServerSupabase } from "./supabase-service-client";
import { liveProductsApparelFrom } from "./global-catalog-scope";
import { sanitizeBrandName } from "./brand-display";

export type CatalogDesignerBrand = {
  slug: string;
  name: string;
  count: number;
};

const MIN_PRODUCTS = 2;
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

export async function fetchCatalogDesigners(
  region = "us",
  minProducts = MIN_PRODUCTS
): Promise<CatalogDesignerBrand[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const brandMap = new Map<string, { slug: string; name: string; count: number }>();

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const { data, error } = await liveProductsApparelFrom(supabase)
      .select("brand_slug, brand_name")
      .eq("region", region)
      .not("brand_slug", "is", null)
      .not("brand_name", "is", null)
      .order("brand_slug", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.warn("[fetchCatalogDesigners] page error:", error.message);
      break;
    }
    if (!data?.length) break;

    for (const row of data) {
      const slug = String(row.brand_slug || "").trim().toLowerCase();
      const name = sanitizeBrandName(String(row.brand_name || slug));
      if (!slug) continue;
      const existing = brandMap.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        brandMap.set(slug, { slug, name, count: 1 });
      }
    }

    if (data.length < PAGE_SIZE) break;
  }

  return [...brandMap.values()]
    .filter((b) => b.count >= minProducts)
    .sort((a, b) => a.name.localeCompare(b.name));
}
