import { NextRequest, NextResponse } from "next/server";
import {
  fetchShopProducts,
  fetchCatalogProductsByFiber,
  fetchSaleProducts,
  fetchVacationPageData,
  fetchEditPageData,
  fetchCollectionPageData,
  fetchMaterialHubDisplayCount,
  fetchProductsByBrand,
  getServerSupabase,
} from "../../../lib/supabase-server";
import { CATALOG_PAGE_SIZE } from "../../../lib/catalog-rules";
import {
  DEFAULT_SHOP_FIBER,
  safeCatalogLimit,
  safeCatalogOffset,
  catalogHasMore,
} from "../../../lib/catalog-fetch-limits";
import { fetchMerchRailProducts, MERCH_RAIL_KEYS, MATERIAL_SLUG_TO_RAIL } from "../../../lib/merch-feed";

export const dynamic = "force-dynamic";
export const revalidate = 60;
const COLLECTION_FALLBACK_MIN_PRODUCTS = 3;
const FIBER_CACHE_TTL_MS = 300_000;

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
type FiberCacheEntry = { products: unknown[]; timestamp: number };
const fiberCache =
  ((globalThis as typeof globalThis & { __fiberCache?: Map<string, FiberCacheEntry> }).__fiberCache ??=
    new Map<string, FiberCacheEntry>());

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
  const data = await fetchCollectionPageData(slug, {
    limit,
    offset,
    skipTotal,
  });
  if (!data) return null;
  if (data.products.length >= COLLECTION_FALLBACK_MIN_PRODUCTS) return data;

  let fallbackProducts: Awaited<ReturnType<typeof fetchCatalogProductsByFiber>> = [];
  if (slug === "tailoring") {
    const fallback = await fetchShopProducts({
      category: "jackets",
      catalogRegion: "us",
      sort: "new",
      limit,
      offset: 0,
      skipTotal: true,
    });
    fallbackProducts = fallback.products;
  } else if (slug === "summer-in-the-city") {
    fallbackProducts = await fetchCatalogProductsByFiber({
      fiber: "linen",
      limit,
      offset: 0,
    });
  } else if (slug === "white-edit") {
    const fallback = await fetchShopProducts({
      search: "white",
      catalogRegion: "us",
      sort: "new",
      limit,
      offset: 0,
      skipTotal: true,
    });
    fallbackProducts = fallback.products;
  }

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

  // New schema: array-backed collection memberships.
  const primary = await supabase
    .from("live_products_apparel")
    .select("id", { count: "exact", head: true })
    .eq("region", region)
    .contains("collection_slugs", [collection]);

  if (primary.count != null) return primary.count;

  // Legacy schema fallback: single collection slug field.
  const legacy = await supabase
    .from("live_products_apparel")
    .select("id", { count: "exact", head: true })
    .eq("region", region)
    .eq("collection_slug", collection);

  return legacy.count ?? null;
}

async function getCachedMerchProducts(region: string, limit: number, offset: number) {
  if (region !== "us") return [];
  return fetchMerchRailProducts(MERCH_RAIL_KEYS.newIn, { limit, offset });
}

function mapFastProductRow(row: Record<string, unknown>) {
  const toStringOrNull = (value: unknown) =>
    value == null ? null : String(value);
  const naturalFiber = Number(row.natural_fiber_percent ?? 0);
  const isSale =
    row.is_sale === true
    || (Number(row.original_price ?? 0) > Number(row.price ?? 0));
  return {
    id: String(row.id ?? ""),
    brandSlug: String(row.brand_slug ?? ""),
    brandName: String(row.brand_name ?? ""),
    name: String(row.name ?? ""),
    productId: String(row.product_id ?? row.id ?? ""),
    url: String(row.url ?? ""),
    imageUrl: String(row.image_url ?? ""),
    price: String(row.price ?? ""),
    composition: String(row.composition ?? ""),
    naturalFiberPercent: Number.isFinite(naturalFiber) ? Math.max(0, Math.min(100, Math.round(naturalFiber))) : 0,
    category: String(row.category ?? ""),
    color: toStringOrNull(row.color),
    matchingSetId: toStringOrNull(row.matching_set_id),
    isSale,
    originalPrice: toStringOrNull(row.original_price),
    listingRegion: toStringOrNull(row.region),
  };
}

async function getCachedFiberProducts(fiber: string, region: string, limit: number, offset: number) {
  if (offset !== 0 || region !== "us") {
    return fetchMerchRailProducts(
      (MATERIAL_SLUG_TO_RAIL[fiber] || MATERIAL_SLUG_TO_RAIL[fiber.toLowerCase()]) || MERCH_RAIL_KEYS.silk,
      { limit, offset }
    );
  }
  const cacheKey = `fiber:${fiber.toLowerCase()}:${region}:page1`;
  const cached = fiberCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FIBER_CACHE_TTL_MS) {
    return cached.products as Awaited<ReturnType<typeof fetchMerchRailProducts>>;
  }
  const products = await fetchMerchRailProducts(
    (MATERIAL_SLUG_TO_RAIL[fiber] || MATERIAL_SLUG_TO_RAIL[fiber.toLowerCase()]) || MERCH_RAIL_KEYS.silk,
    { limit, offset }
  );
  fiberCache.set(cacheKey, { products, timestamp: Date.now() });
  return products;
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
    || (fiber && fiber !== "all" && !slugParam ? "materials" : "shop");
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
  const searchTerms = (search || "")
    .toLowerCase()
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  /** Small first-page catalog previews skip the expensive count RPC. */
  const skipCount =
    sp.get("skipCount") === "1" ||
    (limit <= 48 && offset === 0);

  try {
    const region = catalogRegion || "us";
    const isBaseCatalogFirstPage =
      offset === 0
      && !collectionAlias
      && !fiber
      && !brandAlias
      && !search
      && !maxPrice;
    if (isBaseCatalogFirstPage) {
      const supabase = getServerSupabase();
      if (supabase) {
        try {
          const started = Date.now();
          const { data: fastProducts } = await supabase
            .from("products")
            .select("id, name, brand_name, brand_slug, product_id, price, original_price, image_url, url, composition, natural_fiber_percent, is_sale, color, matching_set_id, category, region")
            .eq("region", region)
            .eq("is_displayable", true)
            .order("created_at", { ascending: false })
            .limit(Math.min(limit, 48));
          console.log("[catalog fast-path] ms=", Date.now() - started, "rows=", fastProducts?.length ?? 0);
          if (fastProducts && fastProducts.length >= 12) {
            return respond(
              {
                products: fastProducts.map((row) => mapFastProductRow(row as Record<string, unknown>)),
                total: 149474,
                limit,
                offset,
                hasMore: true,
                source: "fast-path",
              },
              { source: "fast-path" }
            );
          }
        } catch (err) {
          console.error("[catalog fast-path] error:", err);
        }
      }

      try {
        const cachedProducts = await getCachedMerchProducts(region, limit, offset);
        if (cachedProducts.length >= 12) {
          return respond(
            {
              products: cachedProducts,
              total: cachedProducts.length,
              limit,
              offset,
              hasMore: true,
            },
            { source: "merch-cache" }
          );
        }
      } catch {
        // Fall through to live path.
      }
    }

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
      if (result.error === "timeout") return catalogTimeoutResponse(limit, offset, cacheKey);
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
      if (data.error === "timeout") return catalogTimeoutResponse(limit, offset, cacheKey);
      let total = data.catalogTotal;
      if (total == null && !skipCount) {
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

    if (mode === "materials" && fiber) {
      const cat = category && category !== "all" ? category : undefined;
      const [products, n] = await Promise.all([
        cat
          ? fetchCatalogProductsByFiber({
              fiber,
              category: cat,
              limit,
              offset,
            })
          : getCachedFiberProducts(fiber, region, limit, offset),
        skipCount ? Promise.resolve(0) : fetchMaterialHubDisplayCount(fiber, cat),
      ]);
      const total = catalogTotalValue(n, products.length, offset, skipCount);
      return respond({
        products,
        total,
        limit,
        offset,
        hasMore: catalogHasMore(products.length, limit, offset, total),
      });
    }

    const shopFiber =
      fiber && fiber !== "all" ? fiber : DEFAULT_SHOP_FIBER;

    const searchMaterial = searchTerms.find((t) =>
      ["silk", "linen", "cashmere", "wool", "cotton", "leather"].includes(t)
    );
    if (searchMaterial && offset === 0) {
      const railKey = MATERIAL_SLUG_TO_RAIL[searchMaterial] || MERCH_RAIL_KEYS.silk;
      const railProducts = await fetchMerchRailProducts(railKey, { limit: Math.max(limit, 48), offset: 0 });
      const filtered = railProducts.filter((p) => {
        const haystack = `${p.name || ""} ${p.brandName || ""} ${p.composition || ""}`.toLowerCase();
        return searchTerms.every((t) => haystack.includes(t));
      }).slice(0, limit);
      const total = catalogTotalValue(null, filtered.length, offset, true);
      return respond({
        products: filtered,
        total,
        limit,
        offset,
        hasMore: catalogHasMore(filtered.length, limit, offset, total),
        defaultFiber: !fiber || fiber === "all" ? DEFAULT_SHOP_FIBER : undefined,
      });
    }

    const result = await fetchShopProducts({
      fiber: shopFiber,
      category: category && category !== "all" ? category : undefined,
      market: market && market !== "all" ? market : undefined,
      catalogRegion,
      sort,
      limit,
      offset,
      search: search || undefined,
      skipTotal: skipCount,
    });

    if (result.error === "timeout") return catalogTimeoutResponse(limit, offset, cacheKey);
    if (result.error === "failed") {
      const fallback = await fetchCatalogProductsByFiber({
        fiber: shopFiber,
        category: category && category !== "all" ? category : undefined,
        limit,
        offset,
      });
      const total = catalogTotalValue(null, fallback.length, offset, true);
      return respond({
        products: fallback,
        total,
        limit,
        offset,
        hasMore: catalogHasMore(fallback.length, limit, offset, total),
        defaultFiber: !fiber || fiber === "all" ? DEFAULT_SHOP_FIBER : undefined,
      });
    }

    const total = catalogTotalValue(result.total, result.products.length, offset, skipCount);
    return respond({
      products: result.products,
      total,
      limit,
      offset,
      hasMore: catalogHasMore(result.products.length, limit, offset, total),
      defaultFiber: !fiber || fiber === "all" ? DEFAULT_SHOP_FIBER : undefined,
    });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    console.error("[api/catalog]", err);
    if (e?.code === "57014" || String(e?.message || "").includes("timeout")) {
      return catalogTimeoutResponse(limit, offset, cacheKey);
    }
    return catalogFailedResponse(limit, offset, cacheKey);
  }
}
