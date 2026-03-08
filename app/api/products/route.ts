import { NextRequest, NextResponse } from "next/server";
import { fetchProductsByFiberAndCategory, fetchProductsByBrand, fetchAllProducts } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fiber = searchParams.get("fiber");
  const category = searchParams.get("category");
  const brandSlug = searchParams.get("brandSlug");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    if (brandSlug) {
      const products = await fetchProductsByBrand(brandSlug);
      return NextResponse.json(products);
    }
    if (fiber) {
      const products = await fetchProductsByFiberAndCategory(fiber, category || undefined, limit);
      return NextResponse.json(products);
    }
    const products = await fetchAllProducts(limit);
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
