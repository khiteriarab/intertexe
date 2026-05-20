import {
  fetchDesigners,
  fetchDesignerBySlug,
  fetchProductsByFiber,
  fetchProductsByBrandWithImages,
  fetchSaleProducts,
  fetchSilkEditProducts,
  fetchVacationShopProducts,
  type Product,
  type CatalogFetchOpts,
} from "./supabase-server";
import { getCuratedScore } from "./curated-quality-scores";

/** Set `HOMEPAGE_USE_CATALOG_RPC_FOR_RAILS=1` to force catalog RPC on rails (slower). Default skips RPC → live_products_apparel only. */
const HOMEPAGE_USE_CATALOG_RPC = process.env.HOMEPAGE_USE_CATALOG_RPC_FOR_RAILS === "1";

const MATERIAL_RAIL_FETCH_LIMIT = 48;
const MATERIAL_RAIL_DISPLAY_MAX = 12;
const MATERIAL_DIVERSITY_MAX_PER_BRAND = 2;
const HOMEPAGE_BRAND_LIVE_ROW_CAP = 48;
const NEW_IN_FETCH_PER_BRAND = 24;
const NEW_IN_TARGET_ITEMS = 18;
const HOMEPAGE_SALE_FETCH_LIMIT = 24;
/** Cap raw rows read for homepage sale stripe (sale page scans full catalog). */
const HOMEPAGE_SALE_MAX_SOURCE_ROWS = 480;
const DESIGNERS_FETCH_LIMIT = 80;

/** One slow rail must not block the whole page. */
const RAIL_TIMEOUT_MS = 5200;
const BRAND_RPC_TIMEOUT_MS = 4200;
const DESIGNERS_TIMEOUT_MS = 4000;

const homeRailOpts: CatalogFetchOpts = {
  preferLiveOnly: !HOMEPAGE_USE_CATALOG_RPC,
};

const homeBrandOpts: CatalogFetchOpts = {
  preferLiveOnly: !HOMEPAGE_USE_CATALOG_RPC,
  liveRowCap: HOMEPAGE_BRAND_LIVE_ROW_CAP,
};

function homepageTiming(label: string, startedAt: number, extra?: string) {
  const ms = Date.now() - startedAt;
  console.log(`[homepage-timing] ${label} ${ms}ms${extra ? ` ${extra}` : ""}`);
}

async function withHomepageRailTimeout<T>(
  label: string,
  ms: number,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  const t0 = Date.now();
  try {
    const out = await Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label}_timeout`)), ms)
      ),
    ]);
    homepageTiming(`${label}`, t0);
    return out;
  } catch (e: any) {
    homepageTiming(`${label}`, t0, e?.message || "error");
    return fallback;
  }
}

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
  "khaite", "toteme", "loro-piana", "staud", "ganni",
  "velvet", "fleur-du-mal", "faithfull-the-brand", "isabel-marant", "diesel",
  "rails", "re-done", "citizens-of-humanity", "7-for-all-mankind", "splendid",
];

export interface HomePageData {
  designers: any[];
  /** 0 → client uses static hero copy (`HomeClient` fallback); homepage SSR skips expensive catalog counts. */
  productCount: number;
  cashmereProducts: any[];
  silkProducts: any[];
  vacationProducts: any[];
  linenProducts: any[];
  silkEditorialProduct: any | null;
  linenEditorialProduct: any | null;
  productCountByBrand: Record<string, number>;
  curatedDesigners: any[];
  newInProducts: any[];
  saleProducts: any[];
}

/** Same diversification + price gate for material rails. */
function postProcessHomepageMaterialRail(products: Product[]): Product[] {
  return diversifyByBrand(
    products.filter((x) => !isZeroPrice(x.price)),
    MATERIAL_RAIL_DISPLAY_MAX,
    MATERIAL_DIVERSITY_MAX_PER_BRAND
  );
}

export async function getHomePageData(): Promise<HomePageData> {
  const designers = await withHomepageRailTimeout(
    "rail:designers",
    DESIGNERS_TIMEOUT_MS,
    () => fetchDesigners(undefined, DESIGNERS_FETCH_LIMIT),
    []
  );

  const [cashmereProducts, silkProducts, vacationProducts, linenProducts, saleResult] =
    await Promise.all([
      withHomepageRailTimeout(
        "rail:cashmere",
        RAIL_TIMEOUT_MS,
        () =>
          fetchProductsByFiber("cashmere", MATERIAL_RAIL_FETCH_LIMIT, homeRailOpts).then(
            postProcessHomepageMaterialRail
          ),
        []
      ),
      withHomepageRailTimeout(
        "rail:silk",
        RAIL_TIMEOUT_MS,
        () =>
          fetchSilkEditProducts(MATERIAL_RAIL_FETCH_LIMIT, undefined, homeRailOpts).then(
            postProcessHomepageMaterialRail
          ),
        []
      ),
      withHomepageRailTimeout(
        "rail:vacation",
        RAIL_TIMEOUT_MS,
        () =>
          fetchVacationShopProducts(MATERIAL_RAIL_FETCH_LIMIT, undefined, homeRailOpts).then(
            postProcessHomepageMaterialRail
          ),
        []
      ),
      withHomepageRailTimeout(
        "rail:linen",
        RAIL_TIMEOUT_MS,
        () =>
          fetchProductsByFiber("linen", MATERIAL_RAIL_FETCH_LIMIT, homeRailOpts).then(
            postProcessHomepageMaterialRail
          ),
        []
      ),
      withHomepageRailTimeout(
        "rail:sale",
        RAIL_TIMEOUT_MS,
        () =>
          fetchSaleProducts({
            limit: HOMEPAGE_SALE_FETCH_LIMIT,
            offset: 0,
            maxSourceRows: HOMEPAGE_SALE_MAX_SOURCE_ROWS,
          }),
        { products: [], total: 0 }
      ),
    ]);

  const saleProducts = (saleResult.products || []).filter((p) => !isZeroPrice(p.price));

  const curatedDesignerResults = await Promise.all(
    CURATED_BRAND_SLUGS.map(async (slug) => {
      return withHomepageRailTimeout(`brandrail:curated:${slug}`, BRAND_RPC_TIMEOUT_MS, async () => {
        const designer = await fetchDesignerBySlug(slug);
        if (!designer) return null;
        const products = await fetchProductsByBrandWithImages(slug, 12, homeBrandOpts);
        const heroProduct = pickEditorialProduct(products);
        const withHero = heroProduct?.imageUrl ? { ...designer, heroImageUrl: heroProduct.imageUrl } : designer;
        if (designer.naturalFiberPercent != null) return withHero;
        const score = getCuratedScore(designer.name);
        return score != null ? { ...withHero, naturalFiberPercent: score } : withHero;
      }, null);
    })
  );
  const curatedDesigners = curatedDesignerResults.filter(Boolean);

  const newInBrandSlugs = [
    "frame", "vince", "rag-and-bone", "theory", "l-agence",
    "khaite", "toteme", "loro-piana", "staud", "ganni",
    "velvet", "isabel-marant", "re-done", "citizens-of-humanity",
    "fleur-du-mal", "a-l-c", "faithfull-the-brand",
    "johnny-was", "ramy-brook", "rails", "free-people",
    "paige", "diesel", "splendid", "7-for-all-mankind",
  ];

  const brandProductLists = await Promise.all(
    newInBrandSlugs.map((slug) =>
      withHomepageRailTimeout(`brandrail:new-in:${slug}`, BRAND_RPC_TIMEOUT_MS, async () => {
        return fetchProductsByBrandWithImages(slug, NEW_IN_FETCH_PER_BRAND, homeBrandOpts);
      }, [])
    )
  );

  const seenIds = new Set<string>();
  const seenBaseNames = new Set<string>();
  const newInProducts: any[] = [];
  const maxPerBrand = 3;
  const heroCategories = new Set(["dresses", "outerwear", "knitwear", "jumpsuits"]);
  const editorialCategories = new Set(["dresses", "outerwear", "knitwear", "skirts", "jumpsuits", "lingerie", "swimwear", "tops"]);
  const basicPatterns =
    /\b(t-shirt|tee|sweatshirt|tank top|vest|cargo|jogger|hoodie|henley|polo|baseball|cap|beanie|sock|belt|scarf|glove|wallet|bag|hat|mask)\b/i;
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
      const aBasic = basicPatterns.test(a.name) || basicNamePatterns.test(a.name) ? 1 : 0;
      const bBasic = basicPatterns.test(b.name) || basicNamePatterns.test(b.name) ? 1 : 0;
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
      const pSlug = p.brandSlug || "";
      if (pSlug === "isabel-marant" && p.imageUrl) {
        if (!p.imageUrl.includes("-E.")) continue;
      }
      seenIds.add(p.id);
      seenBaseNames.add(baseName);
      queue.push(p);
    }
    if (queue.length > 0) brandQueues.push(queue);
  }

  let round = 0;
  const tNewInCompose = Date.now();
  while (newInProducts.length < NEW_IN_TARGET_ITEMS) {
    let added = false;
    for (const queue of brandQueues) {
      if (round < queue.length) {
        newInProducts.push(queue[round]);
        added = true;
        if (newInProducts.length >= NEW_IN_TARGET_ITEMS) break;
      }
    }
    if (!added) break;
    round++;
  }
  homepageTiming("phase:new-in-compose", tNewInCompose, `items=${newInProducts.length}`);

  const silkEditorialProduct = pickEditorialProduct(silkProducts as any[]);
  const linenEditorialProduct = pickEditorialProduct(linenProducts as any[]);

  return {
    designers,
    productCount: 0,
    cashmereProducts,
    silkProducts,
    vacationProducts,
    linenProducts,
    silkEditorialProduct,
    linenEditorialProduct,
    productCountByBrand: {},
    curatedDesigners,
    newInProducts,
    saleProducts,
  };
}
