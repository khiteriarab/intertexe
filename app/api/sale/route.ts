import { NextRequest, NextResponse } from "next/server";
import { fetchSaleProducts } from "../../../lib/supabase-server";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit") || 40), 1), 80);
  const offset = Math.max(Number(sp.get("offset") || 0), 0);
  const fiber = sp.get("fiber") || undefined;
  const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;

  try {
    const result = await fetchSaleProducts({
      fiber: fiber && fiber !== "all" ? fiber : undefined,
      maxPrice,
      limit,
      offset,
      useMerchFeedPreview: false,
    });
    return NextResponse.json(
      {
        products: result.products,
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.products.length < result.total,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("[api/sale]", err);
    return NextResponse.json({ products: [], total: 0, error: "sale_fetch_failed" }, { status: 500 });
  }
}
