import { NextRequest, NextResponse } from "next/server";
import { fetchSaleProducts } from "../../../lib/supabase-server";
import { CATALOG_PAGE_SIZE } from "../../../lib/catalog-rules";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit") || CATALOG_PAGE_SIZE), 1), 100);
  const offset = Math.max(Number(sp.get("offset") || 0), 0);
  const fiber = sp.get("fiber") || undefined;
  const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;

  try {
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
  } catch (err) {
    console.error("[api/sale]", err);
    return NextResponse.json({ products: [], total: 0 }, { status: 500 });
  }
}
