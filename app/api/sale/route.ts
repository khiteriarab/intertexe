export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchSaleProducts } from "../../../lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fiber = searchParams.get("fiber") || "all";
  const maxPriceRaw = parseInt(searchParams.get("maxPrice") || "", 10);
  const maxPrice = !isNaN(maxPriceRaw) && maxPriceRaw > 0 ? maxPriceRaw : undefined;
  const limitRaw = parseInt(searchParams.get("limit") || "60", 10);
  const limit = !isNaN(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 60;
  const offsetRaw = parseInt(searchParams.get("offset") || "0", 10);
  const offset = !isNaN(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

  const result = await fetchSaleProducts({ fiber, maxPrice, limit, offset });
  return NextResponse.json(result);
}
