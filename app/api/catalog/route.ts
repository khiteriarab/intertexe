import { NextRequest, NextResponse } from "next/server";
import { fetchShopProducts, fetchCatalogProductsByFiber, fetchSaleProducts } from "../../../lib/supabase-server";
import { CATALOG_PAGE_SIZE } from "../../../lib/catalog-rules";

export const dynamic = "force-dynamic";

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

  try {
    if (mode === "sale") {
      const result = await fetchSaleProducts({
        fiber: fiber && fiber !== "all" ? fiber : undefined,
        maxPrice,
        limit,
        offset,
      });
      return NextResponse.json({
        products: result.products,
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.products.length < result.total,
      });
    }

    if (mode === "materials" && fiber) {
      const products = await fetchCatalogProductsByFiber({
        fiber,
        category: category && category !== "all" ? category : undefined,
        limit,
        offset,
      });
      return NextResponse.json({
        products,
        total: null,
        limit,
        offset,
        hasMore: products.length >= limit,
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
    });

    return NextResponse.json({
      products: result.products,
      total: result.total,
      limit,
      offset,
      hasMore: offset + result.products.length < result.total,
    });
  } catch (err) {
    console.error("[api/catalog]", err);
    return NextResponse.json({ products: [], total: 0, error: "catalog_fetch_failed" }, { status: 500 });
  }
}
