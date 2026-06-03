import { NextRequest, NextResponse } from "next/server";
import { fetchSaleProducts, getSaleTotalCount } from "../../../lib/supabase-server";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit") || 40), 1), 200);
  const offset = Math.max(Number(sp.get("offset") || 0), 0);
  const fiber = sp.get("fiber") || undefined;
  const category = sp.get("category") || undefined;
  const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;
  const region = sp.get("region") || sp.get("market") || undefined;

  try {
    const result = await fetchSaleProducts({
      fiber: fiber && fiber !== "all" ? fiber : undefined,
      maxPrice,
      category: category && category !== "all" ? category : undefined,
      market: region && region !== "all" ? region : undefined,
      limit,
      offset,
      useMerchFeedPreview: false,
      skipTotal: false,
    });

    const products = result.products ?? [];
    let total = result.total ?? 0;

    const dbTotal = await getSaleTotalCount({
      region: region && region !== "all" ? region : "us",
      fiber: fiber && fiber !== "all" ? fiber : undefined,
      maxPrice,
    });
    if ((!category || category === "all") && dbTotal > total) total = dbTotal;

    const hasMore = offset + products.length < total;

    return NextResponse.json(
      {
        products,
        total,
        limit,
        offset,
        hasMore,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "CDN-Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch (err) {
    console.error("[api/sale]", err);
    return NextResponse.json({ products: [], total: 0, hasMore: false, error: "sale_fetch_failed" }, { status: 500 });
  }
}
