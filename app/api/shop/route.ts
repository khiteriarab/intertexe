export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { queryLiveCatalog } from "../../../lib/catalog-direct-query";
import { fetchProductCount, fetchFiberCounts } from "../../../lib/supabase-server";

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
  const sort = searchParams.get("sort") || "new";
  const limit = parseInt(searchParams.get("limit") || "60", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const search = searchParams.get("search") || undefined;
  const region = searchParams.get("region") || "us";

  try {
    const result = await queryLiveCatalog({
      region,
      fiber: fiber === "all" ? undefined : fiber,
      category: category === "all" ? undefined : category,
      sort: sort === "recommended" ? "new" : sort,
      limit,
      offset,
      search,
      skipCount: false,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ products: [], total: 0, error: "failed" }, { status: 500 });
  }
}
