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
} from "../../../lib/supabase-server";
import { CATALOG_PAGE_SIZE } from "../../../lib/catalog-rules";
import {
  DEFAULT_SHOP_FIBER,
  safeCatalogLimit,
  safeCatalogOffset,
  catalogHasMore,
} from "../../../lib/catalog-fetch-limits";

export const revalidate = 300;

const PRODUCT_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

function catalogOk(
  body: Record<string, unknown>,
  init?: { status?: number }
) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: PRODUCT_CACHE_HEADERS,
  });
}

function catalogTimeoutResponse(limit: number, offset: number) {
  return catalogOk({
    products: [],
    total: null,
    limit,
    offset,
    hasMore: false,
    error: "timeout",
    message: "Query took too long — try filtering by material or category",
  });
}

function catalogFailedResponse(limit: number, offset: number) {
  return catalogOk({
    products: [],
    total: null,
    limit,
    offset,
    hasMore: false,
    error: "failed",
  });
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

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const collectionAlias = sp.get("collection");
  const explicitMode = sp.get("mode");
  const fiber = sp.get("fiber") || undefined;
  const mode =
    collectionAlias === "vacation"
      ? "vacation"
      : explicitMode ||
        (fiber && fiber !== "all" && !sp.get("slug") ? "materials" : "shop");
  const limit = safeCatalogLimit(sp.get("limit"), CATALOG_PAGE_SIZE);
  const offset = safeCatalogOffset(sp.get("offset"));
  const category = sp.get("category") || undefined;
  const market = catalogMarketFromParams(sp);
  const catalogRegion = catalogPreferredRegionFromParams(sp);
  const sort = sp.get("sort") || "new";
  const search = sp.get("search") || undefined;
  const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;
  const skipCount = sp.get("skipCount") === "1";

  try {
    if (mode === "brand") {
      const slug = sp.get("slug") || "";
      const result = await fetchProductsByBrand(slug, {
        limit,
        offset,
        skipTotal: skipCount,
        region: catalogRegion || "us",
      });
      if (result.error === "timeout") return catalogTimeoutResponse(limit, offset);
      const brandTotal = catalogTotalValue(
        result.total,
        result.products.length,
        offset,
        skipCount
      );
      return catalogOk({
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
      if (result.error === "timeout") return catalogTimeoutResponse(limit, offset);
      const total = catalogTotalValue(result.total, result.products.length, offset, skipCount);
      return catalogOk({
        products: result.products,
        total,
        limit,
        offset,
        hasMore: catalogHasMore(result.products.length, limit, offset, total),
      });
    }

    if (mode === "collection") {
      const slug = sp.get("slug") || "";
      const data = await fetchCollectionPageData(slug, {
        limit,
        offset,
        skipTotal: skipCount,
      });
      if (!data) {
        return catalogOk({ products: [], total: null, limit, offset, hasMore: false });
      }
      if (data.error === "timeout") return catalogTimeoutResponse(limit, offset);
      const total = data.catalogTotal;
      return catalogOk({
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
        return catalogOk({ products: [], total: null, limit, offset, hasMore: false });
      }
      return catalogOk({
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
      return catalogOk({
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
        fetchCatalogProductsByFiber({
          fiber,
          category: cat,
          limit,
          offset,
        }),
        skipCount ? Promise.resolve(0) : fetchMaterialHubDisplayCount(fiber, cat),
      ]);
      const total = catalogTotalValue(n, products.length, offset, skipCount);
      return catalogOk({
        products,
        total,
        limit,
        offset,
        hasMore: catalogHasMore(products.length, limit, offset, total),
      });
    }

    const shopFiber =
      fiber && fiber !== "all" ? fiber : DEFAULT_SHOP_FIBER;

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

    if (result.error === "timeout") return catalogTimeoutResponse(limit, offset);

    const total = catalogTotalValue(result.total, result.products.length, offset, skipCount);
    return catalogOk({
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
      return catalogTimeoutResponse(limit, offset);
    }
    return catalogFailedResponse(limit, offset);
  }
}
