import { NextRequest, NextResponse } from "next/server";
import {
  fetchProductsByFiberAndCategory,
  fetchProductsByBrand,
  fetchAllProducts,
  fetchProductsByIds,
} from "../../../lib/supabase-server";

export const revalidate = 300;
export const maxDuration = 15;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, max-age=300",
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fiber = searchParams.get("fiber");
  const category = searchParams.get("category");
  const brandSlug = searchParams.get("brandSlug");
  const ids = searchParams.get("ids");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "48", 10) || 48, 1), 100);

  try {
    if (ids) {
      const idList = ids.split(",").filter(Boolean).slice(0, 200);
      const products = await fetchProductsByIds(idList);
      return NextResponse.json(products, { headers: CACHE_HEADERS });
    }
    if (brandSlug) {
      const { products } = await fetchProductsByBrand(brandSlug, { limit: Math.min(limit, 100), offset: 0 });
      return NextResponse.json(products, { headers: CACHE_HEADERS });
    }
    if (fiber) {
      const products = await fetchProductsByFiberAndCategory(fiber, category || undefined, limit);
      return NextResponse.json(products, { headers: CACHE_HEADERS });
    }
    const products = await fetchAllProducts(limit, 0, category || undefined);
    return NextResponse.json(products, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json([], { status: 500, headers: CACHE_HEADERS });
  }
}
