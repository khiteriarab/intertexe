import {
  fetchDesigners,
  fetchDesignerBySlug,
  fetchProductsByFiber,
  fetchProductsByBrandWithImages,
  fetchProductCount,
  fetchProductCountsByBrand,
} from "./supabase-server";
import { getCuratedScore } from "./curated-quality-scores";

export const CURATED_BRAND_SLUGS = [
  "khaite", "anine-bing", "toteme", "frame", "diesel",
  "nanushka", "acne-studios", "the-row", "sandro", "agolde",
];

export interface HomePageData {
  designers: any[];
  productCount: number;
  cashmereProducts: any[];
  silkProducts: any[];
  linenProducts: any[];
  productCountByBrand: Record<string, number>;
  curatedDesigners: any[];
  newInProducts: any[];
}

export async function getHomePageData(): Promise<HomePageData> {
  const [designers, productCount, cashmereProducts, silkProducts, linenProducts, productCountByBrand] =
    await Promise.all([
      fetchDesigners(undefined, 100),
      fetchProductCount(),
      fetchProductsByFiber("cashmere").then((p) => p.slice(0, 16)),
      fetchProductsByFiber("silk").then((p) => p.slice(0, 16)),
      fetchProductsByFiber("linen").then((p) => p.slice(0, 16)),
      fetchProductCountsByBrand(CURATED_BRAND_SLUGS),
    ]);

  const curatedDesignerResults = await Promise.all(
    CURATED_BRAND_SLUGS.map(async (slug) => {
      const designer = await fetchDesignerBySlug(slug);
      if (!designer) return null;
      if (designer.naturalFiberPercent != null) return designer;
      const score = getCuratedScore(designer.name);
      return score != null ? { ...designer, naturalFiberPercent: score } : designer;
    })
  );
  const curatedDesigners = curatedDesignerResults.filter(Boolean);

  const [alcProducts, dieselProducts] = await Promise.all([
    fetchProductsByBrandWithImages("a-l-c-", 24),
    fetchProductsByBrandWithImages("diesel", 24),
  ]);

  const seenIds = new Set<string>();
  const newInProducts: any[] = [];
  for (const p of [...alcProducts, ...dieselProducts]) {
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      newInProducts.push(p);
    }
  }

  return {
    designers,
    productCount,
    cashmereProducts,
    silkProducts,
    linenProducts,
    productCountByBrand,
    curatedDesigners,
    newInProducts: newInProducts.slice(0, 30),
  };
}
