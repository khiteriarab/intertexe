import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sanitizeBrandName } from "./brand-display";
import { displayNaturalFiberPercent } from "./display-natural-fiber";
import { consumerExclusionForRow, filterConsumerCatalogProducts } from "./catalog-consumer-guard";

/** Service client without generated `Database` types — catalog RPCs are not declared on the default client. */
type UntypedSupabase = SupabaseClient<any, "public", any>;
import { logSupabaseTiming } from "./supabase-timing";
import {
  garmentTypesForShopCategory,
  materialPrimaryForShopFiber,
  rowMatchesGarmentFilter,
} from "./catalog-shop-mappings";
import {
  CATALOG_INITIAL_PAGE,
  CATALOG_PAGE_SIZE,
  classifyGarment,
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

export { CATALOG_INITIAL_PAGE, CATALOG_PAGE_SIZE };

/** Service client without generated `Database` types — catalog RPCs are not declared on the default client. */
type UntypedSupabase = SupabaseClient<any, "public", any>;

/** When `preferLiveOnly`, skip catalog RPCs and query `live_products_apparel` (faster homepage / emergency path).
 *  `liveRowCap` limits rows loaded on the live-only / fallback path (homepage). */
export type CatalogFetchOpts = {
  preferLiveOnly?: boolean;
  liveRowCap?: number;
};

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || "";
}

function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function getAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || "";
}

export function getServerSupabase() {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey() || getAnonKey();
  if (!url || !key) {
    console.warn("Missing Supabase environment variables — returning null client. Checked: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, VITE_SUPABASE_URL");
    return null;
  }
  return createClient(url, key);
}

export interface Designer {
  id: string;
  name: string;
  slug: string;
  status: string;
  naturalFiberPercent: number | null;
  description: string | null;
  website: string | null;
  createdAt: string | null;
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
  matchingSetId?: string | null;
  isSale?: boolean;
  originalPrice?: string | null;
  /** Used for formatting bare numeric DB prices ($ / € / £). */
  listingRegion?: string | null;
  collectionSlugs?: string[];
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
export function catalogRegionsFromMarket(market?: string): { preferred: string; fallback: string } {
  if (market === "eu-uk-me") return { preferred: "uk", fallback: "us" };
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

function normTokenCatalog(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function catalogNormalizeImageUrl(pImageUrl: string | null | undefined): string | null {
  if (!pImageUrl) return null;
  const trimmed = String(pImageUrl).split("#")[0].split("?")[0].trim().toLowerCase();
  return trimmed || null;
}

function catalogDedupeKey(row: any): string {
  const img = catalogNormalizeImageUrl(row.image_url);
  if (img) return `img:${img}`;
  const b = normTokenCatalog(row.brand_name || "");
  const n = normTokenCatalog(row.name || "");
  const c = normTokenCatalog(row.composition || "");
  if (b && n && c) return `identity:${b}|${n}|${c}`;
  const pid = String(row.product_id || "").trim().toLowerCase();
  if (pid) return `pid:${pid}`;
  return `id:${row.id}`;
}

function catalogRegionRank(region: string | null | undefined, preferred: string): number {
  const r = (region || "us").toLowerCase();
  const p = (preferred || "us").toLowerCase();
  if (r === p) return 0;
  if (r === "us") return 1;
  if (r === "uk") return 2;
  if (r === "eu") return 3;
  return 4;
}

function pickDedupeWinner(rows: any[], preferred: string, fallback: string): any {
  return [...rows].sort((a: any, b: any) => {
    const d = catalogRegionRank(a.region, preferred) - catalogRegionRank(b.region, preferred);
    if (d !== 0) return d;
    const df = catalogRegionRank(a.region, fallback) - catalogRegionRank(b.region, fallback);
    if (df !== 0) return df;
    const nfp = (b.natural_fiber_percent || 0) - (a.natural_fiber_percent || 0);
    if (nfp !== 0) return nfp;
    const ca = new Date(a.created_at || 0).getTime();
    const cb = new Date(b.created_at || 0).getTime();
    return cb - ca;
  })[0];
}

function dedupeLiveApparelRows(rows: any[], preferred: string, fallback: string): any[] {
  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const key = catalogDedupeKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return Array.from(groups.values()).map((g) => pickDedupeWinner(g, preferred, fallback));
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
    console.warn("catalog_list RPC failed, using live_products_apparel fallback:", error.message);
    return null;
  }
  return (data || []) as any[];
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
}

/** Fiber / category grids (materials hubs) — region winners US, no storefront market narrowing. */
export async function fetchCatalogProductsByFiber(opts: {
  fiber: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<Product[]> {
  const supabase = getServerSupabase();
  const { fiber, category, limit = 200, offset = 0 } = opts;
  if (!supabase) return [];

  let rows =
    (await rpcCatalogList(supabase, {
      preferred: "us",
      fallback: "us",
      fiber,
      category: category || null,
      brandSlug: null,
      search: null,
      minNfp: 80,
      limit,
      offset,
    })) || [];

  if (rows.length === 0) {
    rows = await catalogListLiveFallback(supabase, {
      fiber,
      category,
      limit,
      offset,
      minNfp: 80,
    });
  }

  return rows
    .filter((row: any) => isClothingProduct(row) && isNotMensProduct(row))
    .map(mapProductRow);
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
    let q = supabase
      .from("live_products_apparel")
      .select("*")
      .gte("natural_fiber_percent", opts.minNfp ?? 80);
    const material = materialPrimaryForShopFiber(opts.fiber);
    if (material) q = q.ilike("composition", `%${material}%`);
    if (opts.brandSlug) q = q.eq("brand_slug", opts.brandSlug);
    if (opts.search?.trim()) {
      const s = opts.search.trim();
      q = q.or(`name.ilike.%${s}%,brand_name.ilike.%${s}%,composition.ilike.%${s}%`);
    }
    const { data, error } = await q
      .order("natural_fiber_percent", { ascending: false })
      .order("created_at", { ascending: false })
      .range(dbOffset, dbOffset + chunkSize - 1);
    if (error || !data?.length) break;
    dbOffset += data.length;

    const filtered = data.filter((row: any) => offerCompletenessStatus(row) === "complete");
    const fiberMatched = filtered.filter((row: any) => rowMatchesShopFiber(opts.fiber, row));
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
      const { data: fb } = await supabase
        .from("live_products_apparel")
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
    const { data: fb } = await supabase
      .from("live_products_apparel")
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
      const { data: fb } = await supabase
        .from("live_products_apparel")
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
    const { data: fb } = await supabase
      .from("live_products_apparel")
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
    const [linenResult, cottonResult] = await Promise.all([
      fetchShopProducts({ fiber: "linen", category, limit: catalogLimit * 2, offset }),
      fetchShopProducts({ fiber: "cotton", category, limit: catalogLimit * 2, offset: 0 }),
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
    catalogTotal = Math.max(linenResult.total, 0) + Math.max(cottonResult.total, 0);
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
      catalogTotal: collection.catalogTotal,
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

  const { products: raw, total } = await fetchShopProducts({
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
  let editCount = total;
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
  opts?: { limit?: number; offset?: number }
): Promise<{
  products: Product[];
  editCount: number;
  catalogTotal: number;
  heroImageUrl: string;
} | null> {
  const { getCollectionConfig } = await import("./collection-pages");
  const config = getCollectionConfig(slug);
  if (!config) return null;

  const { paginateCollectionCatalog } = await import("./collection-catalog");
  const collectionSlug = slug as import("./collection-pages").CollectionSlug;
  const limit = Math.min(Math.max(opts?.limit ?? 56, 1), 100);
  const offset = Math.max(opts?.offset ?? 0, 0);

  const ranked = await getCachedRankedCollectionPool(collectionSlug);
  const products = paginateCollectionCatalog(ranked, limit, offset);
  const editCount = ranked.length;

  return {
    products,
    editCount,
    catalogTotal: editCount,
    heroImageUrl: config.editorialImage,
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

function mapProductRow(row: any): Product {
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
    matchingSetId: row.matching_set_id || null,
    isSale: rowIsOnSale(row),
    originalPrice: origStr,
    listingRegion: row.region != null && row.region !== "" ? String(row.region) : null,
    collectionSlugs: Array.isArray(row.collection_slugs)
      ? row.collection_slugs.map((s: unknown) => String(s))
      : [],
  };
}

const COLLECTION_POOL_LIMIT_PER_QUERY = 100;
const COLLECTION_POOL_PAGES_PER_QUERY = 2;

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
        const id = p.productId || p.id;
        if (seen.has(id)) continue;
        seen.add(id);
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
    query = supabase.from("live_products_apparel").select("*").eq("product_id", id);
  } else if (isUUID) {
    query = supabase.from("live_products_apparel").select("*").eq("id", id);
  } else {
    query = supabase.from("live_products_apparel").select("*").eq("id", id);
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
  return mapProductRow(row);
}

export async function fetchProductsByFiberAndCategory(
  fiber: string,
  category?: string,
  limit = 200,
  offset = 0
): Promise<Product[]> {
  const { fetchMerchRailProducts, isMerchFeedEnabled, MATERIAL_SLUG_TO_RAIL } =
    await import("./merch-feed");

  const primaryFiber = fiber.split(",")[0]?.trim().toLowerCase();
  const railKey = primaryFiber ? MATERIAL_SLUG_TO_RAIL[primaryFiber] : undefined;

  if (isMerchFeedEnabled() && railKey && !category && offset === 0) {
    const rows = await fetchMerchRailProducts(railKey, { limit: Math.min(limit, 64) });
    if (rows.length > 0) {
      return rows.filter((p) => isClothingProduct(p) && isNotMensProduct(p));
    }
  }

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
    .filter(isClothingProduct)
    .filter(isNotMensProduct)
    .slice(0, limit);
}

function priceListedRow(row: any): boolean {
  const p = row.price;
  if (p == null || p === "" || p === "$0.00" || p === "0") return false;
  if (!row.image_url || String(row.image_url).trim() === "") return false;
  return true;
}

export async function fetchProductsByBrand(
  brandSlug: string,
  opts?: CatalogFetchOpts
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const cap = Math.min(Math.max(1, opts?.liveRowCap ?? 500), 500);

  let rows: any[] = [];
  if (!opts?.preferLiveOnly) {
    rows =
      (await rpcCatalogList(supabase, {
        preferred: "us",
        fallback: "us",
        fiber: null,
        category: null,
        brandSlug,
        search: null,
        minNfp: 80,
        limit: cap,
        offset: 0,
      })) || [];
  }
  if (rows.length === 0) {
    const tLive = Date.now();
    const { data } = await supabase
      .from("live_products_apparel")
      .select("*")
      .eq("brand_slug", brandSlug)
      .gte("natural_fiber_percent", 80)
      .order("natural_fiber_percent", { ascending: false })
      .limit(cap);
    logSupabaseTiming(`live live_products_apparel brand=${brandSlug}`, tLive, `rows:${(data || []).length}`);
    rows = dedupeLiveApparelRows(data || [], "us", "us");
  }

  return rows.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
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
    let fb = supabase.from("live_products_apparel").select("*").gte("natural_fiber_percent", 80);
    if (category) fb = fb.eq("category", category);
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
  const { data, error } = await supabase
    .from("live_products_apparel")
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

export async function fetchProductCount(): Promise<number> {
  const { fetchMerchGlobalDisplayCount, isMerchFeedEnabled } = await import("./merch-feed");
  if (isMerchFeedEnabled()) {
    const n = await fetchMerchGlobalDisplayCount();
    if (n > 0) return n;
  }

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

  const { count, error } = await supabase
    .from("live_products_apparel")
    .select("id", { count: "exact", head: true })
    .gte("natural_fiber_percent", 80);
  if (!error && count != null) return count;
  return 0;
}

/** Per-material hub count — catalog_material_hub_counts, then merch meta, then RPC. */
export async function fetchMaterialHubDisplayCount(
  materialSlug: string,
  category?: string
): Promise<number> {
  const supabase = getServerSupabase();
  if (supabase) {
    const { data: hub } = await supabase
      .from("catalog_material_hub_counts")
      .select("card_count")
      .eq("fiber", materialSlug)
      .eq("category", category || "")
      .maybeSingle();
    if (hub?.card_count != null && Number(hub.card_count) > 0) {
      return Number(hub.card_count);
    }
  }

  const { fetchMerchRailDisplayCount, MATERIAL_SLUG_TO_RAIL } = await import("./merch-feed");
  const railKey = MATERIAL_SLUG_TO_RAIL[materialSlug];
  if (!railKey) return 0;
  const n = await fetchMerchRailDisplayCount(railKey);
  if (n > 0) return n;

  if (supabase) {
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
    const { data, error } = await supabase
      .from("live_products_apparel")
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
  const { data, error } = await supabase
    .from("live_products_apparel")
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
    rows =
      (await rpcCatalogList(supabase, {
        preferred: "us",
        fallback: "us",
        fiber,
        category: null,
        brandSlug: null,
        search: null,
        minNfp: 80,
        limit,
        offset: 0,
      })) || [];
  }
  if (rows.length === 0) {
    const tLive = Date.now();
    const { data } = await supabase
      .from("live_products_apparel")
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
  const rows = await fetchProductsByBrand(brandSlug, opts);
  return rows
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

  let query = supabase
    .from("live_products_apparel")
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

  scored.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return (b.row.natural_fiber_percent || 0) - (a.row.natural_fiber_percent || 0);
  });

  return scored.slice(0, limit).map(({ row }) => mapProductRow(row));
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
      supabase
        .from("live_products_apparel")
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

export async function fetchShopProducts(options: {
  fiber?: string;
  category?: string;
  market?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ products: Product[]; total: number }> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: 0 };
  const { fiber, category, market, sort = "recommended", limit = 60, offset = 0, search } = options;
  const isPriceSort = sort === "price-low" || sort === "price-high";
  const { preferred, fallback } = catalogRegionsFromMarket(market);

  const searchSynonyms: Record<string, string[]> = {
    jeans: ["jean", "denim"],
    jean: ["jeans", "denim"],
    denim: ["jean", "jeans"],
  };

  let searchTerms: string[] = [];
  if (search && search.trim().length >= 2) {
    const s = search.trim().toLowerCase();
    searchTerms = [s, ...(searchSynonyms[s] || [])];
  }

  const searchRpc = searchTerms.length > 0 ? searchTerms[0] : null;

  const rpcFiber = fiber && fiber !== "all" ? fiber : null;
  const rpcCategory = category && category !== "all" ? category : null;

  if (!isPriceSort) {
    let rows =
      (await rpcCatalogList(supabase, {
        preferred,
        fallback,
        fiber: rpcFiber,
        category: rpcCategory,
        brandSlug: null,
        search: searchRpc,
        minNfp: 80,
        limit,
        offset,
      })) || [];

    if (rows.length === 0) {
      rows = await catalogListLiveFallback(supabase, {
        fiber: rpcFiber,
        category: rpcCategory,
        search: searchRpc,
        limit,
        offset,
        minNfp: 80,
        preferred,
        fallback,
      });
    }

    let filtered = rows.filter(priceListedRow).filter((row: any) => passesMarketRawRow(row, market));
    if (filtered.length === 0 && market && market !== "all" && rows.length > 0) {
      const broad = rows.filter(priceListedRow).filter((row: any) => passesMarketRawRow(row, undefined));
      if (broad.length > 0) filtered = broad;
    }

    let total =
      (await rpcCatalogListCount(supabase, {
        preferred,
        fallback,
        fiber: rpcFiber,
        category: rpcCategory,
        brandSlug: null,
        search: searchRpc,
        minNfp: 80,
      })) ?? null;
    if (total == null) {
      total = await catalogListCountLiveFallback(supabase, {
        fiber: rpcFiber,
        category: rpcCategory,
        search: searchRpc,
        minNfp: 80,
        preferred,
        fallback,
      });
    }
    if (!total || total < filtered.length) total = filtered.length;

    let mapped = filterConsumerCatalogProducts(
      filtered.filter(passesWomensCatalogRow).map(mapProductRow)
    );
    if (rpcFiber) {
      mapped = mapped.filter((p) => productBodyMatchesFiber(p.composition || "", rpcFiber));
    }

    let resolvedTotal = total;
    if (rpcFiber) {
      const counted = await rpcCatalogListCount(supabase, {
        preferred,
        fallback,
        fiber: rpcFiber,
        category: rpcCategory,
        brandSlug: null,
        search: searchRpc,
        minNfp: 80,
      });
      if (counted != null && counted > 0) resolvedTotal = counted;
    }

    return {
      products: mapped,
      total: resolvedTotal,
    };
  }

  let allRows = await fetchShopLiveApparelAllRows(supabase, {
    market,
    rpcFiber,
    rpcCategory,
    searchTerms,
  });

  let deduped = dedupeLiveApparelRows(allRows, preferred, fallback)
    .filter(priceListedRow)
    .filter((row: any) => passesMarketRawRow(row, market))
    .filter(isClothingProduct)
    .filter(isNotMensProduct);

  if (deduped.length === 0 && market) {
    const { preferred: p0, fallback: f0 } = catalogRegionsFromMarket(undefined);
    allRows = await fetchShopLiveApparelAllRows(supabase, {
      market: undefined,
      rpcFiber,
      rpcCategory,
      searchTerms,
    });
    deduped = dedupeLiveApparelRows(allRows, p0, f0)
      .filter(priceListedRow)
      .filter((row: any) => passesMarketRawRow(row, undefined))
      .filter(isClothingProduct)
      .filter(isNotMensProduct);
  }

  deduped.sort((a: any, b: any) => {
    const pa = parsePrice(a.price);
    const pb = parsePrice(b.price);
    return sort === "price-low" ? pa - pb : pb - pa;
  });

  return {
    products: deduped.slice(offset, offset + limit).map(mapProductRow),
    total: deduped.length,
  };
}

const PRODUCT_CARD_COLS = "id, brand_slug, brand_name, name, product_id, url, image_url, price, composition, natural_fiber_percent, category, is_sale, original_price";

export async function fetchMoreFromBrand(
  productId: string,
  brandSlug: string,
  limit = 4
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("live_products_apparel")
    .select(PRODUCT_CARD_COLS)
    .eq("brand_slug", brandSlug)
    .neq("id", productId)
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
}

export async function fetchMoreInFiber(
  productId: string,
  composition: string | null,
  limit = 4
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase || !composition) return [];
  const fibers = ["silk", "cotton", "linen", "wool", "cashmere", "merino", "mohair", "alpaca", "hemp"];
  const lower = composition.toLowerCase();
  const primaryFiber = fibers.find((f) => lower.includes(f));
  if (!primaryFiber) return [];
  const { data, error } = await supabase
    .from("live_products_apparel")
    .select(PRODUCT_CARD_COLS)
    .neq("id", productId)
    .ilike("composition", `%${primaryFiber}%`)
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .order("natural_fiber_percent", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.filter(isClothingProduct).filter(isNotMensProduct).map(mapProductRow);
}

export async function fetchMoreAtPrice(
  productId: string,
  price: string | null,
  limit = 4
): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase || !price) return [];
  const numPrice = parseFloat(price.replace(/[^0-9.]/g, ""));
  if (!numPrice || numPrice <= 0) return [];
  const low = numPrice * 0.8;
  const high = numPrice * 1.2;
  const { data, error } = await supabase
    .from("live_products_apparel")
    .select(PRODUCT_CARD_COLS)
    .neq("id", productId)
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .order("natural_fiber_percent", { ascending: false })
    .limit(60);
  if (error || !data) return [];
  const filtered = data
    .filter(isClothingProduct)
    .filter(isNotMensProduct)
    .filter((row: any) => {
      const p = parseFloat((row.price || "0").replace(/[^0-9.]/g, ""));
      return p >= low && p <= high;
    });
  return filtered.slice(0, limit).map(mapProductRow);
}

function applySaleProductFilters(
  products: Product[],
  opts: { fiber?: string; maxPrice?: number }
): Product[] {
  let filtered = products.filter((p) => p.imageUrl && p.price);
  if (opts.fiber && opts.fiber !== "all") {
    const needle = opts.fiber.toLowerCase();
    filtered = filtered.filter((p) => (p.composition || "").toLowerCase().includes(needle));
  }
  if (opts.maxPrice) {
    filtered = filtered.filter((p) => {
      const pr = parseMoneyValue(p.price);
      return pr > 0 && pr <= opts.maxPrice!;
    });
  }
  return filtered;
}

export async function fetchSaleProducts(options: {
  fiber?: string;
  maxPrice?: number;
  limit?: number;
  offset?: number;
  /** Stop scanning after this many raw rows (homepage perf; sale page omits for full grid). */
  maxSourceRows?: number;
}): Promise<{ products: Product[]; total: number }> {
  const supabase = getServerSupabase();
  if (!supabase) return { products: [], total: 0 };
  const { fiber, maxPrice, limit = 60, offset = 0, maxSourceRows } = options;
  const dedupePreferred = "us";
  const dedupeFallback = "us";

  // Prefer homepage merchandising cache (same rail as homepage "On Sale" section).
  try {
    const { fetchMerchRailProducts, MERCH_RAIL_KEYS } = await import("./merch-feed");
    const feedCap = maxSourceRows != null ? Math.min(maxSourceRows, 120) : 200;
    const feedProducts = await fetchMerchRailProducts(MERCH_RAIL_KEYS.sale, { limit: feedCap });
    if (feedProducts.length > 0) {
      const ids = feedProducts.map((p) => p.id).filter(Boolean);
      const { data: liveRows } = await supabase
        .from("live_products_apparel")
        .select(PRODUCT_CARD_COLS)
        .in("id", ids);
      const liveById = new Map((liveRows || []).map((r: any) => [String(r.id), r]));
      let products = feedProducts.map((fp) => {
        const live = liveById.get(fp.id);
        return live ? mapProductRow(live) : { ...fp, isSale: true };
      });
      products = applySaleProductFilters(products, { fiber, maxPrice });
      if (products.length > 0) {
        return {
          products: products.slice(offset, offset + limit),
          total: products.length,
        };
      }
    }
  } catch (err) {
    console.warn("[fetchSaleProducts] merch feed path failed:", err);
  }

  const pageSize = 1000;
  let allRows: any[] = [];
  let qOffset = 0;
  while (true) {
    if (maxSourceRows != null && allRows.length >= maxSourceRows) break;
    let q = supabase
      .from("live_products_apparel")
      .select("*")
      .gte("natural_fiber_percent", 80)
      .not("image_url", "is", null)
      .not("price", "is", null)
      .not("original_price", "is", null);
    if (fiber && fiber !== "all") {
      q = q.ilike("composition", `%${fiber}%`);
    }
    const rangeEnd =
      maxSourceRows != null
        ? qOffset + Math.min(pageSize, Math.max(0, maxSourceRows - allRows.length)) - 1
        : qOffset + pageSize - 1;
    if (maxSourceRows != null && rangeEnd < qOffset) break;
    q = q.order("natural_fiber_percent", { ascending: false }).range(qOffset, rangeEnd);
    const { data: chunk, error } = await q;
    if (error || !chunk || chunk.length === 0) break;
    allRows.push(...chunk.filter(rowIsOnSale));
    if (chunk.length < rangeEnd - qOffset + 1) break;
    if (maxSourceRows != null && allRows.length >= maxSourceRows) break;
    qOffset += chunk.length;
  }

  // Also pull explicit is_sale rows when discount scan is capped (homepage).
  if (maxSourceRows != null && allRows.length < maxSourceRows) {
    const { data: flagged } = await supabase
      .from("live_products_apparel")
      .select("*")
      .eq("is_sale", true)
      .gte("natural_fiber_percent", 80)
      .not("image_url", "is", null)
      .not("price", "is", null)
      .limit(Math.max(0, maxSourceRows - allRows.length));
    if (flagged?.length) allRows.push(...flagged);
  }

  let data = dedupeLiveApparelRows(allRows, dedupePreferred, dedupeFallback);
  if (data.length === 0) return { products: [], total: 0 };

  let filtered = data
    .filter((row: any) => isClothingProduct(row) && isNotMensProduct(row) && rowIsOnSale(row));

  if (maxPrice) {
    filtered = filtered.filter((row: any) => {
      const p = parseFloat((row.price || "0").replace(/[^0-9.]/g, ""));
      return p > 0 && p <= maxPrice;
    });
  }

  const brandGroups: Record<string, any[]> = {};
  for (const row of filtered) {
    const b = row.brand_slug || "other";
    if (!brandGroups[b]) brandGroups[b] = [];
    brandGroups[b].push(row);
  }
  const queues = Object.values(brandGroups);
  const interleaved: any[] = [];
  let round = 0;
  while (interleaved.length < filtered.length) {
    let added = false;
    for (const q of queues) {
      if (round < q.length) {
        interleaved.push(q[round]);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }

  return {
    products: interleaved.slice(offset, offset + limit).map(mapProductRow),
    total: interleaved.length,
  };
}

function mapBrandDirectoryRows(
  rows: { brand_slug: string; brand_name: string; product_count: number; avg_natural_fiber: number }[]
): { slug: string; name: string; count: number; avgNaturalFiber: number }[] {
  return rows
    .map((r) => ({
      slug: r.brand_slug,
      name: sanitizeBrandName(r.brand_name || r.brand_slug),
      count: Number(r.product_count) || 0,
      avgNaturalFiber: Number(r.avg_natural_fiber) || 0,
    }))
    .filter((b) => b.slug && b.count >= 2);
}

/** Fallback when catalog_brand_directory RPC is not deployed yet. */
async function fetchBrandStatsFromCatalogScan(
  supabase: ReturnType<typeof getServerSupabase>,
  limit = 800,
  maxPages = 3
): Promise<{ slug: string; name: string; count: number; avgNaturalFiber: number }[]> {
  if (!supabase) return [];

  const agg = new Map<string, { name: string; count: number; nfpSum: number }>();
  const pageSize = 1000;
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const { data, error } = await supabase
      .from("live_products_apparel")
      .select("brand_slug, brand_name, natural_fiber_percent, image_url, price")
      .gte("natural_fiber_percent", 80)
      .not("brand_slug", "is", null)
      .not("image_url", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error || !data?.length) break;

    for (const row of data) {
      const slug = String(row.brand_slug || "").trim();
      if (!slug) continue;
      const price = parseMoneyValue(row.price);
      const image = String(row.image_url || "").trim();
      if (!image || price <= 0) continue;

      const nfp = Number(row.natural_fiber_percent) || 0;
      const name = sanitizeBrandName(String(row.brand_name || slug));
      const cur = agg.get(slug) || { name, count: 0, nfpSum: 0 };
      cur.count += 1;
      cur.nfpSum += nfp;
      if (!cur.name && name) cur.name = name;
      agg.set(slug, cur);
    }

    offset += data.length;
    if (data.length < pageSize) break;
  }

  return [...agg.entries()]
    .map(([slug, v]) => ({
      slug,
      name: v.name || slug,
      count: v.count,
      avgNaturalFiber: v.count > 0 ? Math.round(v.nfpSum / v.count) : 0,
    }))
    .filter((b) => b.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function fetchBrandStats(): Promise<{ slug: string; name: string; count: number; avgNaturalFiber: number }[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const t0 = Date.now();
  try {
    const rpcResult = await Promise.race([
      supabase.rpc("catalog_brand_directory", { p_limit: 400 }),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 10_000)
      ),
    ]);
    const { data: rpcRows, error } = rpcResult;
    logSupabaseTiming(
      "rpc catalog_brand_directory",
      t0,
      error ? `error:${error.message}` : `rows:${(rpcRows || []).length}`
    );

    if (!error && rpcRows?.length) {
      return mapBrandDirectoryRows(
        rpcRows as { brand_slug: string; brand_name: string; product_count: number; avg_natural_fiber: number }[]
      );
    }
  } catch (e: any) {
    logSupabaseTiming("rpc catalog_brand_directory", t0, `error:${e?.message || "failed"}`);
  }

  const t1 = Date.now();
  const scanned = await fetchBrandStatsFromCatalogScan(supabase, 400, 2);
  logSupabaseTiming("fetchBrandStats catalog scan fallback", t1, `rows:${scanned.length}`);
  return scanned;
}
