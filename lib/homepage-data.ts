import {
  fetchDesigners,
  fetchDesignerBySlug,
  fetchProductsByFiber,
  fetchProductsByBrandWithImages,
  fetchProductCount,
  fetchProductCountsByBrand,
} from "./supabase-server";
import { getCuratedScore } from "./curated-quality-scores";

function isZeroPrice(price: string | null | undefined): boolean {
  if (!price) return true;
  const cleaned = price.replace(/[^0-9.]/g, "");
  if (!cleaned) return true;
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0;
}

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
      fetchProductsByFiber("cashmere").then((p) => p.filter((x) => !isZeroPrice(x.price)).slice(0, 16)),
      fetchProductsByFiber("silk").then((p) => p.filter((x) => !isZeroPrice(x.price)).slice(0, 16)),
      fetchProductsByFiber("linen").then((p) => p.filter((x) => !isZeroPrice(x.price)).slice(0, 16)),
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

  const newInBrandSlugs = ["a-l-c-", "diesel", "khaite", "anine-bing", "toteme", "reformation", "sandro", "nanushka", "frame", "acne-studios"];
  const brandProductLists = await Promise.all(
    newInBrandSlugs.map((slug) => fetchProductsByBrandWithImages(slug, 12))
  );

  const seenIds = new Set<string>();
  const newInProducts: any[] = [];
  const maxPerBrand = 5;
  for (const products of brandProductLists) {
    let count = 0;
    for (const p of products) {
      if (count >= maxPerBrand) break;
      if (seenIds.has(p.id)) continue;
      if (isZeroPrice(p.price)) continue;
      seenIds.add(p.id);
      newInProducts.push(p);
      count++;
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
