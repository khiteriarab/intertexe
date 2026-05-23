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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const mode = sp.get("mode") || "shop";
  const limit = Math.min(Math.max(Number(sp.get("limit") || CATALOG_PAGE_SIZE), 1), 100);
  const offset = Math.max(Number(sp.get("offset") || 0), 0);
  const fiber = sp.get("fiber") || undefined;
  const category = sp.get("category") || undefined;
  const market = sp.get("market") || undefined;
  const sort = sp.get("sort") || "recommended";
  const search = sp.get("search") || undefined;
  const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;
  const skipCount = sp.get("skipCount") === "1" || offset === 0;

  try {
    if (mode === "brand") {
      const slug = sp.get("slug") || "";
      const result = await fetchProductsByBrand(slug, {
        limit,
        offset,
        skipTotal: skipCount,
      });
      return NextResponse.json({
        products: result.products,
        total: result.total,
        limit,
        offset,
        hasMore: result.hasMore,
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
      const total = result.total;
      return NextResponse.json({
        products: result.products,
        total,
        limit,
        offset,
        hasMore:
          result.hasMore ??
          (total != null ? offset + result.products.length < total : result.products.length >= limit),
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
        return NextResponse.json({ products: [], total: null, limit, offset, hasMore: false });
      }
      const total = data.catalogTotal;
      return NextResponse.json({
        products: data.products,
        total,
        poolCount: data.editCount,
        limit,
        offset,
        hasMore: data.hasMore,
      });
    }

    if (mode === "edit") {
      const slug = sp.get("slug") || "";
      const data = await fetchEditPageData(slug, { limit, offset });
      if (!data) {
        return NextResponse.json({ products: [], total: null, limit, offset, hasMore: false });
      }
      return NextResponse.json({
        products: data.products,
        total: data.editCount,
        limit,
        offset,
        hasMore:
          offset + data.products.length < data.editCount && data.products.length >= limit,
      });
    }

    if (mode === "vacation") {
      const cat = category === "skirts" ? "skirts" : "dresses";
      const data = await fetchVacationPageData({
        catalogLimit: limit,
        offset,
        category: cat,
      });
      return NextResponse.json({
        products: data.catalogProducts,
        total: data.catalogTotal,
        limit,
        offset,
        hasMore: offset + data.catalogProducts.length < data.catalogTotal,
      });
    }

    if (mode === "materials" && fiber) {
      const cat = category && category !== "all" ? category : undefined;
      const products = await fetchCatalogProductsByFiber({
        fiber,
        category: cat,
        limit,
        offset,
      });
      let total: number | null = null;
      if (!skipCount) {
        const n = await fetchMaterialHubDisplayCount(fiber, cat);
        total = n > 0 ? n : null;
      }
      return NextResponse.json({
        products,
        total,
        limit,
        offset,
        hasMore: total != null ? offset + products.length < total : products.length >= limit,
      });
    }

    const result = await fetchShopProducts({
      fiber: fiber && fiber !== "all" ? fiber : undefined,
      category: category && category !== "all" ? category : undefined,
      market: market && market !== "all" ? market : undefined,
      sort,
      limit,
      offset,
      search: search || undefined,
      skipTotal: skipCount,
    });

    return NextResponse.json({
      products: result.products,
      total: result.total,
      limit,
      offset,
      hasMore: result.hasMore,
    });
  } catch (err) {
    console.error("[api/catalog]", err);
    return NextResponse.json({ products: [], total: null, error: "catalog_fetch_failed" }, { status: 500 });
  }
}
