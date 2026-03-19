import { NextRequest, NextResponse } from "next/server";
import { fetchSaleProducts } from "../../../lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fiber = searchParams.get("fiber") || "all";
  const maxPriceStr = searchParams.get("maxPrice");
  const maxPrice = maxPriceStr ? parseInt(maxPriceStr, 10) : undefined;
  const limit = parseInt(searchParams.get("limit") || "60", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const result = await fetchSaleProducts({ fiber, maxPrice, limit, offset });
  return NextResponse.json(result);
}
