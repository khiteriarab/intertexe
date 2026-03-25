import {
  fetchDesigners,
  fetchDesignerBySlug,
  fetchProductsByFiber,
  fetchProductsByBrandWithImages,
  fetchProductCount,
  fetchProductCountsByBrand,
  fetchSaleProducts,
} from "./supabase-server";
import { getCuratedScore } from "./curated-quality-scores";

function isZeroPrice(price: string | null | undefined): boolean {
  if (!price) return true;
  const cleaned = price.replace(/[^0-9.]/g, "");
  if (!cleaned) return true;
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0;
}

function getStyleBaseName(name: string): string {
  return name
    .replace(/\s*-\s*(black|white|grey|gray|ecru|navy|blue|red|pink|green|beige|khaki|brown|camel|cream|ivory|nude|sand|taupe|chocolate|burgundy|plum|powder|midnight|heather|medium|deep|light|dark|washed|faded).*$/i, "")
    .trim()
    .toLowerCase();
}

const EDITORIAL_CATEGORIES = new Set(["dresses", "lingerie", "swimwear", "jumpsuits", "knitwear", "outerwear", "skirts", "tops"]);
const NON_EDITORIAL_CATEGORIES = new Set(["accessories", "scarves", "bags", "shoes", "jewelry"]);
const NON_EDITORIAL_NAMES = /\b(scarf|scarves|hat|cap|belt|bag|wallet|glove|sock|sunglasses|keychain|pouch|wrap|stole|shawl)\b/i;

function pickEditorialProduct(products: any[]): any | null {
  const scored = products
    .filter((p: any) => p.imageUrl || p.image_url)
    .map((p: any) => {
      let score = 0;
      const cat = (p.category || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      if (EDITORIAL_CATEGORIES.has(cat)) score += 10;
      if (NON_EDITORIAL_CATEGORIES.has(cat)) score -= 20;
      if (NON_EDITORIAL_NAMES.test(name)) score -= 20;
      if (cat === "dresses" || cat === "lingerie") score += 5;
      const price = parseFloat(((p.price || "0") + "").replace(/[^0-9.]/g, "")) || 0;
      if (price > 300) score += 3;
      if (price > 600) score += 2;
      return { product: p, score };
    })
    .sort((a: any, b: any) => b.score - a.score);
  return scored[0]?.product || products[0] || null;
}

function diversifyByBrand(products: any[], max: number, maxPerBrand: number): any[] {
  const result: any[] = [];
  const brandCount: Record<string, number> = {};
  const seenStyles = new Set<string>();
  for (const p of products) {
    if (result.length >= max) break;
    const brand = p.brandSlug || p.brand_slug || "";
    const styleName = getStyleBaseName(p.name || "");
    if ((brandCount[brand] || 0) >= maxPerBrand) continue;
    if (seenStyles.has(styleName)) continue;
    brandCount[brand] = (brandCount[brand] || 0) + 1;
    seenStyles.add(styleName);
    result.push(p);
  }
  return result;
}

export const CURATED_BRAND_SLUGS = [
  "theory", "rag-and-bone", "vince", "l-agence", "frame",
  "fleur-du-mal", "faithfull-the-brand", "isabel-marant", "diesel", "rails",
  "7-for-all-mankind", "splendid",
];

export interface HomePageData {
  designers: any[];
  productCount: number;
  cashmereProducts: any[];
  silkProducts: any[];
  linenProducts: any[];
  silkEditorialProduct: any | null;
  linenEditorialProduct: any | null;
  productCountByBrand: Record<string, number>;
  curatedDesigners: any[];
  newInProducts: any[];
  saleProducts: any[];
}

export async function getHomePageData(): Promise<HomePageData> {
  const [designers, productCount, cashmereProducts, silkProducts, linenProducts, productCountByBrand, saleResult] =
    await Promise.all([
      fetchDesigners(undefined, 100),
      fetchProductCount(),
      fetchProductsByFiber("cashmere").then((p) => diversifyByBrand(p.filter((x) => !isZeroPrice(x.price)), 16, 3)),
      fetchProductsByFiber("silk").then((p) => diversifyByBrand(p.filter((x) => !isZeroPrice(x.price)), 16, 3)),
      fetchProductsByFiber("linen").then((p) => diversifyByBrand(p.filter((x) => !isZeroPrice(x.price)), 16, 3)),
      fetchProductCountsByBrand(CURATED_BRAND_SLUGS),
      fetchSaleProducts({ limit: 12 }),
    ]);

  const saleProducts = saleResult.products.filter((p) => !isZeroPrice(p.price));

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

  const newInBrandSlugs = [
    "isabel-marant", "theory", "vince", "l-agence", "fleur-du-mal",
    "rag-and-bone", "frame", "a-l-c", "faithfull-the-brand",
    "johnny-was", "ramy-brook", "rails", "free-people",
    "paige", "diesel", "splendid", "7-for-all-mankind",
  ];
  const brandProductLists = await Promise.all(
    newInBrandSlugs.map((slug) => fetchProductsByBrandWithImages(slug, 40))
  );

  const seenIds = new Set<string>();
  const seenBaseNames = new Set<string>();
  const newInProducts: any[] = [];
  const maxPerBrand = 3;
  const heroCategories = new Set(["dresses", "outerwear", "knitwear", "jumpsuits"]);
  const editorialCategories = new Set(["dresses", "outerwear", "knitwear", "skirts", "jumpsuits", "lingerie", "swimwear", "tops"]);
  const basicPatterns = /\b(t-shirt|tee|sweatshirt|tank top|vest|cargo|jogger|hoodie|henley|polo|baseball|cap|beanie|sock|belt|scarf|glove|wallet|bag|hat|mask)\b/i;
  const basicNamePatterns = /\b(basic|essential|everyday|classic crew|crewneck tee|v-?neck tee|pocket tee|jersey tee)\b/i;
  const minPrice = 80;

  function getBaseName(name: string): string {
    return name
      .replace(/\s*-\s*(black|white|grey|gray|ecru|navy|blue|red|pink|green|beige|khaki|brown|camel|cream|ivory|nude|sand|taupe|chocolate|burgundy|plum|terracotta|gunmetal|silver|gold|dark|light|washed|faded|medium|deep).*$/i, "")
      .replace(/\s*-\s*étoile$/i, "")
      .trim()
      .toLowerCase();
  }

  const brandQueues: any[][] = [];
  for (const products of brandProductLists) {
    const sorted = [...products].sort((a, b) => {
      const aHero = heroCategories.has(a.category) ? 2 : editorialCategories.has(a.category) ? 1 : 0;
      const bHero = heroCategories.has(b.category) ? 2 : editorialCategories.has(b.category) ? 1 : 0;
      if (bHero !== aHero) return bHero - aHero;
      const aBasic = (basicPatterns.test(a.name) || basicNamePatterns.test(a.name)) ? 1 : 0;
      const bBasic = (basicPatterns.test(b.name) || basicNamePatterns.test(b.name)) ? 1 : 0;
      if (aBasic !== bBasic) return aBasic - bBasic;
      const aPrice = parseFloat((a.price || "0").replace(/[^0-9.]/g, "")) || 0;
      const bPrice = parseFloat((b.price || "0").replace(/[^0-9.]/g, "")) || 0;
      return bPrice - aPrice;
    });
    const queue: any[] = [];
    for (const p of sorted) {
      if (queue.length >= maxPerBrand) break;
      if (seenIds.has(p.id)) continue;
      if (isZeroPrice(p.price)) continue;
      const price = parseFloat((p.price || "0").replace(/[^0-9.]/g, "")) || 0;
      if (price < minPrice) continue;
      if (basicPatterns.test(p.name) || basicNamePatterns.test(p.name)) continue;
      const baseName = getBaseName(p.name);
      if (seenBaseNames.has(baseName)) continue;
      if (p.brand_slug === "isabel-marant" && p.image_url) {
        const imgUrl = p.image_url;
        const hasModelShot = imgUrl.includes("_E1") || imgUrl.includes("_E2") || imgUrl.includes("-E1") || imgUrl.includes("-E2") || (imgUrl.includes("-E.") && !imgUrl.includes("_B.") && !imgUrl.includes("_D."));
        if (!hasModelShot) continue;
      }
      seenIds.add(p.id);
      seenBaseNames.add(baseName);
      queue.push(p);
    }
    if (queue.length > 0) brandQueues.push(queue);
  }

  let round = 0;
  while (newInProducts.length < 30) {
    let added = false;
    for (const queue of brandQueues) {
      if (round < queue.length) {
        newInProducts.push(queue[round]);
        added = true;
        if (newInProducts.length >= 30) break;
      }
    }
    if (!added) break;
    round++;
  }

  const silkEditorialProduct = pickEditorialProduct(silkProducts);
  const linenEditorialProduct = pickEditorialProduct(linenProducts);

  return {
    designers,
    productCount,
    cashmereProducts,
    silkProducts,
    linenProducts,
    silkEditorialProduct,
    linenEditorialProduct,
    productCountByBrand,
    curatedDesigners,
    newInProducts,
    saleProducts,
  };
}
