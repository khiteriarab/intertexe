import {
  fetchDesigners,
  fetchDesignersBySlugs,
  fetchProductsByFiber,
  fetchProductsByBrandWithImages,
  fetchSaleProducts,
  fetchSilkEditProducts,
  fetchVacationShopProducts,
  type Product,
  type CatalogFetchOpts,
} from "./supabase-server";
import { getCuratedScore } from "./curated-quality-scores";
import { CURATED_BRAND_SLUGS } from "./homepage-constants";
import { isEditorialWomensApparel } from "./catalog-product-filters";
import { EDITORIAL_HERO } from "./editorial-assets";
import { unstable_cache } from "next/cache";
import {
  MERCH_RAIL_KEYS,
  fetchMerchRailsBatch,
  fetchMerchRailDisplayCount,
  isMerchFeedEnabled,
} from "./merch-feed";
import { getCachedPlatformStats } from "./cached-catalog";
import { enrichDesignersWithHeroImages } from "./brand-hero-selection";
import { getServerSupabase } from "./supabase-service-client";
import { filterHomepageSaleProducts } from "./homepage-sale-filter";

/** Set `HOMEPAGE_USE_CATALOG_RPC_FOR_RAILS=1` to force catalog RPC on rails (slower). Default: live_products_apparel only. */
const HOMEPAGE_USE_CATALOG_RPC = process.env.HOMEPAGE_USE_CATALOG_RPC_FOR_RAILS === "1";

/** Small fetches only — homepage must not scan large slices of catalog. */
const MATERIAL_RAIL_FETCH_LIMIT = 64;
const MATERIAL_RAIL_DISPLAY_MAX = 50;
/** Homepage rails are curated previews only — keep small for fast SSR. */
const MERCH_HOME_FETCH_LIMIT = 16;
const MATERIAL_DIVERSITY_MAX_PER_BRAND = 2;
const HOMEPAGE_BRAND_LIVE_ROW_CAP = 24;
/** New In: few brands × small cap to avoid dozens of parallel SSR queries. */
const NEW_IN_BRAND_SLUGS = [
  "frame", "vince", "theory", "toteme", "ganni", "staud", "khaite", "isabel-marant",
] as const;
const NEW_IN_FETCH_PER_BRAND = 14;
const NEW_IN_TARGET_ITEMS = 24;
const HOMEPAGE_SALE_FETCH_LIMIT = 48;
const HOMEPAGE_SALE_MAX_SOURCE_ROWS = 180;
const DESIGNERS_FETCH_LIMIT = 48;

const RAIL_TIMEOUT_MS = 3800;
const BRAND_FETCH_TIMEOUT_MS = 2800;
const CURATED_SECTION_TIMEOUT_MS = 4500;
const DESIGNERS_TIMEOUT_MS = 3200;

const homeRailOpts: CatalogFetchOpts = {
  preferLiveOnly: !HOMEPAGE_USE_CATALOG_RPC,
};

const homeBrandOpts: CatalogFetchOpts = {
  preferLiveOnly: !HOMEPAGE_USE_CATALOG_RPC,
  liveRowCap: HOMEPAGE_BRAND_LIVE_ROW_CAP,
};

export { CURATED_BRAND_SLUGS };

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
      if (!isEditorialWomensApparel(p)) score -= 25;
      if (/\b(jacket|blazer|coat|trouser|pant|tee|polo)\b/.test(name) && cat !== "dresses") score -= 15;
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

export interface HomePageData {
  designers: any[];
  productCount: number;
  brandCount: number;
  productCountByBrand: Record<string, number>;
  curatedDesigners: any[];
  newInProducts: any[];
  newInCount: number;
  vacationProducts: any[];
  eveningProducts: any[];
  tailoringProducts: any[];
  summerInCityProducts: any[];
  whiteEditProducts: any[];
  saleProducts: any[];
}

function postProcessHomepageMaterialRail(products: Product[]): Product[] {
  return diversifyByBrand(
    products.filter((x) => !isZeroPrice(x.price)),
    MATERIAL_RAIL_DISPLAY_MAX,
    MATERIAL_DIVERSITY_MAX_PER_BRAND
  );
}

async function fetchCuratedDesignersFast(): Promise<any[]> {
  const list = await fetchDesignersBySlugs([...CURATED_BRAND_SLUGS]);
  const bySlug = new Map(list.map((d) => [d.slug, d]));
  const curated = CURATED_BRAND_SLUGS.map((slug) => {
    const d = bySlug.get(slug);
    if (!d) return null;
    if (d.naturalFiberPercent != null) return d;
    const score = getCuratedScore(d.name);
    return score != null ? { ...d, naturalFiberPercent: score } : d;
  }).filter(Boolean) as any[];

  const supabase = getServerSupabase();
  if (!supabase || curated.length === 0) return curated;
  return enrichDesignersWithHeroImages(
    supabase,
    curated.map((d: any) => ({
      ...d,
      hero_image: d.heroImage ?? null,
    }))
  );
}

async function getHomePageDataFromFeedCache(): Promise<HomePageData> {
  const t0 = Date.now();
  const railKeys = [
    MERCH_RAIL_KEYS.newIn,
    MERCH_RAIL_KEYS.vacation,
    MERCH_RAIL_KEYS.evening,
    MERCH_RAIL_KEYS.tailoring,
    MERCH_RAIL_KEYS.summerInCity,
    MERCH_RAIL_KEYS.whiteEdit,
    MERCH_RAIL_KEYS.sale,
  ] as const;

  const [curatedDesigners, platformStats, railsByKey, newInCount] = await Promise.all([
    withHomepageRailTimeout("rail:curated-designers", CURATED_SECTION_TIMEOUT_MS, fetchCuratedDesignersFast, []),
    withHomepageRailTimeout(
      "platform-stats",
      8_000,
      () => getCachedPlatformStats(),
      { productCount: 84_704, brandCount: 99 }
    ),
    withHomepageRailTimeout(
      "rail:batch",
      RAIL_TIMEOUT_MS,
      () => fetchMerchRailsBatch([...railKeys], MERCH_HOME_FETCH_LIMIT),
      {} as Record<string, Product[]>
    ),
    withHomepageRailTimeout(
      "rail:new-in-count",
      2_500,
      () => fetchMerchRailDisplayCount(MERCH_RAIL_KEYS.newIn),
      0
    ),
  ]);

  const newInProducts = postProcessHomepageMaterialRail(railsByKey[MERCH_RAIL_KEYS.newIn] || []);
  const vacationProducts = postProcessHomepageMaterialRail(railsByKey[MERCH_RAIL_KEYS.vacation] || []);
  const eveningProducts = postProcessHomepageMaterialRail(railsByKey[MERCH_RAIL_KEYS.evening] || []);
  const tailoringProducts = postProcessHomepageMaterialRail(railsByKey[MERCH_RAIL_KEYS.tailoring] || []);
  const summerInCityProducts = postProcessHomepageMaterialRail(railsByKey[MERCH_RAIL_KEYS.summerInCity] || []);
  const whiteEditProducts = postProcessHomepageMaterialRail(railsByKey[MERCH_RAIL_KEYS.whiteEdit] || []);
  const saleProducts = filterHomepageSaleProducts(
    railsByKey[MERCH_RAIL_KEYS.sale] || [],
    MERCH_HOME_FETCH_LIMIT
  );

  console.log(
    "[merch-feed] homepage payload:",
    `new-in=${newInProducts.length}`,
    `vacation=${vacationProducts.length}`,
    `evening=${eveningProducts.length}`,
    `tailoring=${tailoringProducts.length}`,
    `summer-in-city=${summerInCityProducts.length}`,
    `white-edit=${whiteEditProducts.length}`,
    `sale=${saleProducts.length}`,
    `ms=${Date.now() - t0}`
  );

  return {
    designers: [],
    productCount: platformStats.productCount,
    brandCount: platformStats.brandCount,
    productCountByBrand: {},
    curatedDesigners,
    newInProducts,
    newInCount,
    vacationProducts,
    eveningProducts,
    tailoringProducts,
    summerInCityProducts,
    whiteEditProducts,
    saleProducts,
  };
}

export async function getHomePageData(): Promise<HomePageData> {
  if (isMerchFeedEnabled()) {
    return getHomePageDataFromFeedCache();
  }

  const [designers, vacationProducts, saleResult, curatedDesigners, platformStats, brandProductLists] = await Promise.all([
    withHomepageRailTimeout(
      "rail:designers",
      DESIGNERS_TIMEOUT_MS,
      () => fetchDesigners(undefined, DESIGNERS_FETCH_LIMIT),
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
      "rail:sale",
      RAIL_TIMEOUT_MS,
      () =>
        fetchSaleProducts({
          limit: HOMEPAGE_SALE_FETCH_LIMIT,
          offset: 0,
          maxSourceRows: HOMEPAGE_SALE_MAX_SOURCE_ROWS,
          useMerchFeedPreview: true,
        }),
      { products: [], total: 0 }
    ),
    withHomepageRailTimeout("rail:curated-designers", CURATED_SECTION_TIMEOUT_MS, fetchCuratedDesignersFast, []),
    getCachedPlatformStats(),
    Promise.all(
      [...NEW_IN_BRAND_SLUGS].map((slug) =>
        withHomepageRailTimeout(`brandrail:new-in:${slug}`, BRAND_FETCH_TIMEOUT_MS, async () => {
          return fetchProductsByBrandWithImages(slug, NEW_IN_FETCH_PER_BRAND, homeBrandOpts);
        }, [])
      )
    ),
  ]);

  const saleProducts = filterHomepageSaleProducts(
    (saleResult.products || []).filter((p) => !isZeroPrice(p.price)),
    MERCH_HOME_FETCH_LIMIT
  );
  const seenIds = new Set<string>();
  const seenBaseNames = new Set<string>();
  const newInProducts: any[] = [];
  const maxPerBrand = 2;
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

  return {
    designers,
    productCount: platformStats.productCount,
    brandCount: platformStats.brandCount,
    productCountByBrand: {},
    curatedDesigners,
    newInProducts,
    newInCount: newInProducts.length,
    vacationProducts,
    eveningProducts: [] as Product[],
    tailoringProducts: [] as Product[],
    summerInCityProducts: [] as Product[],
    whiteEditProducts: [] as Product[],
    saleProducts,
  };
}

/** Whole homepage payload cached — avoids rebuilding rails on every navigation. */
export const getCachedHomePageData = unstable_cache(
  async () => getHomePageData(),
  ["homepage-payload-v5"],
  { revalidate: 300, tags: ["homepage"] }
);
