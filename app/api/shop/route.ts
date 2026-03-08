import { NextRequest, NextResponse } from "next/server";
import { fetchShopProducts } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
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
