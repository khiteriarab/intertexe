import { NextRequest, NextResponse } from "next/server";
import { queryLiveCatalog } from "../../../lib/catalog-direct-query";
import { fetchProductCount, fetchFiberCounts } from "../../../lib/supabase-server";

export const revalidate = 300;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, max-age=300",
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  if (searchParams.get("meta") === "true") {
    try {
      const [totalProductCount, fiberCounts] = await Promise.all([
        fetchProductCount(),
        fetchFiberCounts(),
      ]);
      return NextResponse.json(
        { totalProductCount, fiberCounts },
        { headers: CACHE_HEADERS }
      );
    } catch {
      return NextResponse.json({ totalProductCount: 0, fiberCounts: {} }, { status: 500 });
    }
  }

  const fiber = searchParams.get("fiber") || undefined;
  const category = searchParams.get("category") || undefined;
  const sort = searchParams.get("sort") || "new";
  const limit = parseInt(searchParams.get("limit") || "60", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const search = searchParams.get("search") || undefined;
  const region = searchParams.get("region") || "us";
  const brand = searchParams.get("brand") || undefined;
  const color = searchParams.get("color") || undefined;
  const materialSubtype =
    searchParams.get("materialSubtype") || searchParams.get("fiberSubtype") || undefined;
  const fabricConstruction = searchParams.get("fabricConstruction") || undefined;
  const maxPriceRaw = searchParams.get("maxPrice");
  const minPriceRaw = searchParams.get("minPrice");
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : undefined;
  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined;
  const type =
    searchParams.get("type") ||
    searchParams.get("shoeType") ||
    searchParams.get("subcategory") ||
    undefined;
  const material =
    searchParams.get("material") ||
    (fiber && ["leather", "suede", "nubuck", "canvas"].includes(fiber) ? fiber : undefined) ||
    materialSubtype ||
    undefined;

  try {
    const result = await queryLiveCatalog({
      region,
      fiber: fiber === "all" ? undefined : fiber,
      category: category === "all" ? undefined : category,
      sort: sort === "recommended" ? "new" : sort,
      limit,
      offset,
      search,
      brand,
      color,
      materialSubtype,
      fabricConstruction,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      skipCount: false,
      type,
      shoeType: searchParams.get("shoeType") || undefined,
      subcategory: searchParams.get("subcategory") || undefined,
      material,
    });
    return NextResponse.json(
      {
        products: result.products,
        total: result.total,
        hasMore: result.hasMore,
        productIds: result.productIds ?? result.products.map((p) => p.id),
        rpcVersion: result.rpcVersion ?? null,
        totalStatus: result.totalStatus ?? null,
        filterCoverage: result.filterCoverage ?? null,
        error: result.error,
      },
      { headers: CACHE_HEADERS }
    );
  } catch {
    return NextResponse.json({ products: [], total: 0, error: "failed" }, { status: 500 });
  }
}
