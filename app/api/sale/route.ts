import { NextRequest, NextResponse } from "next/server";
import { fetchSaleProducts } from "../../../lib/supabase-server";
import { priceBoundsFromTier, type ShopPriceTierId } from "../../../lib/catalog-filter-options";

export const revalidate = 300;

function parsePriceTier(raw: string | null): ShopPriceTierId {
  if (!raw || raw === "any") return "any";
  if (raw === "2500plus" || raw === "600plus") return "2500plus";
  if (["200", "500", "1000", "2500"].includes(raw)) return raw as ShopPriceTierId;
  return "any";
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit") || 40), 1), 200);
  const offset = Math.max(Number(sp.get("offset") || 0), 0);
  const fiber = sp.get("fiber") || undefined;
  const category = sp.get("category") || undefined;
  const color = sp.get("color") || undefined;
  const brand = sp.get("brand") || undefined;
  const region = sp.get("region") || sp.get("market") || undefined;
  const priceTier = parsePriceTier(sp.get("price"));
  const priceBounds = priceBoundsFromTier(priceTier);
  const legacyMax = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;
  const legacyMin = sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined;
  const maxPrice = priceBounds.maxPrice ?? legacyMax;
  const minPrice = priceBounds.minPrice ?? legacyMin;

  try {
    const result = await fetchSaleProducts({
      fiber: fiber && fiber !== "all" ? fiber : undefined,
      maxPrice,
      minPrice,
      category: category && category !== "all" ? category : undefined,
      color: color || undefined,
      brand: brand || undefined,
      market: region && region !== "all" ? region : undefined,
      limit,
      offset,
      useMerchFeedPreview: false,
      skipTotal: false,
    });

    const products = result.products ?? [];
    const total = result.total ?? 0;
    const hasMore = products.length > 0 && offset + products.length < total;

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
