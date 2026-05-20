import {
  fetchDesignersBySlugs,
  fetchHomepageMaterialRailsPool,
  buildHomepageMaterialRailsFromPool,
  fetchHomepageNewInRailProducts,
  fetchHomepageSaleRailProducts,
  fetchHomepageGenericRailProducts,
  type Product,
} from "./supabase-server";
import { getCuratedScore } from "./curated-quality-scores";
import { CURATED_BRAND_SLUGS } from "./homepage-constants";

/** Small fetches only — homepage must not scan large slices of catalog. */
const MATERIAL_RAIL_FETCH_LIMIT = 24;
const MATERIAL_POOL_LIMIT = 96;
const MATERIAL_RAIL_DISPLAY_MAX = 10;
const MATERIAL_DIVERSITY_MAX_PER_BRAND = 2;
const GENERIC_FALLBACK_LIMIT = 48;
/** New In: one batched live query across these brand slugs. */
const NEW_IN_BRAND_SLUGS = [
  "frame", "vince", "theory", "toteme", "ganni", "staud", "khaite", "isabel-marant",
] as const;
const NEW_IN_FETCH_LIMIT = 32;
const NEW_IN_TARGET_ITEMS = 8;
const HOMEPAGE_SALE_FETCH_LIMIT = 16;

const RAIL_TIMEOUT_MS = 4500;
const CURATED_SECTION_TIMEOUT_MS = 4500;

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

function postProcessHomepageMaterialRail(products: Product[]): Product[] {
  const priced = products.filter((x) => !isZeroPrice(x.price));
  const out = diversifyByBrand(priced, MATERIAL_RAIL_DISPLAY_MAX, MATERIAL_DIVERSITY_MAX_PER_BRAND);
  console.log(
    `[homepage-rail] post-process: in=${products.length} priced=${priced.length} out=${out.length}`
  );
  return out;
}

function fillEmptyRailsFromGeneric(
  rails: Record<"silk" | "cashmere" | "linen" | "vacation", Product[]>,
  generic: Product[]
): void {
  const slice = generic.slice(0, MATERIAL_RAIL_DISPLAY_MAX);
  for (const key of ["silk", "cashmere", "linen", "vacation"] as const) {
    if (rails[key].length === 0 && slice.length > 0) {
      console.warn(`[homepage-rail] ${key}: filled from shared generic pool`);
      rails[key] = slice;
    }
  }
}

async function fetchCuratedDesignersFast(): Promise<any[]> {
  const list = await fetchDesignersBySlugs([...CURATED_BRAND_SLUGS]);
  return list.map((d) => {
    if (d.naturalFiberPercent != null) return d;
    const score = getCuratedScore(d.name);
    return score != null ? { ...d, naturalFiberPercent: score } : d;
  });
}

/**
 * Homepage SSR: sequential Supabase reads (no parallel fan-out), one pool query for
 * silk/cashmere/linen/vacation, at most one generic fallback for empty rails.
 */
export async function getHomePageData(): Promise<HomePageData> {
  const curatedDesigners = await withHomepageRailTimeout(
    "rail:curated-designers",
    CURATED_SECTION_TIMEOUT_MS,
    fetchCuratedDesignersFast,
    []
  );

  const poolRows = await withHomepageRailTimeout(
    "rail:material-pool",
    RAIL_TIMEOUT_MS,
    () => fetchHomepageMaterialRailsPool(MATERIAL_POOL_LIMIT),
    []
  );
  const split = buildHomepageMaterialRailsFromPool(poolRows, MATERIAL_RAIL_FETCH_LIMIT);
  const rails = {
    silk: postProcessHomepageMaterialRail(split.silk),
    cashmere: postProcessHomepageMaterialRail(split.cashmere),
    linen: postProcessHomepageMaterialRail(split.linen),
    vacation: postProcessHomepageMaterialRail(split.vacation),
  };

  const anyEmpty =
    !rails.silk.length ||
    !rails.cashmere.length ||
    !rails.linen.length ||
    !rails.vacation.length;
  if (anyEmpty) {
    console.warn("[homepage-rail] material rails: shared generic fallback (single query)");
    const generic = postProcessHomepageMaterialRail(
      await fetchHomepageGenericRailProducts(GENERIC_FALLBACK_LIMIT)
    );
    fillEmptyRailsFromGeneric(rails, generic);
  }

  let newInProducts = await withHomepageRailTimeout(
    "rail:new-in",
    RAIL_TIMEOUT_MS,
    async () => {
      let items = postProcessHomepageMaterialRail(
        await fetchHomepageNewInRailProducts([...NEW_IN_BRAND_SLUGS], NEW_IN_FETCH_LIMIT)
      ).slice(0, NEW_IN_TARGET_ITEMS);
      if (items.length > 0) return items;
      console.warn("[homepage-rail] new-in: trying generic fallback");
      return postProcessHomepageMaterialRail(
        await fetchHomepageGenericRailProducts(NEW_IN_FETCH_LIMIT)
      ).slice(0, NEW_IN_TARGET_ITEMS);
    },
    []
  );

  let saleProducts = await withHomepageRailTimeout(
    "rail:sale",
    RAIL_TIMEOUT_MS,
    async () => {
      let items = (await fetchHomepageSaleRailProducts(HOMEPAGE_SALE_FETCH_LIMIT)).filter(
        (p) => !isZeroPrice(p.price)
      );
      if (items.length > 0) return items;
      console.warn("[homepage-rail] sale: trying generic fallback");
      return postProcessHomepageMaterialRail(
        await fetchHomepageGenericRailProducts(HOMEPAGE_SALE_FETCH_LIMIT)
      ).slice(0, HOMEPAGE_SALE_FETCH_LIMIT);
    },
    []
  );

  const silkEditorialProduct = pickEditorialProduct(rails.silk as any[]);
  const linenEditorialProduct = pickEditorialProduct(rails.linen as any[]);

  return {
    designers: curatedDesigners,
    productCount: 0,
    cashmereProducts: rails.cashmere,
    silkProducts: rails.silk,
    vacationProducts: rails.vacation,
    linenProducts: rails.linen,
    silkEditorialProduct,
    linenEditorialProduct,
    productCountByBrand: {},
    curatedDesigners,
    newInProducts,
    saleProducts,
  };
}
