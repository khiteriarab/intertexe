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
  const fiberSubtype =
    sp.get("materialSubtype") || sp.get("fiberSubtype") || undefined;
  const fabricConstruction = sp.get("fabricConstruction") || undefined;
  const category = sp.get("category") || undefined;
  const color = sp.get("color") || undefined;
  const brand = sp.get("brand") || undefined;
  const sort = sp.get("sort") || "discount";
  const region = sp.get("region") || sp.get("market") || undefined;
  const skipCount =
    sp.get("skipCount") === "1" ||
    (Number(sp.get("limit") || 40) <= 48 && Number(sp.get("offset") || 0) === 0);
  const priceTier = parsePriceTier(sp.get("price"));
  const priceBounds = priceBoundsFromTier(priceTier);
  const legacyMax = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;
  const legacyMin = sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined;
  const maxPrice = priceBounds.maxPrice ?? legacyMax;
  const minPrice = priceBounds.minPrice ?? legacyMin;

  try {
    const result = await fetchSaleProducts({
      fiber: fiber && fiber !== "all" ? fiber : undefined,
      fiberSubtype: fiberSubtype || undefined,
      maxPrice,
      minPrice,
      category: category && category !== "all" ? category : undefined,
      color: color || undefined,
      brand: brand || undefined,
      sort: sort || undefined,
      market: region && region !== "all" ? region : undefined,
      limit,
      offset,
      useMerchFeedPreview: false,
      // First page: skip exact count so iOS paints in ~1–2s (count was forcing Try again).
      skipTotal: skipCount,
    });

    const products = result.products ?? [];
    const total = result.total;
    const hasMore =
      result.hasMore ??
      (total != null
        ? products.length > 0 && offset + products.length < total
        : products.length >= limit);

    return NextResponse.json(
      {
        products,
        total: total ?? null,
        limit,
        offset,
        hasMore,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "CDN-Cache-Control": "public, max-age=60",
        },
      }
    );
  } catch (err) {
    console.error("[api/sale]", err);
    return NextResponse.json({ products: [], total: 0, hasMore: false, error: "sale_fetch_failed" }, { status: 500 });
  }
}
