import { NextRequest, NextResponse } from "next/server";
import {
  fetchSaleProducts,
  fetchVacationPageData,
  fetchEditPageData,
  fetchCollectionPageData,
  fetchProductsByBrand,
  getServerSupabase,
} from "../../../lib/supabase-server";
import {
  COLLECTION_CANONICAL_SLUGS,
  queryLiveCatalog,
} from "../../../lib/catalog-direct-query";
import { CATALOG_PAGE_SIZE } from "../../../lib/catalog-rules";
import {
  safeCatalogLimit,
  safeCatalogOffset,
  catalogHasMore,
} from "../../../lib/catalog-fetch-limits";

export const dynamic = "force-dynamic";
export const revalidate = 60;
const COLLECTION_FALLBACK_MIN_PRODUCTS = 3;
const PRODUCT_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  "CDN-Cache-Control": "public, s-maxage=60",
  "Vercel-CDN-Cache-Control": "public, s-maxage=60",
  Vary: "Accept-Encoding",
};

const CACHE_TTL_MS = 300_000;
type CatalogCacheEntry = { data: Record<string, unknown>; timestamp: number };
const catalogMemoryCache =
  ((globalThis as typeof globalThis & { __catalogMemoryCache?: Map<string, CatalogCacheEntry> }).__catalogMemoryCache ??=
    new Map<string, CatalogCacheEntry>());
function catalogOk(
  body: Record<string, unknown>,
  init?: {
    status?: number;
    cacheStatus?: "HIT" | "MISS";
    cacheKey?: string;
    source?: string;
  }
) {
  if (init?.cacheKey) {
    catalogMemoryCache.set(init.cacheKey, { data: body, timestamp: Date.now() });
  }
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      ...PRODUCT_CACHE_HEADERS,
      "x-cache": init?.cacheStatus ?? "MISS",
      "X-Cache-Source": init?.source ?? "live",
    },
  });
}

function catalogTimeoutResponse(limit: number, offset: number, cacheKey?: string) {
  return catalogOk({
    products: [],
    total: null,
    limit,
    offset,
    hasMore: false,
    error: "timeout",
    message: "Query took too long — try filtering by material or category",
  }, { cacheKey });
}

function catalogFailedResponse(limit: number, offset: number, cacheKey?: string) {
  return catalogOk({
    products: [],
    total: null,
    limit,
    offset,
    hasMore: false,
    error: "failed",
  }, { cacheKey });
}

/** API totals must be numeric for pagination — never omit when count is available. */
function catalogTotalValue(
  total: number | null | undefined,
  productsLength: number,
  offset: number,
  skipCount: boolean
): number | null {
  if (skipCount) return null;
  if (total != null && total >= 0) return total;
  return offset + productsLength;
}

function catalogPreferredRegionFromParams(sp: URLSearchParams): string | undefined {
  const region = sp.get("region") || sp.get("catalogRegion");
  const normalized = region?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "ca" || normalized === "canada") return "ca";
  if (normalized === "eu") return "eu";
  if (normalized === "uk" || normalized === "gb") return "uk";
  if (normalized === "us" || normalized === "usa") return "us";
  return undefined;
}

function catalogMarketFromParams(sp: URLSearchParams): string | undefined {
  const region = sp.get("region");
  if (region) {
    const normalized = region.trim().toLowerCase();
    const r = normalized.toUpperCase();
    if (r === "EU") return "eu-uk-me";
    if (r === "UK" || r === "GB") return "eu-uk-me";
    if (r === "US" || r === "CA" || normalized === "canada") return "us-ca";
  }
  const market = sp.get("market");
  return market && market !== "all" ? market : undefined;
}

async function fetchCollectionWithFallback(slug: string, limit: number, offset: number, skipTotal: boolean) {
  const direct = await queryLiveCatalog({
    region: "us",
    collection: slug,
    limit,
    offset,
    skipCount: skipTotal,
    sort: "new",
  });
  if (!direct.error && direct.products.length > 0) {
    let total = direct.total;
    const counted = await fetchCollectionTotalFromDB(slug, "us");
    if (counted != null) total = counted;
    const pageConfig = await import("../../../lib/collection-pages").then((m) => m.getCollectionConfig(slug));
    return {
      products: direct.products,
      editCount: total ?? direct.products.length,
      catalogTotal: skipTotal ? null : total,
      heroImageUrl: pageConfig?.editorialImage ?? "",
      hasMore: direct.hasMore,
    };
  }

  const data = await fetchCollectionPageData(slug, {
    limit,
    offset,
    skipTotal,
  });
  if (!data) return null;
  if (data.products.length >= COLLECTION_FALLBACK_MIN_PRODUCTS) return data;

  let fallbackOpts: Parameters<typeof queryLiveCatalog>[0] | null = null;
  if (slug === "tailoring") {
    fallbackOpts = { region: "us", category: "outerwear", sort: "new", limit, offset: 0, skipCount: true };
  } else if (slug === "summer-in-the-city") {
    fallbackOpts = { region: "us", fiber: "linen", limit, offset: 0, skipCount: true };
  } else if (slug === "white-edit") {
    fallbackOpts = { region: "us", search: "white", sort: "new", limit, offset: 0, skipCount: true };
  }

  const fallbackProducts = fallbackOpts
    ? (await queryLiveCatalog(fallbackOpts)).products
    : [];

  if (fallbackProducts.length === 0) return data;
  const merged = [...data.products];
  const seen = new Set(merged.map((p) => p.productId || p.id));
  for (const p of fallbackProducts) {
    const key = p.productId || p.id;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(p);
    if (merged.length >= limit) break;
  }
  return {
    ...data,
    products: merged.slice(0, limit),
  };
}

async function fetchCollectionTotalFromDB(collection: string, region: string) {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  const slugs = COLLECTION_CANONICAL_SLUGS[collection] || [collection];
  let countQuery = supabase
    .from("live_products_apparel")
    .select("id", { count: "exact", head: true })
    .eq("region", region);

  if (collection === "white-edit") {
    const slugConditions = slugs.map((slug) => `collection_slugs.cs.{${slug}}`);
    slugConditions.push("color.in.(white,ivory,cream,ecru,off-white)");
    countQuery = countQuery.or(slugConditions.join(","));
  } else {
    countQuery = countQuery.overlaps("collection_slugs", slugs);
  }

  const primary = await countQuery;
  return primary.count ?? null;
}


export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const cacheKey = request.url;
  const cached = catalogMemoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return catalogOk(cached.data, { cacheStatus: "HIT" });
  }

  const respond = (
    body: Record<string, unknown>,
    init?: { status?: number; source?: string }
  ) => catalogOk(body, { ...init, cacheStatus: "MISS", cacheKey, source: init?.source });

  const collectionAlias = sp.get("collection");
  const brandAlias = sp.get("brand");
  const slugParam = sp.get("slug");
  const explicitMode = sp.get("mode");
  const fiber = sp.get("fiber") || undefined;
  const searchAlias = sp.get("q") || undefined;
  const mode = explicitMode
    || (collectionAlias ? "collection" : undefined)
    || (brandAlias ? "brand" : undefined)
    || "shop";
  const collectionSlug = slugParam || collectionAlias || "";
  const brandSlug = slugParam || brandAlias || "";
  const limit = safeCatalogLimit(sp.get("limit"), CATALOG_PAGE_SIZE);
  const offset = safeCatalogOffset(sp.get("offset"));
  const category = sp.get("category") || undefined;
  const market = catalogMarketFromParams(sp);
  const catalogRegion = catalogPreferredRegionFromParams(sp);
  const sort = sp.get("sort") || "new";
  const search = sp.get("search") || searchAlias;
  const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;
  const minPrice = sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined;
  const color = sp.get("color") || undefined;
  const searchTerms = (search || "")
    .toLowerCase()
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  /** Small first-page catalog previews skip the expensive count RPC (not collection mode). */
  const skipCount =
    sp.get("skipCount") === "1" ||
    (mode !== "collection" && limit <= 48 && offset === 0);

  try {
    const region = catalogRegion || "us";

    if (mode === "brand") {
      const result = await fetchProductsByBrand(brandSlug, {
        limit,
        offset,
        skipTotal: skipCount,
        region: catalogRegion || "us",
      });
      if (result.error === "timeout") return catalogTimeoutResponse(limit, offset, cacheKey);
      const brandTotal = catalogTotalValue(
        result.total,
        result.products.length,
        offset,
        skipCount
      );
      return respond({
        products: result.products,
        total: brandTotal,
        limit,
        offset,
        hasMore: catalogHasMore(result.products.length, limit, offset, brandTotal),
      });
    }

    if (mode === "sale") {
      const result = await fetchSaleProducts({
        fiber: fiber && fiber !== "all" ? fiber : undefined,
        maxPrice,
        limit,
        offset,
        useMerchFeedPreview: false,
        skipTotal: skipCount,
      });
      const total = catalogTotalValue(result.total, result.products.length, offset, skipCount);
      return respond({
        products: result.products,
        total,
        limit,
        offset,
        hasMore: catalogHasMore(result.products.length, limit, offset, total),
      });
    }

    if (mode === "collection") {
      const slug = collectionSlug;
      const data = await fetchCollectionWithFallback(slug, limit, offset, skipCount);
      if (!data) {
        return respond({ products: [], total: null, limit, offset, hasMore: false });
      }
      let total = data.catalogTotal;
      if (!skipCount) {
        const counted = await fetchCollectionTotalFromDB(slug, region);
        if (counted != null) total = counted;
      }
      if (total == null) {
        total = offset + data.products.length + (data.products.length === limit ? 1 : 0);
      }
      return respond({
        products: data.products,
        total,
        poolCount: data.editCount,
        limit,
        offset,
        hasMore: catalogHasMore(data.products.length, limit, offset, total),
      });
    }

    if (mode === "edit") {
      const slug = sp.get("slug") || "";
      const data = await fetchEditPageData(slug, { limit, offset });
      if (!data) {
        return respond({ products: [], total: null, limit, offset, hasMore: false });
      }
      return respond({
        products: data.products,
        total: data.editCount,
        limit,
        offset,
        hasMore: catalogHasMore(data.products.length, limit, offset, data.editCount),
      });
    }

    if (mode === "vacation") {
      const cat = category === "skirts" ? "skirts" : "dresses";
      const data = await fetchVacationPageData({
        catalogLimit: limit,
        offset,
        category: cat,
      });
      return respond({
        products: data.catalogProducts,
        total: data.catalogTotal,
        limit,
        offset,
        hasMore: catalogHasMore(data.catalogProducts.length, limit, offset, data.catalogTotal),
      });
    }

    const shopFiber = fiber && fiber !== "all" ? fiber : undefined;
    const result = await queryLiveCatalog({
      region,
      fiber: shopFiber,
      category: category && category !== "all" ? category : undefined,
      collection: collectionAlias || undefined,
      brand: brandAlias || undefined,
      search: search || undefined,
      sort: sort === "recommended" ? "new" : sort,
      maxPrice,
      minPrice,
      color,
      limit,
      offset,
      skipCount,
    });

    if (result.error === "failed") {
      return catalogFailedResponse(limit, offset, cacheKey);
    }

    const total = catalogTotalValue(result.total, result.products.length, offset, skipCount);
    return respond({
      products: result.products,
      total,
      limit,
      offset,
      hasMore: result.hasMore,
      source: "direct-query",
    }, { source: "direct-query" });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    console.error("[api/catalog]", err);
    if (e?.code === "57014" || String(e?.message || "").includes("timeout")) {
      return catalogTimeoutResponse(limit, offset, cacheKey);
    }
    return catalogFailedResponse(limit, offset, cacheKey);
  }
}
