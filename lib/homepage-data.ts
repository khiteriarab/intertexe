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

export const CURATED_BRAND_SLUGS = [
  "fleur-du-mal", "faithfull-the-brand", "isabel-marant", "khaite",
  "anine-bing", "frame", "diesel", "nanushka", "sandro", "agolde",
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
  saleProducts: any[];
}

export async function getHomePageData(): Promise<HomePageData> {
  const [designers, productCount, cashmereProducts, silkProducts, linenProducts, productCountByBrand, saleResult] =
    await Promise.all([
      fetchDesigners(undefined, 100),
      fetchProductCount(),
      fetchProductsByFiber("cashmere").then((p) => p.filter((x) => !isZeroPrice(x.price)).slice(0, 16)),
      fetchProductsByFiber("silk").then((p) => p.filter((x) => !isZeroPrice(x.price)).slice(0, 16)),
      fetchProductsByFiber("linen").then((p) => p.filter((x) => !isZeroPrice(x.price)).slice(0, 16)),
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

  const newInBrandSlugs = ["isabel-marant", "a-l-c-", "diesel", "faithfull-the-brand", "fleur-du-mal"];
  const brandProductLists = await Promise.all(
    newInBrandSlugs.map((slug) => fetchProductsByBrandWithImages(slug, 30))
  );

  const seenIds = new Set<string>();
  const seenBaseNames = new Set<string>();
  const newInProducts: any[] = [];
  const maxPerBrand = 5;
  const editorialCategories = new Set(["dresses", "outerwear", "knitwear", "skirts", "jumpsuits", "lingerie", "swimwear"]);
  const basicPatterns = /^(t-shirt|tee|sweatshirt|tank|vest)\b/i;

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
      const aEditorial = editorialCategories.has(a.category) ? 1 : 0;
      const bEditorial = editorialCategories.has(b.category) ? 1 : 0;
      if (bEditorial !== aEditorial) return bEditorial - aEditorial;
      const aBasic = basicPatterns.test(a.name) ? 1 : 0;
      const bBasic = basicPatterns.test(b.name) ? 1 : 0;
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
      const baseName = getBaseName(p.name);
      if (seenBaseNames.has(baseName)) continue;
      if (p.brand_slug === "isabel-marant" && p.image_url && !p.image_url.includes("-E.")) continue;
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

  return {
    designers,
    productCount,
    cashmereProducts,
    silkProducts,
    linenProducts,
    productCountByBrand,
    curatedDesigners,
    newInProducts,
    saleProducts,
  };
}
