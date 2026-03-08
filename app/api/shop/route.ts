import { NextRequest, NextResponse } from "next/server";
import { fetchShopProducts, fetchProductCount, fetchFiberCounts } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  if (searchParams.get("meta") === "true") {
    try {
      const [totalProductCount, fiberCounts] = await Promise.all([
        fetchProductCount(),
        fetchFiberCounts(),
      ]);
      return NextResponse.json({ totalProductCount, fiberCounts });
    } catch {
      return NextResponse.json({ totalProductCount: 0, fiberCounts: {} }, { status: 500 });
    }
  }

  const fiber = searchParams.get("fiber") || undefined;
  const category = searchParams.get("category") || undefined;
  const sort = searchParams.get("sort") || "recommended";
  const limit = parseInt(searchParams.get("limit") || "60", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const search = searchParams.get("search") || undefined;

  try {
    const result = await fetchShopProducts({
      fiber: fiber === "all" ? undefined : fiber,
      category: category === "all" ? undefined : category,
      sort,
      limit,
      offset,
      search,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ products: [], total: 0 }, { status: 500 });
  }
}
