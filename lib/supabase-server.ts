import { unstable_cache } from "next/cache";
import { type SupabaseClient } from "@supabase/supabase-js";
import { sanitizeBrandName } from "./brand-display";
import { displayNaturalFiberPercent } from "./display-natural-fiber";
import {
  consumerExclusionForProduct,
  consumerExclusionForRow,
  filterConsumerCatalogProducts,
} from "./catalog-consumer-guard";

/** Service client without generated `Database` types — catalog RPCs are not declared on the default client. */
type UntypedSupabase = SupabaseClient<any, "public", any>;
import { logSupabaseTiming } from "./supabase-timing";
import {
  garmentTypesForShopCategory,
  materialPrimaryForShopFiber,
  rowMatchesGarmentFilter,
  applyCategoryFilter,
} from "./catalog-shop-mappings";
import {
  productMatchesAnyShopCategory,
  productMatchesShopPrice,
  type ShopPriceCap,
} from "./shop-client-filters";
import {
  isCatalogTimeoutError,
  CATALOG_MAX_OFFSET,
  safeCatalogOffset,
} from "./catalog-fetch-limits";
import {
  CATALOG_INITIAL_PAGE,
  CATALOG_PAGE_SIZE,
  classifyGarment,
  catalogDedupeKey,
  catalogDedupeKeyFromProduct,
  dedupeCatalogProducts,
  dedupeCatalogRows,
  offerCompletenessStatus,
  rowMatchesShopFiber,
} from "./catalog-rules";
import {
  isEditorialWomensApparel,
  isVacationResortPiece,
  isZegnaWomensPiece,
  productBodyMatchesFiber,
} from "./catalog-product-filters";
import { fetchShoppableBrands, SHOPPABLE_MIN_PRODUCTS } from "./shoppable-brands";
import { isMensCatalogRow, isMensOnlyBrand } from "./womens-catalog-guard";
import { filterProductsByFiberSubtypes } from "./fiber-subtypes";
import {
  CATALOG_CA_MIN_PRODUCTS,
  mergeProductsWithRegionFallback,
} from "./catalog-region-fallback";
import { normalizeCatalogRegion } from "./shipping-regions";
import { liveProductsApparelFrom } from "./global-catalog-scope";

export { CATALOG_INITIAL_PAGE, CATALOG_PAGE_SIZE };


/** When `preferLiveOnly`, skip catalog RPCs and query `live_products_apparel` (faster homepage / emergency path).
 *  `liveRowCap` limits rows loaded on the live-only / fallback path (homepage). */
export type CatalogFetchOpts = {
  preferLiveOnly?: boolean;
  liveRowCap?: number;
};

import { getServerSupabase } from "./supabase-service-client";
export { getServerSupabase };

export interface Designer {
  id: string;
  name: string;
  slug: string;
  status: string;
  naturalFiberPercent: number | null;
  description: string | null;
  website: string | null;
  createdAt: string | null;
  heroImage?: string | null;
}

export interface Product {
  id: string;
  brandSlug: string;
  brandName: string;
  name: string;
  productId: string;
  url: string;
  imageUrl: string;
  price: string;
  composition: string;
  naturalFiberPercent: number;
  category: string;
  color?: string | null;
  matchingSetId?: string | null;
  stockStatus?: string | null;
  isSale?: boolean;
  originalPrice?: string | null;
  /** Used for formatting bare numeric DB prices ($ / € / £). */
  listingRegion?: string | null;
  collectionSlugs?: string[];
  fiberSubtypeLabel?: string | null;
}

const DESIGNER_PRODUCT_SLUG_ALIASES: Record<string, string> = {
  "isabel-marant-etoile": "isabel-marant",
  "isabelmarant": "isabel-marant",
  "isabel_marant": "isabel-marant",
  "-toile-isabel-marant": "isabel-marant",
  "rag-bone": "rag-and-bone",
  ragbone: "rag-and-bone",
  lagence: "l-agence",
  faithfull: "faithfull-the-brand",
};

export function canonicalDesignerProductSlug(slug: string): string {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return normalized;
  return DESIGNER_PRODUCT_SLUG_ALIASES[normalized] || normalized;
}

type MarketFilter = "us-ca" | "eu-uk-me";

const WOMEN_FASHION_BRAND_SLUGS = new Set([
  "7-for-all-mankind",
  "a-l-c-", "a-l-c", "agolde", "aje", "amanda-uprichard", "anine-bing", "anne-klein", "astr",
  "bella-dahl", "camilla-and-marc", "cece", "citizens-of-humanity", "cleobella", "club-monaco",
  "derek-lam", "diesel", "dissh", "dl1961", "elan", "esse-studios",
  "faithfull-the-brand", "fleur-du-mal", "frame", "free-people", "grlfrnd",
  "hale-bob", "hutch", "isabel-marant",
  "j-mclaughlin", "joes-jeans", "johnny-was", "joseph",
  "khaite", "l-agence", "lafayette-148", "lilla-p",
  "marie-oliver", "mother", "nation-ltd", "nic-and-zoe", "nicole-miller", "nili-lotan", "nydj",
  "paige", "pj-salvage", "pistola",
  "rachel-comey", "rag-and-bone", "rails", "ramy-brook", "re-done", "rebecca-taylor", "reformation", "rixo",
  "sanctuary", "sandro", "sea-new-york", "something-navy", "splendid", "st-agni",
  "tanya-taylor", "ted-baker", "the-kooples", "theory", "tibi", "toteme", "trina-turk",
  "ulla-johnson", "veda", "velvet-by-graham-spencer", "veronica-beard", "vince",
  "cult-gaia", "stine-goya"
]);

const MYTHERESA_PRODUCT_PREFIXES: Record<MarketFilter, string> = {
  "us-ca": "mytheresa-us-ca-",
  "eu-uk-me": "mytheresa-eu-uk-me-",
};

function applyCatalogFilter(query: any, market?: string) {
  const brandSlugs = [...WOMEN_FASHION_BRAND_SLUGS].join(",");
  if (market === "us-ca") {
    return (query as any)
      .not("product_id", "ilike", `${MYTHERESA_PRODUCT_PREFIXES["eu-uk-me"]}%`)
      .not("price", "ilike", "\u00A3%")
      .not("price", "ilike", "\u20AC%");
  }
  if (market === "eu-uk-me") {
    return (query as any).or(
      `product_id.ilike.${MYTHERESA_PRODUCT_PREFIXES["eu-uk-me"]}%,price.ilike.\u00A3%,price.ilike.\u20AC%`
    );
  }
  return (query as any).or(`brand_slug.in.(${brandSlugs}),product_id.ilike.mytheresa-%`);
}

/** Region params for Postgres catalog_list / editorial RPCs (see docs/SHARED_CATALOG.md). */
export function catalogRegionsFromMarket(
  market?: string,
  catalogRegion?: string
): { preferred: string; fallback: string } {
  const explicit = normalizeCatalogRegion(catalogRegion);
  if (explicit === "ca") return { preferred: "ca", fallback: "us" };
  const m = String(market || "").toLowerCase();
  if (m === "eu" || m === "eu-uk-me") return { preferred: "eu", fallback: "us" };
  if (m === "uk" || m === "gb") return { preferred: "uk", fallback: "us" };
  return { preferred: "us", fallback: "us" };
}

function passesMarketRawRow(row: any, market?: string): boolean {
  if (market == null || market === "" || market === "all") return true;

  const productId = String(row.product_id || "").toLowerCase();
  const price = String(row.price || "");

  if (market === "us-ca") {
    if (productId.startsWith(MYTHERESA_PRODUCT_PREFIXES["eu-uk-me"])) return false;
    if (/^[£€\u00A3\u20AC]/.test(price.trim()) || price.includes("£") || price.includes("€")) return false;
    return true;
  }
  if (market === "eu-uk-me") {
    if (productId.startsWith(MYTHERESA_PRODUCT_PREFIXES["eu-uk-me"])) return true;
    return price.includes("£") || price.includes("€") || price.includes("\u00A3") || price.includes("\u20AC");
  }

  const brandSlug = String(row.brand_slug || "").toLowerCase();
  if (productId.includes("mytheresa")) return true;
  return WOMEN_FASHION_BRAND_SLUGS.has(brandSlug);
}

function dedupeLiveApparelRows(rows: any[], preferred: string, fallback: string): any[] {
  return dedupeCatalogRows(rows, preferred, fallback);
}

async function rpcCatalogList(
  supabase: UntypedSupabase,
  args: {
    preferred: string;
    fallback: string;
    fiber?: string | null;
    category?: string | null;
    brandSlug?: string | null;
    search?: string | null;
    minNfp?: number;
    limit: number;
    offset: number;
  }
): Promise<any[] | null> {
  const tRpc = Date.now();
  try {
    const { data, error } = await supabase.rpc("catalog_list", {
      p_preferred_region: args.preferred,
      p_fallback_region: args.fallback,
      p_fiber: args.fiber && String(args.fiber).trim() ? args.fiber : null,
      p_category: args.category && String(args.category).trim() ? args.category : null,
      p_brand_slug: args.brandSlug && String(args.brandSlug).trim() ? args.brandSlug : null,
      p_search: args.search && String(args.search).trim() ? args.search : null,
      p_min_nfp: args.minNfp ?? 80,
      p_limit: args.limit,
      p_offset: args.offset,
    });
    logSupabaseTiming(
      `rpc catalog_list fiber=${args.fiber ?? "-"} cat=${args.category ?? "-"} brand=${args.brandSlug ?? "-"}`,
      tRpc,
      error ? `error:${error.message}` : `rows:${(data || []).length}`
    );
    if (error) {
      if (isCatalogTimeoutError(error)) {
        console.warn("catalog_list RPC timed out, using live_products_apparel fallback");
        return null;
      }
      console.warn("catalog_list RPC failed, using live_products_apparel fallback:", error.message);
      return null;
    }
    const rows = (data || []) as any[];
    if (rows.length === 0) return rows;
    const deduped = dedupeCatalogRows(rows, args.preferred, args.fallback);
    const seen = new Set<string>();
    return deduped.filter((row) => {
      const key = catalogDedupeKey(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logSupabaseTiming(
      `rpc catalog_list fiber=${args.fiber ?? "-"} cat=${args.category ?? "-"} brand=${args.brandSlug ?? "-"}`,
      tRpc,
      `threw:${message}`
    );
    console.warn("catalog_list RPC threw, using live_products_apparel fallback:", message);
    return null;
  }
}

async function rpcCatalogListCount(
  supabase: UntypedSupabase,
  args: {
    preferred: string;
    fallback: string;
    fiber?: string | null;
    category?: string | null;
    brandSlug?: string | null;
    search?: string | null;
    minNfp?: number;
  }
): Promise<number | null> {
  const tRpc = Date.now();
  try {
    const { data, error } = await supabase.rpc("catalog_list_count", {
      p_preferred_region: args.preferred,
      p_fallback_region: args.fallback,
      p_fiber: args.fiber && String(args.fiber).trim() ? args.fiber : null,
      p_category: args.category && String(args.category).trim() ? args.category : null,
      p_brand_slug: args.brandSlug && String(args.brandSlug).trim() ? args.brandSlug : null,
      p_search: args.search && String(args.search).trim() ? args.search : null,
      p_min_nfp: args.minNfp ?? 80,
    });
    logSupabaseTiming(
      `rpc catalog_list_count fiber=${args.fiber ?? "-"} brand=${args.brandSlug ?? "-"}`,
      tRpc,
      error ? `error:${error.message}` : `count:${data}`
    );
    if (error) return null;
    const n = typeof data === "number" ? data : Number(data);
    return Number.isFinite(n) ? n : null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logSupabaseTiming(
      `rpc catalog_list_count fiber=${args.fiber ?? "-"} brand=${args.brandSlug ?? "-"}`,
      tRpc,
      `threw:${message}`
    );
    console.warn("catalog_list_count RPC threw, using fallback:", message);
    return null;
  }
}

/** Fast exact count on live_products_apparel — production-safe when catalog_list_count RPC is missing. */
async function countLiveProductsApparel(
  supabase: UntypedSupabase,
  opts: {
    region?: string;
    brandSlug?: string | null;
    fiber?: string | null;
    minNfp?: number;
  }
): Promise<number> {
  const region = opts.region || "us";
  const minNfp = opts.minNfp ?? 80;
  let q = liveProductsApparelFrom(supabase)
    
    .select("*", { count: "exact", head: true })
    .eq("region", region)
    .gte("natural_fiber_percent", minNfp);

  if (opts.brandSlug) {
    q = q.eq("brand_slug", opts.brandSlug);
  }

  const material = opts.fiber ? materialPrimaryForShopFiber(opts.fiber) || opts.fiber : null;
  if (material === "leather_suede") {
    q = q.or("composition.ilike.%leather%,composition.ilike.%suede%");
  } else if (material) {
    q = q.ilike("composition", `%${material}%`);
  }

  const { count, error } = await q;
  if (error) {
    console.warn("[countLiveProductsApparel]", error.message);
    return 0;
  }
  return count ?? 0;
}

function rowMatchesCompositionFiber(material: string, row: { composition?: string | null }): boolean {
  const comp = String(row.composition || "").toLowerCase();
  if (material === "leather_suede") {
    return comp.includes("leather") || comp.includes("suede");
  }
  return comp.includes(material);
}

/** Map live apparel rows for material hubs — full catalog, no consumer/curated narrowing. */
function mapFiberHubCatalogRows(rows: any[], category?: string): Product[] {
  let filtered = rows;
  if (category) {
    filtered = filtered.filter((row: any) =>
      rowMatchesGarmentFilter(
        { garment_type: row.garment_type || classifyGarment(row.category, row.name) },
        category
      )
    );
  }
  return dedupeCatalogRows(filtered, "us", "us").map(mapProductRow);
}

/** Fiber / category grids (materials hubs) — full live_products_apparel catalog, US region. */
export async function fetchCatalogProductsByFiber(opts: {
  fiber: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<Product[]> {
  const supabase = getServerSupabase();
  const { fiber, category, limit = 200, offset = 0 } = opts;
  if (!supabase) return [];
  const normalizedFiber = materialPrimaryForShopFiber(fiber) || fiber.toLowerCase();
  const rangeEnd = offset + limit - 1;
  const t0 = Date.now();
  let rows: any[] = [];

  let query = liveProductsApparelFrom(supabase)
    
    .select("*")
    .eq("region", "us")
    .gte("natural_fiber_percent", 80);

  if (normalizedFiber === "leather_suede") {
    query = query.or("composition.ilike.%leather%,composition.ilike.%suede%");
  } else {
    query = query.ilike("composition", `%${normalizedFiber}%`);
  }

  const scanEnd = category ? Math.min(offset + limit * 30, 14999) : rangeEnd;
  const scanStart = category ? 0 : offset;
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(scanStart, scanEnd);
  logSupabaseTiming(
    `fetchCatalogProductsByFiber live fiber=${normalizedFiber}${category ? ` category=${category}` : ""}`,
    t0,
    `rows:${(data || []).length} err:${error?.message || "none"}`
  );

  rows = data || [];
  if (!category && (error || rows.length === 0)) {
    rows = await catalogListLiveFallback(supabase, {
      fiber: normalizedFiber,
      limit,
      offset,
      minNfp: 80,
      preferred: "us",
      fallback: "us",
      requireOfferComplete: false,
    });
  }

  const mapped = mapFiberHubCatalogRows(rows, category);
  return category ? mapped.slice(offset, offset + limit) : mapped;
}

/** Paginated fallback when catalog_list RPC is missing — shared rules + dedupe. */
async function catalogListLiveFallback(
  supabase: UntypedSupabase,
  opts: {
    fiber?: string | null;
    category?: string | null;
    brandSlug?: string | null;
    search?: string | null;
    limit: number;
    offset: number;
    minNfp?: number;
    preferred?: string;
    fallback?: string;
    /** When false, include rows that fail offer completeness (material hubs need volume). */
    requireOfferComplete?: boolean;
  }
): Promise<any[]> {
  const preferred = opts.preferred || "us";
  const fallback = opts.fallback || "us";
  const chunkSize = 500;
  const need = opts.offset + opts.limit;
  const winners: any[] = [];
  const seenKeys = new Set<string>();
  let dbOffset = 0;

  while (winners.length < need && dbOffset < 50000) {
    let q = liveProductsApparelFrom(supabase)
      
      .select("*")
      .gte("natural_fiber_percent", opts.minNfp ?? 80);
    if (preferred) q = q.eq("region", preferred);
    const material = materialPrimaryForShopFiber(opts.fiber);
    if (material) q = q.ilike("composition", `%${material}%`);
    if (opts.brandSlug) q = q.eq("brand_slug", opts.brandSlug);
    if (opts.search?.trim()) {
      const s = opts.search.trim();
      q = q.or(`name.ilike.%${s}%,brand_name.ilike.%${s}%,composition.ilike.%${s}%`);
    }
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(dbOffset, dbOffset + chunkSize - 1);
    if (error || !data?.length) break;
    dbOffset += data.length;

    const filtered =
      opts.requireOfferComplete === false
        ? data
        : data.filter((row: any) => offerCompletenessStatus(row) === "complete");
    const fiberMatched = material
      ? filtered.filter((row: any) => rowMatchesCompositionFiber(material, row))
      : filtered.filter((row: any) => rowMatchesShopFiber(opts.fiber, row));
    const garmentMatched = fiberMatched.filter((row: any) =>
      rowMatchesGarmentFilter(
        { garment_type: row.garment_type || classifyGarment(row.category, row.name) },
        opts.category
      )
    );
    const deduped = dedupeCatalogRows(garmentMatched, preferred, fallback);
    for (const row of deduped) {
      const key = catalogDedupeKey(row);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      winners.push(row);
    }
    if (data.length < chunkSize) break;
  }

  return winners.slice(opts.offset, opts.offset + opts.limit);
}

async function catalogListCountLiveFallback(
  supabase: UntypedSupabase,
  opts: {
    fiber?: string | null;
    category?: string | null;
    brandSlug?: string | null;
    search?: string | null;
    minNfp?: number;
    preferred?: string;
    fallback?: string;
  }
): Promise<number> {
  const rows = await catalogListLiveFallback(supabase, {
    ...opts,
    limit: 10000,
    offset: 0,
  });
  return rows.length;
}

/** Full-catalog count for shop filters — never fall back to page size. */
export async function resolveShopCatalogTotal(
  supabase: UntypedSupabase,
  opts: {
    preferred: string;
    fallback: string;
    fiber?: string | null;
    category?: string | null;
    brandSlug?: string | null;
    search?: string | null;
  }
): Promise<number> {
  const rpcTotal = await rpcCatalogListCount(supabase, {
    preferred: opts.preferred,
    fallback: opts.fallback,
    fiber: opts.fiber,
    category: opts.category,
    brandSlug: opts.brandSlug ?? null,
    search: opts.search,
    minNfp: 80,
  });
  if (rpcTotal != null && rpcTotal > 0) return rpcTotal;

  if (opts.fiber) {
    const hub = await fetchMaterialHubDisplayCount(opts.fiber, opts.category || undefined);
    if (hub > 0) return hub;
  }

  if (!opts.fiber && !opts.category && !opts.search) {
    const fibers = await fetchFiberCounts();
    const sum = Object.values(fibers).reduce((a, b) => a + (b || 0), 0);
    if (sum > 0) return sum;
    const global = await fetchProductCount();
    if (global > 0) return global;
  }

  const scanned = await catalogListCountLiveFallback(supabase, {
    fiber: opts.fiber,
    category: opts.category,
    search: opts.search,
    minNfp: 80,
    preferred: opts.preferred,
    fallback: opts.fallback,
  });
  return scanned > 0 ? scanned : 0;
}

export async function fetchSilkEditProducts(
  limit = 96,
  market?: string,
  opts?: CatalogFetchOpts
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { preferred, fallback } = catalogRegionsFromMarket(market);

  let rows: any[] = [];
  if (!opts?.preferLiveOnly) {
    const tRpc = Date.now();
    const { data, error } = await supabase.rpc("silk_edit_products", {
      p_preferred_region: preferred,
      p_limit: limit,
    });
    logSupabaseTiming(`rpc silk_edit_products limit=${limit}`, tRpc, error ? `error:${error.message}` : `rows:${(data || []).length}`);
    rows = (data || []) as any[];
    if (error || rows.length === 0) {
      const tLive = Date.now();
      const { data: fb } = await liveProductsApparelFrom(supabase)
        
        .select("*")
        .ilike("composition", "%silk%")
        .gte("natural_fiber_percent", 80)
        .order("natural_fiber_percent", { ascending: false })
        .limit(limit);
      logSupabaseTiming("live live_products_apparel silk_edit fallback", tLive, `rows:${(fb || []).length}`);
      rows = fb || [];
    }
  } else {
    const tLive = Date.now();
    const { data: fb } = await liveProductsApparelFrom(supabase)
      
      .select("*")
      .ilike("composition", "%silk%")
      .gte("natural_fiber_percent", 80)
      .order("natural_fiber_percent", { ascending: false })
      .limit(limit);
    logSupabaseTiming("live live_products_apparel silk homepage fast", tLive, `rows:${(fb || []).length}`);
    rows = fb || [];
  }

  rows = dedupeLiveApparelRows(rows, preferred, fallback);

  return rows
    .filter((row: any) => (market ? passesMarketRawRow(row, market) : true))
    .filter(isClothingProduct)
    .filter(isNotMensProduct)
    .map(mapProductRow);
}

function passesWomensCatalogRow(row: any): boolean {
  if (consumerExclusionForRow(row)) return false;
  return isClothingProduct(row) && isNotMensProduct(row) && isZegnaWomensPiece(row);
}

export async function fetchVacationShopProducts(
  limit = 96,
  market?: string,
  opts?: CatalogFetchOpts
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { preferred, fallback } = catalogRegionsFromMarket(market);

  let rows: any[] = [];
  if (!opts?.preferLiveOnly) {
    const tRpc = Date.now();
    const { data, error } = await supabase.rpc("vacation_edit_products", {
      p_preferred_region: preferred,
      p_limit: limit,
    });
    logSupabaseTiming(`rpc vacation_edit_products limit=${limit}`, tRpc, error ? `error:${error.message}` : `rows:${(data || []).length}`);
    rows = (data || []) as any[];
    if (error || rows.length === 0) {
      const tLive = Date.now();
      const { data: fb } = await liveProductsApparelFrom(supabase)
        
        .select("*")
        .or("composition.ilike.%linen%,composition.ilike.%cotton%,composition.ilike.%silk%")
        .gte("natural_fiber_percent", 80)
        .order("natural_fiber_percent", { ascending: false })
        .limit(limit);
      logSupabaseTiming("live live_products_apparel vacation_edit fallback", tLive, `rows:${(fb || []).length}`);
      rows = fb || [];
    }
  } else {
    const tLive = Date.now();
    const { data: fb } = await liveProductsApparelFrom(supabase)
      
      .select("*")
      .or("composition.ilike.%linen%,composition.ilike.%cotton%,composition.ilike.%silk%")
      .gte("natural_fiber_percent", 80)
      .order("natural_fiber_percent", { ascending: false })
      .limit(limit);
    logSupabaseTiming("live live_products_apparel vacation homepage fast", tLive, `rows:${(fb || []).length}`);
    rows = fb || [];
  }

  rows = dedupeLiveApparelRows(rows, preferred, fallback);

  return rows
    .filter((row: any) => (market ? passesMarketRawRow(row, market) : true))
    .filter(isClothingProduct)
    .filter(isNotMensProduct)
    .filter(isVacationResortPiece)
    .map(mapProductRow);
}

/** Dedicated Vacation Edit page — curated rail + linen dress/skirt catalog counts. */
export async function fetchVacationPageData(opts?: {
  editLimit?: number;
  catalogLimit?: number;
  category?: "dresses" | "skirts";
  offset?: number;
}): Promise<{
  editProducts: Product[];
  catalogProducts: Product[];
  catalogTotal: number;
  editCount: number;
  linenDressCount: number;
  linenSkirtCount: number;
}> {
  const editLimit = opts?.editLimit ?? 32;
  const catalogLimit = opts?.catalogLimit ?? 32;
  const offset = opts?.offset ?? 0;
  const category = opts?.category;

  const { fetchMerchRailProducts, MERCH_RAIL_KEYS, fetchMerchRailDisplayCount } = await import("./merch-feed");

  let editProducts = await fetchVacationShopProducts(Math.max(editLimit, 64));
  if (editProducts.length < 20) {
    const rail = await fetchMerchRailProducts(MERCH_RAIL_KEYS.vacation, { limit: 120 });
    const seen = new Set(editProducts.map((p) => p.productId || p.id));
    for (const p of rail.filter(isVacationResortPiece)) {
      const id = p.productId || p.id;
      if (!seen.has(id)) {
        seen.add(id);
        editProducts.push(p);
      }
    }
  }
  editProducts = editProducts.filter(isVacationResortPiece).slice(0, editLimit);

  const editCount = editProducts.length;

  const [linenDressCount, linenSkirtCount] = await Promise.all([
    fetchMaterialHubDisplayCount("linen", "dresses"),
    fetchMaterialHubDisplayCount("linen", "skirts"),
  ]);

  let catalogProducts: Product[] = [];
  let catalogTotal = 0;
  if (category) {
    const { queryLiveCatalog } = await import("./catalog-direct-query");
    const [linenResult, cottonResult] = await Promise.all([
      queryLiveCatalog({ region: "us", fiber: "linen", category, limit: catalogLimit * 2, offset }),
      queryLiveCatalog({ region: "us", fiber: "cotton", category, limit: catalogLimit * 2, offset: 0 }),
    ]);
    const seen = new Set<string>();
    catalogProducts = [];
    for (const p of [...linenResult.products, ...cottonResult.products]) {
      if (!isVacationResortPiece(p)) continue;
      const id = p.productId || p.id;
      if (seen.has(id)) continue;
      seen.add(id);
      catalogProducts.push(p);
    }
    catalogProducts = catalogProducts.slice(0, catalogLimit);
    catalogTotal = Math.max(linenResult.total ?? 0, 0) + Math.max(cottonResult.total ?? 0, 0);
  }

  return {
    editProducts,
    catalogProducts,
    catalogTotal,
    editCount: Math.max(editCount, editProducts.length),
    linenDressCount,
    linenSkirtCount,
  };
}

const EDIT_TO_COLLECTION_SLUG: Partial<Record<string, import("./collection-pages").CollectionSlug>> = {
  evening: "evening",
  tailoring: "tailoring",
  vacation: "vacation",
};

/** Fabric + lifestyle edit pages — full paginated catalog (homepage rail is preview only). */
export async function fetchEditPageData(
  slug: string,
  opts?: { limit?: number; offset?: number }
): Promise<{
  products: Product[];
  editCount: number;
  catalogTotal: number;
  heroImageUrl: string;
} | null> {
  const { getEditConfig } = await import("./edit-pages");
  const config = getEditConfig(slug);
  if (!config || (config.canonicalPath && config.canonicalPath !== `/edits/${slug}`)) {
    return null;
  }

  const collectionSlug = EDIT_TO_COLLECTION_SLUG[slug];
  if (collectionSlug) {
    const collection = await fetchCollectionPageData(collectionSlug, opts);
    if (!collection) return null;
    return {
      products: collection.products,
      editCount: collection.editCount,
      catalogTotal: collection.catalogTotal ?? 0,
      heroImageUrl: config.editorialImage,
    };
  }

  const { EDITORIAL_HERO } = await import("./editorial-assets");
  const limit = Math.min(Math.max(opts?.limit ?? 56, 1), 100);
  const offset = Math.max(opts?.offset ?? 0, 0);

  if (!config.fiber) {
    return {
      products: [],
      editCount: 0,
      catalogTotal: 0,
      heroImageUrl: config.editorialImage,
    };
  }

  const fiber = config.fiber;
  const shopFiber = config.shopFiber ?? config.fiber;

  const { queryLiveCatalog } = await import("./catalog-direct-query");
  const { products: raw, total } = await queryLiveCatalog({
    region: "us",
    fiber: shopFiber,
    limit: limit + 16,
    offset,
    sort: "recommended",
  });

  let products = filterConsumerCatalogProducts(
    raw
      .filter((p) => productBodyMatchesFiber(p.composition || "", fiber))
      .filter(isEditorialWomensApparel)
  ).slice(0, limit);

  const supabase = getServerSupabase();
  let editCount = total ?? 0;
  if (supabase) {
    const counted = await rpcCatalogListCount(supabase, {
      preferred: "us",
      fallback: "us",
      fiber: shopFiber,
      category: null,
      brandSlug: null,
      search: null,
      minNfp: 80,
    });
    if (counted != null && counted > 0) editCount = counted;
  }

  const heroImageUrl = config.editorialImage;

  return {
    products,
    editCount: Math.max(editCount, offset + products.length),
    catalogTotal: editCount,
    heroImageUrl,
  };
}

/** Editorial collection worlds (/collections/[slug]) — full paginated catalog, not homepage rail cache. */
export async function fetchCollectionPageData(
  slug: string,
  opts?: { limit?: number; offset?: number; skipTotal?: boolean }
): Promise<{
  products: Product[];
  editCount: number;
  catalogTotal: number | null;
  heroImageUrl: string;
  hasMore: boolean;
} | null> {
  const { getCollectionConfig } = await import("./collection-pages");
  const config = getCollectionConfig(slug);
  if (!config) return null;

  const collectionSlug = slug as import("./collection-pages").CollectionSlug;
  const limit = Math.min(Math.max(opts?.limit ?? 48, 1), 100);
  const offset = Math.max(opts?.offset ?? 0, 0);
  const skipTotal = opts?.skipTotal ?? false;

  const { fetchCollectionPageFromMemberships } = await import("./collection-memberships");
  const fromMemberships = await fetchCollectionPageFromMemberships(collectionSlug, {
    limit,
    offset,
    skipCount: skipTotal,
  });

  if (fromMemberships && fromMemberships.products.length > 0) {
    const total = skipTotal ? null : fromMemberships.total;
    const catalogTotal = total ?? fromMemberships.total;
    return {
      products: fromMemberships.products,
      editCount: catalogTotal,
      catalogTotal: total,
      heroImageUrl: config.editorialImage,
      hasMore: skipTotal
        ? fromMemberships.products.length >= limit
        : offset + fromMemberships.products.length < fromMemberships.total,
    };
  }

  if (skipTotal) {
    const products = await fetchCollectionCatalogSlice(collectionSlug, limit, offset);
    return {
      products,
      editCount: products.length,
      catalogTotal: null,
      heroImageUrl: config.editorialImage,
      hasMore: products.length >= limit,
    };
  }

  const { paginateCollectionCatalog } = await import("./collection-catalog");
  const ranked = await getCachedRankedCollectionPool(collectionSlug);
  const products = paginateCollectionCatalog(ranked, limit, offset);

  let catalogTotal = ranked.length;
  const supabase = getServerSupabase();
  if (supabase) {
    const { data: countRaw } = await supabase.rpc("collection_catalog_count", { p_slug: slug });
    const n = Number(countRaw ?? 0);
    if (n > 0) catalogTotal = n;
  }

  return {
    products,
    editCount: catalogTotal,
    catalogTotal,
    heroImageUrl: config.editorialImage,
    hasMore: offset + products.length < catalogTotal,
  };
}

function fixIsabelMarantImage(brandSlug: string, imageUrl: string): string {
  return imageUrl;
}

function parseMoneyValue(val: unknown): number {
  if (val == null) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function rowIsOnSale(row: any): boolean {
  if (row?.is_sale === true) return true;
  const curr = parseMoneyValue(row?.price);
  const orig = parseMoneyValue(row?.original_price);
  return orig > curr && curr > 0;
}

export function mapProductRow(row: any): Product {
  const brandSlug = row.brand_slug || "";
  const rawImageUrl = row.image_url || "";
  const priceRaw = row.price;
  const priceStr =
    priceRaw === null || priceRaw === undefined
      ? ""
      : typeof priceRaw === "number" && Number.isFinite(priceRaw)
        ? String(priceRaw)
        : String(priceRaw);
  const origRaw = row.original_price;
  const origStr =
    origRaw === null || origRaw === undefined
      ? null
      : typeof origRaw === "number" && Number.isFinite(origRaw)
        ? String(origRaw)
        : String(origRaw);
  return {
    id: row.id,
    brandSlug,
    brandName: sanitizeBrandName(row.brand_name || ""),
    name: row.title || row.name || "",
    productId: row.product_id || row.id,
    url: row.url || "",
    imageUrl: fixIsabelMarantImage(brandSlug, rawImageUrl),
    price: priceStr,
    composition: row.composition || "",
    naturalFiberPercent: displayNaturalFiberPercent(row.natural_fiber_percent) ?? 0,
    category: row.category || "",
    color: row.color != null && String(row.color).trim() ? String(row.color).trim() : null,
    matchingSetId: row.matching_set_id || null,
    isSale: rowIsOnSale(row),
    originalPrice: origStr,
    listingRegion: row.region != null && row.region !== "" ? String(row.region) : null,
    collectionSlugs: Array.isArray(row.collection_slugs)
      ? row.collection_slugs.map((s: unknown) => String(s))
      : [],
    fiberSubtypeLabel:
      row.fiber_subtype_label != null && String(row.fiber_subtype_label).trim()
        ? String(row.fiber_subtype_label).trim()
        : row.fiber_subtype != null && String(row.fiber_subtype).trim()
          ? String(row.fiber_subtype).trim()
          : null,
    stockStatus:
      row.stock_status != null && String(row.stock_status).trim()
        ? String(row.stock_status).trim()
        : null,
  };
}

const COLLECTION_POOL_LIMIT_PER_QUERY = 120;
const COLLECTION_POOL_PAGES_PER_QUERY = 5;

/** One bounded catalog_list branch — used for page load / build (no full-pool scan). */
async function fetchCollectionCatalogSlice(
  slug: import("./collection-pages").CollectionSlug,
  limit: number,
  offset: number
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { COLLECTION_CATALOG_QUERIES, buildRankedCollectionCatalog } = await import("./collection-catalog");
  const q = COLLECTION_CATALOG_QUERIES[slug]?.[0] ?? {};
  const lim = Math.min(Math.max(limit, 1), 100);
  const off = Math.max(offset, 0);

  let rows =
    (await rpcCatalogList(supabase, {
      preferred: "us",
      fallback: "us",
      fiber: q.fiber ?? null,
      category: q.category ?? null,
      brandSlug: null,
      search: q.search ?? null,
      minNfp: 80,
      limit: lim + 16,
      offset: off,
    })) || [];

  if (rows.length === 0) {
    rows = await catalogListLiveFallback(supabase, {
      fiber: q.fiber ?? null,
      category: q.category ?? null,
      search: q.search ?? null,
      limit: lim + 16,
      offset: off,
      minNfp: 80,
      preferred: "us",
      fallback: "us",
    });
  }

  const mapped = filterConsumerCatalogProducts(
    rows.map((row) => mapProductRow(row)).filter(isEditorialWomensApparel)
  );
  return buildRankedCollectionCatalog(mapped, slug).slice(0, lim);
}

async function fetchCollectionCatalogPoolUncached(
  slug: import("./collection-pages").CollectionSlug
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { COLLECTION_CATALOG_QUERIES, buildRankedCollectionCatalog, isCollectionEligible } =
    await import("./collection-catalog");

  const queries = COLLECTION_CATALOG_QUERIES[slug];
  const seen = new Set<string>();
  const merged: Product[] = [];

  const fetchTasks = queries.flatMap((q) =>
    Array.from({ length: COLLECTION_POOL_PAGES_PER_QUERY }, (_, page) => async () => {
      const offset = page * COLLECTION_POOL_LIMIT_PER_QUERY;
      let rows =
        (await rpcCatalogList(supabase, {
          preferred: "us",
          fallback: "us",
          fiber: q.fiber ?? null,
          category: q.category ?? null,
          brandSlug: null,
          search: q.search ?? null,
          minNfp: 80,
          limit: COLLECTION_POOL_LIMIT_PER_QUERY,
          offset,
        })) || [];

      if (rows.length === 0) {
        rows = await catalogListLiveFallback(supabase, {
          fiber: q.fiber ?? null,
          category: q.category ?? null,
          search: q.search ?? null,
          limit: COLLECTION_POOL_LIMIT_PER_QUERY,
          offset,
          minNfp: 80,
          preferred: "us",
          fallback: "us",
        });
      }
      return rows;
    })
  );

  const rowBatches = await Promise.all(fetchTasks.map((fn) => fn()));

  for (const rows of rowBatches) {
    for (const row of rows) {
      if (!isNotMensProduct(row)) continue;
      const p = mapProductRow(row);
      if (!isEditorialWomensApparel(p)) continue;
      if (!isCollectionEligible(p, slug)) continue;
      const key = catalogDedupeKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(p);
    }
  }

  return buildRankedCollectionCatalog(filterConsumerCatalogProducts(merged), slug);
}

function getCachedRankedCollectionPool(slug: import("./collection-pages").CollectionSlug) {
  return unstable_cache(
    () => fetchCollectionCatalogPoolUncached(slug),
    ["collection-ranked-pool", slug],
    { revalidate: 600, tags: [`collection-${slug}`] }
  )();
}

function mapDesignerRow(row: any): Designer {
  return {
    id: row.id?.toString?.() ?? String(row.id),
    name: sanitizeBrandName(row.name || ""),
    slug: row.slug || "",
    status: row.status || "active",
    naturalFiberPercent: displayNaturalFiberPercent(row.natural_fiber_percent),
    description: row.description || null,
    website: row.website || null,
    createdAt: row.created_at || null,
    heroImage: row.hero_image || null,
  };
}

function isClothingProduct(p: any): boolean {
  const cat = (p.category || "").toLowerCase();
  const name = (p.title || p.name || "").toLowerCase();
  const nonClothing = ["perfume", "cologne", "fragrance", "candle", "soap", "cream", "lotion", "serum", "mask", "shampoo", "conditioner", "body wash", "deodorant", "sunscreen", "sunglasses", "eyewear", "watch", "jewelry", "earring", "necklace", "bracelet", "phone case", "laptop", "tablet", "headband", "hair clip", "scrunchie", "umbrella", "blanket", "pillow", "towel", "candle holder", "vase", "keychain", "sticker", "magnet", "poster", "notebook", "pencil", "gift card", "shoe", "shoes", "footwear", "sandal", "boot", "sneaker", "heel", "pump", "loafer", "mule", "slipper"];
  const text = cat + " " + name;
  for (const term of nonClothing) {
    const re = new RegExp(`\\b${term}\\b`);
    if (re.test(text)) return false;
  }
  return true;
}

function isNotMensProduct(p: any): boolean {
  if (isMensCatalogRow(p)) return false;
  const slug = String(p.brand_slug || p.brandSlug || "").toLowerCase();
  if (isMensOnlyBrand(slug)) return false;
  const name = (p.title || p.name || "").toLowerCase();
  const cat = (p.category || "").toLowerCase();
  const mensTerms = ["men's", "mens ", " men ", "for men", "man's", "male ", " male", "boy's", "boys "];
  for (const term of mensTerms) {
    if (name.includes(term) || cat.includes(term)) {
      if (name.includes("boxer short") || name.includes("boyfriend")) return true;
      return false;
    }
  }
  return true;
}

export async function fetchDesignersByNames(names: string[]): Promise<Designer[]> {
  const supabase = getServerSupabase();
  if (!supabase || names.length === 0) return [];
  const { data, error } = await supabase
    .from("designers")
    .select("*")
    .in("name", names);
  if (error || !data) return [];
  return data.map(mapDesignerRow);
}

export async function fetchDesignersByIds(ids: (string | number)[]): Promise<Designer[]> {
  const supabase = getServerSupabase();
  if (!supabase || ids.length === 0) return [];
  const stringIds = ids.map(id => String(id)).filter(Boolean);
  if (stringIds.length === 0) return [];
  const { data, error } = await supabase
    .from("designers")
    .select("*")
    .in("id", stringIds);
  if (error || !data) return [];
  return data.map(mapDesignerRow);
}

export async function fetchDesigners(query?: string, limit?: number): Promise<Designer[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  let q = supabase.from("designers").select("*").order("name");
  if (query) q = q.ilike("name", `%${query}%`);
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error || !data) return [];
  const seen = new Set<string>();
  return data.map(mapDesignerRow).filter(d => {
    if (seen.has(d.slug)) return false;
    seen.add(d.slug);
    return true;
  });
}

export async function fetchDesignerBySlug(slug: string): Promise<Designer | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("designers")
    .select("*")
    .eq("slug", slug)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return mapDesignerRow(data[0]);
}

/** One round-trip for homepage “Brands we love” (avoids N× fetchDesignerBySlug). */
export async function fetchDesignersBySlugs(slugs: string[]): Promise<Designer[]> {
  const supabase = getServerSupabase();
  if (!supabase || slugs.length === 0) return [];
  const unique = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  const { data, error } = await supabase.from("designers").select("*").in("slug", unique);
  if (error || !data) return [];
  const bySlug = new Map(data.map((row: any) => [String(row.slug || "").toLowerCase(), mapDesignerRow(row)]));
  return slugs.map((s) => bySlug.get(s.trim().toLowerCase())).filter(Boolean) as Designer[];
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  let query;
  const isNumeric = /^\d+$/.test(id);
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isNumeric) {
    query = liveProductsApparelFrom(supabase).select("*").eq("product_id", id);
  } else if (isUUID) {
    query = liveProductsApparelFrom(supabase).select("*").eq("id", id);
  } else {
    query = liveProductsApparelFrom(supabase).select("*").eq("id", id);
  }

  let { data, error } = await query;
  if (error || !data || data.length === 0) {
    if (isNumeric) {
      query = supabase.from("products").select("*").eq("product_id", id);
    } else if (isUUID) {
      query = supabase.from("products").select("*").eq("id", id);
    } else {
      query = supabase.from("products").select("*").eq("id", id);
    }
    const fall = await query;
    data = fall.data as any;
    error = fall.error;
  }
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  if (row.natural_fiber_percent != null && row.natural_fiber_percent < 80) return null;
  if (isMensCatalogRow(row)) return null;
  const mapped = mapProductRow(row);
  if (consumerExclusionForProduct(mapped)) return null;
  return mapped;
}

export async function fetchProductsByFiberAndCategory(
  fiber: string,
  category?: string,
  limit = 200,
  offset = 0
): Promise<Product[]> {
  const fiberTerms: Record<string, string[]> = {
    cotton: ["cotton"],
    linen: ["linen"],
    silk: ["silk"],
    wool: ["wool"],
    cashmere: ["cashmere"],
  };
  const fiberInputs = fiber.split(",").map((f) => f.trim().toLowerCase()).filter(Boolean);
  const terms = [...new Set(fiberInputs.flatMap((f) => fiberTerms[f] || [f]))];
  const hasDenimTerm = fiberInputs.some((f) => f === "denim" || f === "jeans" || f === "jean");
  const pageLimit = Math.min(Math.max(limit, 40), 500);
  const allProducts: Product[] = [];

  for (const term of terms) {
    const chunk = await fetchCatalogProductsByFiber({
      fiber: term,
      category,
      limit: pageLimit,
      offset,
    });
    allProducts.push(...chunk);
  }

  if (hasDenimTerm) {
    const denim = await fetchCatalogProductsByFiber({
      fiber: "denim",
      category,
      limit: pageLimit,
      offset,
    });
    allProducts.push(...denim);
  }

  const seen = new Set<string>();
  return allProducts
    .filter((p) => {
      const id = p.productId || p.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, limit);
}

function priceListedRow(row: any): boolean {
  const p = row.price;
  if (p == null || p === "" || p === "$0.00" || p === "0") return false;
  if (!row.image_url || String(row.image_url).trim() === "") return false;
  return true;
}

function mapBrandCatalogRow(row: Record<string, unknown>): Product | null {
  if (!isNotMensProduct(row)) return null;
  const product = mapProductRow(row);
  if (consumerExclusionForProduct(product)) return null;
  return product;
}

/** Scan live brand rows until consumer filters yield enough cards (PostgREST range runs before JS guards). */
async function collectBrandCatalogPage(
  supabase: UntypedSupabase,
  canonicalSlug: string,
  region: string,
  limit: number,
  offset: number,
  resolveFullTotal = true
): Promise<{ products: Product[]; filteredTotal: number; timedOut: boolean; hasMoreHint: boolean }> {
  const batchSize = Math.max(limit * 4, 96);
  const maxRawScan = 6000;
  let rawCursor = 0;
  let skipped = 0;
  const seen = new Set<string>();
  const page: Product[] = [];
  const allFiltered: Product[] = [];
  let exhausted = false;

  while (rawCursor < maxRawScan) {
    const { data, error } = await liveProductsApparelFrom(supabase)
      .select("*")
      .eq("region", region)
      .eq("brand_slug", canonicalSlug)
      .gte("natural_fiber_percent", 80)
      .order("natural_fiber_percent", { ascending: false })
      .order("created_at", { ascending: false })
      .range(rawCursor, rawCursor + batchSize - 1);

    if (error && isCatalogTimeoutError(error)) {
      return { products: page, filteredTotal: allFiltered.length, timedOut: true, hasMoreHint: false };
    }

    const rows = data || [];
    if (rows.length === 0) {
      exhausted = true;
      break;
    }
    rawCursor += rows.length;

    for (const row of dedupeLiveApparelRows(rows, region, region)) {
      const product = mapBrandCatalogRow(row);
      if (!product) continue;
      const key = catalogDedupeKeyFromProduct(product);
      if (seen.has(key)) continue;
      seen.add(key);
      allFiltered.push(product);
      if (skipped < offset) {
        skipped += 1;
        continue;
      }
      if (page.length < limit) page.push(product);
    }

    if (rows.length < batchSize) {
      exhausted = true;
      break;
    }

    // Pagination requests only need the next page — avoid rescanning the full brand (timeouts).
    if (!resolveFullTotal && page.length >= limit) {
      break;
    }
  }

  const hasMoreHint = !exhausted && page.length >= limit;
  return { products: page, filteredTotal: allFiltered.length, timedOut: false, hasMoreHint };
}

export async function fetchProductsByBrand(
  brandSlug: string,
  opts?: CatalogFetchOpts & {
    limit?: number;
    offset?: number;
    skipTotal?: boolean;
    region?: string;
  }
): Promise<{ products: Product[]; total: number | null; hasMore: boolean; error?: string }> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: 0, hasMore: false };
  const canonicalSlug = canonicalDesignerProductSlug(brandSlug);
  const limit = Math.min(Math.max(1, opts?.limit ?? 48), 100);
  const offset = Math.max(0, opts?.offset ?? 0);
  const skipTotal = opts?.skipTotal ?? false;
  const region = (opts?.region || "us").toLowerCase();

  const resolveFullTotal = !skipTotal && offset === 0;
  const tLive = Date.now();
  const { products, filteredTotal, timedOut, hasMoreHint } = await collectBrandCatalogPage(
    supabase,
    canonicalSlug,
    region,
    limit,
    offset,
    resolveFullTotal
  );
  logSupabaseTiming(
    `live live_products_apparel brand=${canonicalSlug}`,
    tLive,
    `rows:${products.length} filteredTotal:${filteredTotal} offset:${offset}`
  );

  if (timedOut) {
    return { products: [], total: 0, hasMore: false, error: "timeout" };
  }

  if (skipTotal) {
    return {
      products,
      total: null,
      hasMore: hasMoreHint || offset + products.length < filteredTotal,
    };
  }

  if (offset > 0) {
    return {
      products,
      total: null,
      hasMore: hasMoreHint || products.length >= limit,
    };
  }

  const resolvedTotal = filteredTotal > 0 ? filteredTotal : offset + products.length;
  return {
    products,
    total: resolvedTotal,
    hasMore: offset + products.length < resolvedTotal,
  };
}

export async function fetchAllProducts(limit = 200, offset = 0, category?: string): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  let rows =
    (await rpcCatalogList(supabase, {
      preferred: "us",
      fallback: "us",
      fiber: null,
      category: category || null,
      brandSlug: null,
      search: null,
      minNfp: 80,
      limit,
      offset,
    })) || [];

  if (rows.length === 0) {
    let fb = liveProductsApparelFrom(supabase).select("*").gte("natural_fiber_percent", 80);
    if (category) fb = applyCategoryFilter(fb, category);
    const { data } = await fb
      .order("natural_fiber_percent", { ascending: false })
      .range(offset, offset + limit - 1);
    rows = dedupeLiveApparelRows(data || [], "us", "us");
  }

  return rows.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase || ids.length === 0) return [];
  const { data, error } = await liveProductsApparelFrom(supabase)
    
    .select("*")
    .in("id", ids);
  if (error || !data || data.length === 0) {
    const fb = await supabase.from("products").select("*").in("id", ids);
    if (fb.error || !fb.data) return [];
    return fb.data.map(mapProductRow);
  }
  return data.map(mapProductRow);
}

export async function fetchFiberCounts(): Promise<Record<string, number>> {
  const supabase = getServerSupabase();
  if (!supabase) return {};
  const fibers = ["cashmere", "silk", "wool", "cotton", "linen"];
  const counts: Record<string, number> = {};
  await Promise.all(
    fibers.map(async (fiber) => {
      const n = await rpcCatalogListCount(supabase, {
        preferred: "us",
        fallback: "us",
        fiber,
        category: null,
        brandSlug: null,
        search: null,
        minNfp: 80,
      });
      if (n != null) counts[fiber] = n;
    })
  );
  return counts;
}

/** Full-catalog total — always `catalog_list_count` (never homepage merch meta). */
export async function fetchProductCount(): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;
  const fromRpc = await rpcCatalogListCount(supabase, {
    preferred: "us",
    fallback: "us",
    fiber: null,
    category: null,
    brandSlug: null,
    search: null,
    minNfp: 80,
  });
  if (fromRpc != null) return fromRpc;

  const { count, error } = await liveProductsApparelFrom(supabase)
    
    .select("id", { count: "exact", head: true })
    .gte("natural_fiber_percent", 80);
  if (!error && count != null) return count;
  return 0;
}

/** Per-material hub count — catalog_list_count first (full catalog), then precomputed hub row. */
export async function fetchMaterialHubDisplayCount(
  materialSlug: string,
  category?: string
): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;

  const liveTotal = await countLiveProductsApparel(supabase, {
    region: "us",
    fiber: materialSlug,
  });
  if (liveTotal > 0) return liveTotal;

  const cnt = await rpcCatalogListCount(supabase, {
    preferred: "us",
    fallback: "us",
    fiber: materialSlug,
    category: category || null,
    brandSlug: null,
    search: null,
    minNfp: 80,
  });
  if (cnt != null && cnt > 0) return cnt;

  const { data: hub } = await supabase
    .from("catalog_material_hub_counts")
    .select("card_count")
    .eq("fiber", materialSlug)
    .eq("category", category || "")
    .maybeSingle();
  if (hub?.card_count != null && Number(hub.card_count) > 0) {
    return Number(hub.card_count);
  }
  return 0;
}

export async function fetchAllProductIds(): Promise<string[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const ids: string[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await liveProductsApparelFrom(supabase)
      
      .select("id")
      .range(offset, offset + pageSize - 1);

    if (error || !data || data.length === 0) break;
    ids.push(...data.map((r: any) => r.id));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return ids;
}

export async function fetchAllDesignerSlugs(): Promise<string[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("designers")
    .select("slug")
    .order("name");
  if (error || !data) return [];
  return data.map((r: any) => r.slug).filter(Boolean);
}

export async function fetchRelatedProducts(
  product: Product,
  limit = 8
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await liveProductsApparelFrom(supabase)
    
    .select("*")
    .eq("brand_slug", product.brandSlug)
    .neq("id", product.id)
    .gte("natural_fiber_percent", 80)
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
}

function isWomensFashionBrand(slug: string): boolean {
  return WOMEN_FASHION_BRAND_SLUGS.has(slug);
}

export async function fetchProductsByFiber(
  fiber: string,
  limit = 200,
  opts?: CatalogFetchOpts
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  let rows: any[] = [];
  if (!opts?.preferLiveOnly) {
    try {
      rows =
        (await rpcCatalogList(supabase, {
          preferred: "us",
          fallback: "us",
          fiber,
          category: null,
          brandSlug: null,
          search: null,
          minNfp: 80,
          limit: Math.min(limit, 48),
          offset: 0,
        })) || [];
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (!isCatalogTimeoutError(e) && e?.code !== "57014") throw err;
      rows = [];
    }
  }
  if (rows.length === 0) {
    const tLive = Date.now();
    const { data } = await liveProductsApparelFrom(supabase)
      
      .select("*")
      .ilike("composition", `%${fiber}%`)
      .gte("natural_fiber_percent", 80)
      .not("price", "is", null)
      .not("image_url", "is", null)
      .order("natural_fiber_percent", { ascending: false })
      .limit(limit);
    logSupabaseTiming(`live live_products_apparel fiber=${fiber}`, tLive, `rows:${(data || []).length}`);
    rows = data || [];
  }

  rows = dedupeLiveApparelRows(rows, "us", "us");

  return rows
    .filter(priceListedRow)
    .filter((row: any) => isClothingProduct(row) && isWomensFashionBrand(row.brand_slug || "") && isNotMensProduct(row))
    .map(mapProductRow);
}

export async function fetchProductsByBrandWithImages(
  brandSlug: string,
  limit = 24,
  opts?: CatalogFetchOpts
): Promise<Product[]> {
  const { products } = await fetchProductsByBrand(brandSlug, { ...opts, limit });
  return products
    .filter((p) => !!p.imageUrl && !!p.price)
    .slice(0, limit);
}

export async function fetchProductCountsByBrand(slugs: string[]): Promise<Record<string, number>> {
  const supabase = getServerSupabase();
  if (!supabase) return {};
  const counts: Record<string, number> = {};
  await Promise.all(
    slugs.map(async (slug) => {
      const n = await rpcCatalogListCount(supabase, {
        preferred: "us",
        fallback: "us",
        fiber: null,
        category: null,
        brandSlug: slug,
        search: null,
        minNfp: 80,
      });
      counts[slug] = n ?? 0;
    })
  );
  return counts;
}

export async function fetchRecommendedProducts(
  materialTerms: string[],
  excludeBrandSlugs: string[],
  limit = 50
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  let query = liveProductsApparelFrom(supabase)
    
    .select("id, brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category")
    .not("image_url", "is", null)
    .gte("natural_fiber_percent", 80)
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit * 5);

  if (excludeBrandSlugs.length > 0) {
    query = query.not("brand_slug", "in", `(${excludeBrandSlugs.join(",")})`);
  }

  if (materialTerms.length === 1) {
    query = query.ilike("composition", `%${materialTerms[0]}%`);
  } else if (materialTerms.length > 1) {
    const orFilter = materialTerms.map(t => `composition.ilike.%${t}%`).join(",");
    query = query.or(orFilter);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const filtered = data
    .filter((row: any) => isClothingProduct(row) && isWomensFashionBrand(row.brand_slug || ""));

  const scored = filtered.map((row: any) => {
    const comp = (row.composition || "").toLowerCase();
    let relevance = 0;
    for (const term of materialTerms) {
      const t = term.toLowerCase();
      if (!comp.includes(t)) continue;
      const pctMatch = comp.match(new RegExp(`(\\d+)\\s*%\\s*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))
        || comp.match(new RegExp(`${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^,]*?(\\d+)\\s*%`, 'i'));
      if (pctMatch) {
        relevance = Math.max(relevance, parseInt(pctMatch[1], 10));
      } else {
        relevance = Math.max(relevance, 40);
      }
    }
    return { row, relevance };
  });

  scored.sort((a: { row: any; relevance: number }, b: { row: any; relevance: number }) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return (b.row.natural_fiber_percent || 0) - (a.row.natural_fiber_percent || 0);
  });

  return scored.slice(0, limit).map(({ row }: { row: any }) => mapProductRow(row));
}

function parsePrice(price: string | null | undefined): number {
  if (!price) return Infinity;
  const cleaned = price.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? Infinity : num;
}

const SHOP_PRICE_SORT_MAX_ROWS = 2500;

async function fetchShopLiveApparelAllRows(
  supabase: UntypedSupabase,
  opts: {
    market?: string;
    rpcFiber: string | null;
    rpcCategory: string | null;
    searchTerms: string[];
  }
): Promise<any[]> {
  const pageSize = 1000;
  let allRows: any[] = [];
  let fetchOffset = 0;
  while (allRows.length < SHOP_PRICE_SORT_MAX_ROWS) {
    let q2 = applyCatalogFilter(
      liveProductsApparelFrom(supabase)
        
        .select(
          "id, brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category, region, created_at"
        )
        .gte("natural_fiber_percent", 80),
      opts.market
    );
    q2 = q2.not("image_url", "is", null).not("price", "is", null);
    q2 = q2.neq("price", "").neq("price", "$0.00").neq("price", "0");
    if (opts.searchTerms.length > 0) {
      const orClauses = opts.searchTerms.flatMap((t) => [
        `name.ilike.%${t}%`,
        `brand_name.ilike.%${t}%`,
        `composition.ilike.%${t}%`,
      ]);
      q2 = q2.or(orClauses.join(","));
    }
    if (opts.rpcFiber) q2 = q2.ilike("composition", `%${opts.rpcFiber}%`);
    if (opts.rpcCategory) q2 = q2.eq("category", opts.rpcCategory);
    q2 = q2.range(fetchOffset, fetchOffset + pageSize - 1);
    const { data: chunk, error: chunkErr } = await q2;
    if (chunkErr || !chunk || chunk.length === 0) break;
    allRows.push(...chunk);
    if (chunk.length < pageSize) break;
    fetchOffset += pageSize;
    if (allRows.length >= SHOP_PRICE_SORT_MAX_ROWS) break;
  }
  return allRows.slice(0, SHOP_PRICE_SORT_MAX_ROWS);
}

async function shopLivePageFallback(
  supabase: UntypedSupabase,
  opts: {
    market?: string;
    rpcFiber: string | null;
    rpcCategory: string | null;
    rpcBrand: string | null;
    searchTerms: string[];
    limit: number;
    offset: number;
  }
): Promise<any[]> {
  let q = applyCatalogFilter(
    liveProductsApparelFrom(supabase)
      .select("*")
      .gte("natural_fiber_percent", 80),
    opts.market
  );
  q = q.not("image_url", "is", null).not("price", "is", null);
  q = q.neq("price", "").neq("price", "$0.00").neq("price", "0");
  if (opts.searchTerms.length > 0) {
    const orClauses = opts.searchTerms.flatMap((t) => [
      `name.ilike.%${t}%`,
      `brand_name.ilike.%${t}%`,
      `composition.ilike.%${t}%`,
    ]);
    q = q.or(orClauses.join(","));
  }
  if (opts.rpcFiber) q = q.ilike("composition", `%${opts.rpcFiber}%`);
  if (opts.rpcCategory) q = applyCategoryFilter(q, opts.rpcCategory);
  if (opts.rpcBrand) q = q.eq("brand_slug", opts.rpcBrand);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(opts.offset, opts.offset + opts.limit - 1);
  if (error || !data) return [];
  return data;
}

function shopCategoriesList(category?: string, categories?: string[]): string[] {
  if (categories?.length) return categories.filter((c) => c && c !== "all");
  if (category && category !== "all") return [category];
  return [];
}

function shopRpcCategory(categories: string[]): string | null {
  return categories.length === 1 ? categories[0] : null;
}

function shopRpcBrandSlug(brandSlugs?: string[]): string | null {
  const slugs = (brandSlugs || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  return slugs.length === 1 ? slugs[0] : null;
}

function normalizeShopPriceCap(maxPrice?: number | null): ShopPriceCap {
  if (maxPrice === 100 || maxPrice === 300 || maxPrice === 600) return maxPrice;
  return null;
}

function applyShopPostFilters(
  mapped: Product[],
  opts: {
    categories: string[];
    brandSlugs?: string[];
    fiberSubtypes?: string[];
    maxPrice: ShopPriceCap;
    price600Plus?: boolean;
    sort?: string;
  }
): Product[] {
  let out = mapped;
  if (opts.fiberSubtypes?.length) {
    out = filterProductsByFiberSubtypes(out, opts.fiberSubtypes);
  }
  if (opts.categories.length > 1) {
    out = out.filter((p) =>
      productMatchesAnyShopCategory(
        {
          garment_type: (p as { garmentType?: string }).garmentType,
          category: p.category,
        },
        opts.categories
      )
    );
  }
  const slugs = (opts.brandSlugs || []).map((s) => s.toLowerCase()).filter(Boolean);
  if (slugs.length > 1) {
    out = out.filter((p) => slugs.includes(String(p.brandSlug || "").toLowerCase()));
  }
  if (opts.maxPrice != null || opts.price600Plus) {
    out = out.filter((p) =>
      productMatchesShopPrice(p.price, opts.maxPrice, Boolean(opts.price600Plus))
    );
  }
  if (opts.sort === "natural-high") {
    out = [...out].sort(
      (a, b) => (Number(b.naturalFiberPercent) || 0) - (Number(a.naturalFiberPercent) || 0)
    );
  }
  return out;
}

/** Shop filter total — call after first product page renders. */
export async function fetchShopCatalogCount(options: {
  fiber?: string;
  category?: string;
  categories?: string[];
  brandSlugs?: string[];
  fiberSubtypes?: string[];
  maxPrice?: number | null;
  price600Plus?: boolean;
  market?: string;
  search?: string;
}): Promise<number | null> {
  const categories = shopCategoriesList(options.category, options.categories);
  const brandSlugs = options.brandSlugs?.filter(Boolean);
  const maxPrice = normalizeShopPriceCap(options.maxPrice);
  if (
    categories.length > 1 ||
    (brandSlugs?.length ?? 0) > 1 ||
    (options.fiberSubtypes?.length ?? 0) > 0 ||
    maxPrice != null ||
    options.price600Plus
  ) {
    return null;
  }
  const supabase = getServerSupabase();
  if (!supabase) return 0;
  const { fiber, market, search } = options;
  const { preferred, fallback } = catalogRegionsFromMarket(market);
  const rpcFiber = fiber && fiber !== "all" ? fiber : null;
  const rpcCategory = shopRpcCategory(categories);
  const rpcBrand = shopRpcBrandSlug(brandSlugs);
  let searchRpc: string | null = null;
  if (search && search.trim().length >= 2) {
    searchRpc = search.trim().toLowerCase();
  }
  return resolveShopCatalogTotal(supabase, {
    preferred,
    fallback,
    fiber: rpcFiber,
    category: rpcCategory,
    brandSlug: rpcBrand,
    search: searchRpc,
  });
}

/**
 * @deprecated Disabled — use queryLiveCatalog or /api/catalog instead.
 * Left commented so it cannot be called accidentally.
 */
// export async function fetchShopProducts(...) { ... }


const PRODUCT_CARD_COLS = "id, brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category, is_sale, original_price, stock_status";

/** PDP rail — same deduped women's catalog as designer shop, not raw live rows. */
export async function fetchMoreFromBrand(
  productId: string,
  brandSlug: string,
  limit = 12
): Promise<Product[]> {
  const slug = String(brandSlug || "").trim().toLowerCase();
  if (!slug) return [];
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const excludeIds = new Set(
    [productId, String(productId)].map((s) => s.trim()).filter(Boolean)
  );
  const target = Math.min(Math.max(limit, 8), 16);
  const fetchLimit = Math.min(target * 4, 48);

  let rows =
    (await rpcCatalogList(supabase, {
      preferred: "us",
      fallback: "us",
      brandSlug: slug,
      limit: fetchLimit,
      offset: 0,
      minNfp: 80,
    })) || [];

  if (rows.length === 0) {
    const { data, error } = await liveProductsApparelFrom(supabase)
      
      .select("*")
      .eq("brand_slug", slug)
      .gte("natural_fiber_percent", 80)
      .not("image_url", "is", null)
      .not("price", "is", null)
      .order("natural_fiber_percent", { ascending: false })
      .limit(fetchLimit);
    if (!error && data?.length) {
      rows = dedupeLiveApparelRows(data, "us", "us");
    }
  }

  const mapped = filterConsumerCatalogProducts(
    rows
      .filter((row: any) => priceListedRow(row) && isClothingProduct(row))
      .map(mapProductRow)
      .filter((p) => {
        const id = String(p.id || "");
        const pid = String(p.productId || "");
        return !excludeIds.has(id) && !excludeIds.has(pid);
      })
  );

  const seenKeys = new Set<string>();
  const unique: Product[] = [];
  for (const p of mapped) {
    const key = catalogDedupeKey({
      brand_name: p.brandName,
      name: p.name,
      product_id: p.productId,
      image_url: p.imageUrl,
    });
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    unique.push(p);
    if (unique.length >= target) break;
  }
  return unique;
}

function diversifyProductsByBrand(products: Product[], limit: number, maxPerBrand = 2): Product[] {
  const result: Product[] = [];
  const brandCount: Record<string, number> = {};
  for (const product of products) {
    if (result.length >= limit) break;
    const brand = (product.brandSlug || product.brandName || "").toLowerCase();
    if ((brandCount[brand] || 0) >= maxPerBrand) continue;
    brandCount[brand] = (brandCount[brand] || 0) + 1;
    result.push(product);
  }
  return result;
}

/** PDP rail — other sale pieces, mixed across brands (not same-brand repeats). */
export async function fetchMoreOnSale(productId: string, limit = 12): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const excludeIds = new Set(
    [productId, String(productId)].map((s) => s.trim()).filter(Boolean)
  );
  const target = Math.min(Math.max(limit, 8), 16);
  const fetchLimit = Math.min(target * 6, 72);
  const { preferred } = catalogRegionsFromMarket(undefined);

  const { data, error } = await applySaleQuerySort(
    buildSaleDirectQuery(supabase, preferred, {}),
    "discount"
  ).limit(fetchLimit);

  if (error || !data?.length) return [];

  const mapped = filterConsumerCatalogProducts(
    data
      .filter((row: any) => priceListedRow(row) && isClothingProduct(row) && rowIsOnSale(row))
      .map(mapProductRow)
      .filter((p) => {
        const id = String(p.id || "");
        const pid = String(p.productId || "");
        return !excludeIds.has(id) && !excludeIds.has(pid);
      })
  );

  const byDiscount = [...mapped].sort(
    (a, b) => saleDiscountPercent(b) - saleDiscountPercent(a)
  );
  return diversifyProductsByBrand(byDiscount, target, 2);
}

export async function fetchMoreInFiber(
  productId: string,
  composition: string | null,
  limit = 4,
  opts?: { saleOnly?: boolean }
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase || !composition) return [];
  const fibers = ["silk", "cotton", "linen", "wool", "cashmere", "merino", "mohair", "alpaca", "hemp"];
  const lower = composition.toLowerCase();
  const primaryFiber = fibers.find((f) => lower.includes(f));
  if (!primaryFiber) return [];
  let query = liveProductsApparelFrom(supabase)
    .select(PRODUCT_CARD_COLS)
    .neq("id", productId)
    .ilike("composition", `%${primaryFiber}%`)
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null);
  if (opts?.saleOnly) {
    query = query.eq("is_sale", true);
  }
  const { data, error } = await query
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data
    .filter(isClothingProduct)
    .filter(isNotMensProduct)
    .filter((row: any) => !opts?.saleOnly || rowIsOnSale(row))
    .map(mapProductRow);
}

export async function fetchMoreAtPrice(
  productId: string,
  price: string | null,
  limit = 4,
  opts?: { saleOnly?: boolean }
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase || !price) return [];
  const numPrice = parseFloat(price.replace(/[^0-9.]/g, ""));
  if (!numPrice || numPrice <= 0) return [];
  const low = numPrice * 0.8;
  const high = numPrice * 1.2;
  let query = liveProductsApparelFrom(supabase)
    .select(PRODUCT_CARD_COLS)
    .neq("id", productId)
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null);
  if (opts?.saleOnly) {
    query = query.eq("is_sale", true);
  }
  const { data, error } = await query
    .order("natural_fiber_percent", { ascending: false })
    .limit(60);
  if (error || !data) return [];
  const filtered = data
    .filter(isClothingProduct)
    .filter(isNotMensProduct)
    .filter((row: any) => !opts?.saleOnly || rowIsOnSale(row))
    .filter((row: any) => {
      const p = parseFloat((row.price || "0").replace(/[^0-9.]/g, ""));
      return p >= low && p <= high;
    });
  return filtered.slice(0, limit).map(mapProductRow);
}

function productMatchesSaleCategory(product: Product, category: string): boolean {
  const needle = category.toLowerCase();
  const garment = String((product as any).garmentType || (product as any).garment_type || "").toLowerCase();
  const cat = String(product.category || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();
  return garment.includes(needle) || cat.includes(needle) || name.includes(needle);
}

function saleDiscountPercent(product: Product): number {
  const orig = parseMoneyValue(product.originalPrice);
  const curr = parseMoneyValue(product.price);
  if (!orig || !curr || orig <= curr) return 0;
  return Math.round(((orig - curr) / orig) * 100);
}

function sortSaleProducts(products: Product[], sort?: string): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-low":
      return list.sort((a, b) => parseMoneyValue(a.price) - parseMoneyValue(b.price));
    case "price-high":
      return list.sort((a, b) => parseMoneyValue(b.price) - parseMoneyValue(a.price));
    case "natural":
    case "natural-high":
      return list.sort((a, b) => (b.naturalFiberPercent ?? 0) - (a.naturalFiberPercent ?? 0));
    case "discount":
      return list.sort((a, b) => saleDiscountPercent(b) - saleDiscountPercent(a));
    default:
      return list;
  }
}

function applySaleProductFilters(
  products: Product[],
  opts: {
    fiber?: string;
    fiberSubtype?: string;
    maxPrice?: number;
    minPrice?: number;
    category?: string;
    color?: string;
    brand?: string;
  }
): Product[] {
  let filtered = products.filter((p) => p.imageUrl && p.price);
  if (opts.fiber && opts.fiber !== "all") {
    const needle = opts.fiber.toLowerCase();
    filtered = filtered.filter((p) => (p.composition || "").toLowerCase().includes(needle));
  }
  if (opts.fiberSubtype) {
    const needle = opts.fiberSubtype.toLowerCase();
    filtered = filtered.filter((p) => (p.composition || "").toLowerCase().includes(needle));
  }
  if (opts.category && opts.category !== "all") {
    filtered = filtered.filter((p) => productMatchesSaleCategory(p, opts.category!));
  }
  if (opts.color) {
    const c = opts.color.toLowerCase();
    filtered = filtered.filter((p) => String((p as any).color || "").toLowerCase() === c);
  }
  if (opts.brand) {
    const slug = opts.brand.toLowerCase();
    filtered = filtered.filter((p) => (p.brandSlug || "").toLowerCase() === slug);
  }
  if (opts.minPrice) {
    filtered = filtered.filter((p) => parseMoneyValue(p.price) >= opts.minPrice!);
  }
  if (opts.maxPrice) {
    filtered = filtered.filter((p) => {
      const pr = parseMoneyValue(p.price);
      return pr > 0 && pr <= opts.maxPrice!;
    });
  }
  return filtered;
}


/** Shared base filters for sale catalog — direct table query (no RPC). */
function applySaleQuerySort(query: any, sort?: string) {
  switch (sort) {
    case "price-low":
      return query.order("price", { ascending: true });
    case "price-high":
      return query.order("price", { ascending: false });
    case "natural":
    case "natural-high":
      return query.order("natural_fiber_percent", { ascending: false });
    case "new":
      return query.order("created_at", { ascending: false });
    case "discount":
    default:
      return query.order("created_at", { ascending: false });
  }
}

function buildSaleDirectQuery(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  region: string,
  opts: { fiber?: string; fiberSubtype?: string; category?: string; color?: string; brand?: string },
  columns = "*",
  selectOptions?: { count: "exact"; head: true }
) {
  let q = liveProductsApparelFrom(supabase)
    .select(columns, selectOptions)
    .eq("is_sale", true)
    .eq("region", region)
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null);
  if (opts.fiber && opts.fiber !== "all") {
    q = q.ilike("composition", `%${opts.fiber}%`);
  }
  if (opts.fiberSubtype) {
    q = q.ilike("composition", `%${opts.fiberSubtype}%`);
  }
  if (opts.category && opts.category !== "all") {
    q = applyCategoryFilter(q, opts.category);
  }
  if (opts.color) {
    q = q.eq("color", opts.color);
  }
  if (opts.brand) {
    q = q.eq("brand_slug", opts.brand.toLowerCase());
  }
  return q;
}

function saleHasMore(
  productsLength: number,
  offset: number,
  total: number
): boolean {
  return productsLength > 0 && offset + productsLength < total;
}

/** On-sale count from live_products_apparel (same filters as fetchSaleProductsDirect). */
export async function getSaleTotalCount(opts: {
  region?: string;
  fiber?: string;
  maxPrice?: number;
  minPrice?: number;
  category?: string;
  color?: string;
  brand?: string;
}): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;
  const { preferred } = catalogRegionsFromMarket(opts.region);
  const fiber = opts.fiber && opts.fiber !== "all" ? opts.fiber : undefined;
  const category = opts.category && opts.category !== "all" ? opts.category : undefined;
  const color = opts.color || undefined;
  const brand = opts.brand || undefined;
  try {
    const { count, error } = await buildSaleDirectQuery(
      supabase,
      preferred,
      { fiber, category, color, brand },
      "id",
      { count: "exact", head: true }
    );
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    console.warn("[getSaleTotalCount] direct count failed:", err);
    return 0;
  }
}

/** Paginated sale catalog — direct live_products_apparel query (bypasses sale_catalog_list RPC). */
async function fetchSaleProductsDirect(options: {
  fiber?: string;
  fiberSubtype?: string;
  maxPrice?: number;
  minPrice?: number;
  category?: string;
  color?: string;
  brand?: string;
  market?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  skipTotal?: boolean;
}): Promise<{ products: Product[]; total: number | null; hasMore: boolean }> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: 0, hasMore: false };
  const {
    fiber,
    fiberSubtype,
    maxPrice,
    minPrice,
    category,
    color,
    brand,
    market,
    sort,
    limit = 60,
    offset = 0,
    skipTotal = false,
  } = options;
  const { preferred } = catalogRegionsFromMarket(market);
  const filterOpts = { fiber, fiberSubtype, category, color, brand };

  const { data, error } = await applySaleQuerySort(
    buildSaleDirectQuery(supabase, preferred, filterOpts),
    sort
  ).range(offset, offset + limit - 1);
  if (error) throw error;

  let products = filterConsumerCatalogProducts((data || []).map(mapProductRow));
  products = applySaleProductFilters(products, {
    fiber,
    fiberSubtype,
    maxPrice,
    minPrice,
    category,
    color,
    brand,
  });
  if (sort === "discount") {
    products = sortSaleProducts(products, sort);
  }

  if (skipTotal) {
    return {
      products,
      total: null,
      hasMore: products.length >= limit,
    };
  }

  const { count, error: countErr } = await buildSaleDirectQuery(
    supabase,
    preferred,
    filterOpts,
    "id",
    { count: "exact", head: true }
  );
  if (countErr) throw countErr;
  const total = count ?? products.length;

  return {
    products,
    total,
    hasMore: saleHasMore(products.length, offset, total),
  };
}

export async function fetchSaleProducts(options: {
  fiber?: string;
  fiberSubtype?: string;
  maxPrice?: number;
  minPrice?: number;
  category?: string;
  color?: string;
  brand?: string;
  market?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  /** Stop scanning after this many raw rows (homepage merch preview only). */
  maxSourceRows?: number;
  /** Homepage only: use capped merch rail. Sale page / API must set false for full markdown catalog. */
  useMerchFeedPreview?: boolean;
  skipTotal?: boolean;
}): Promise<{ products: Product[]; total: number | null; hasMore: boolean }> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: 0, hasMore: false };
  const {
    fiber,
    fiberSubtype,
    maxPrice,
    minPrice,
    category,
    color,
    brand,
    market,
    sort,
    limit = 60,
    offset = 0,
    maxSourceRows,
    useMerchFeedPreview = maxSourceRows != null,
    skipTotal = false,
  } = options;

  if (!useMerchFeedPreview) {
    try {
      return await fetchSaleProductsDirect({
        fiber,
        fiberSubtype,
        maxPrice,
        minPrice,
        category,
        color,
        brand,
        market,
        sort,
        limit,
        offset,
        skipTotal,
      });
    } catch (err) {
      console.warn("[fetchSaleProducts] direct sale query failed:", err);
      return { products: [], total: 0, hasMore: false };
    }
  }

  if (useMerchFeedPreview) {
    try {
      const { fetchMerchRailProducts, MERCH_RAIL_KEYS } = await import("./merch-feed");
      const feedCap = maxSourceRows != null ? Math.min(maxSourceRows, 120) : 200;
      const feedProducts = await fetchMerchRailProducts(MERCH_RAIL_KEYS.sale, { limit: feedCap });
      if (feedProducts.length > 0) {
        const ids = feedProducts.map((p) => p.id).filter(Boolean);
        const { data: liveRows } = await liveProductsApparelFrom(supabase)
          .select(PRODUCT_CARD_COLS)
          .in("id", ids);
        const liveById = new Map((liveRows || []).map((r: any) => [String(r.id), r]));
        let products = feedProducts.map((fp) => {
          const live = liveById.get(fp.id);
          return live ? mapProductRow(live) : { ...fp, isSale: true };
        });
        products = applySaleProductFilters(products, { fiber, maxPrice, category });
        if (products.length > 0) {
          const page = products.slice(offset, offset + limit);
          const full = products.length;
          return {
            products: page,
            total: skipTotal ? null : full,
            hasMore: skipTotal
              ? page.length >= limit
              : saleHasMore(page.length, offset, full),
          };
        }
      }
    } catch (err) {
      console.warn("[fetchSaleProducts] merch feed path failed:", err);
    }
  }

  return { products: [], total: 0, hasMore: false };
}

export async function fetchBrandStats(): Promise<
  { slug: string; name: string; count: number; avgNaturalFiber: number }[]
> {
  const brands = await fetchShoppableBrands({ maxBrands: 1200 });
  if (brands.length >= 50) {
    return brands.map((b) => ({
      slug: b.slug,
      name: b.name,
      count: b.count,
      avgNaturalFiber: b.avgNaturalFiber,
    }));
  }

  const supabase = getServerSupabase();
  if (!supabase) return brands.map((b) => ({ slug: b.slug, name: b.name, count: b.count, avgNaturalFiber: b.avgNaturalFiber }));

  const { data, error } = await supabase
    .from("designers")
    .select("slug, name, product_count, natural_fiber_percent")
    .eq("is_live", true)
    .gte("product_count", SHOPPABLE_MIN_PRODUCTS)
    .order("name");

  if (error || !data?.length) {
    return brands.map((b) => ({
      slug: b.slug,
      name: b.name,
      count: b.count,
      avgNaturalFiber: b.avgNaturalFiber,
    }));
  }

  return data.map((row: any) => ({
    slug: String(row.slug || "").toLowerCase(),
    name: sanitizeBrandName(String(row.name || row.slug || "")),
    count: Number(row.product_count) || 0,
    avgNaturalFiber: Number(row.natural_fiber_percent) || 0,
  }));
}
