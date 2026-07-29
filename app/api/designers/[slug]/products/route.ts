export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchProductsByBrand } from "../../../../../lib/supabase-server";
import { CATALOG_PAGE_SIZE } from "../../../../../lib/catalog-rules";
import {
  catalogHasMore,
  safeCatalogLimit,
  safeCatalogOffset,
  CATALOG_BRAND_MAX_OFFSET,
} from "../../../../../lib/catalog-fetch-limits";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, s-maxage=300",
  "Vercel-CDN-Cache-Control": "public, s-maxage=300",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sp = request.nextUrl.searchParams;
  const limit = safeCatalogLimit(sp.get("limit"), CATALOG_PAGE_SIZE);
  const offset = safeCatalogOffset(sp.get("offset"), CATALOG_BRAND_MAX_OFFSET);
  // A full filtered count scans the entire brand and made cold first pages take
  // 8–25 seconds. Infinite scroll only needs hasMore, so first paint never counts.
  const skipCount = sp.get("skipCount") === "1" || offset === 0;
  const regionParam = sp.get("region") || sp.get("catalogRegion");
  const region = regionParam?.trim().toLowerCase() || "us";

  try {
    const result = await fetchProductsByBrand(slug, {
      limit,
      offset,
      skipTotal: skipCount,
      region,
    });
    if (result.error === "timeout") {
      return NextResponse.json(
        {
          products: [],
          total: null,
          limit,
          offset,
          hasMore: false,
          error: "timeout",
        },
        { status: 200, headers: JSON_HEADERS }
      );
    }
    const total =
      skipCount || result.total == null
        ? result.total
        : result.total >= 0
          ? result.total
          : offset + result.products.length;
    return NextResponse.json(
      {
        products: result.products,
        total,
        limit,
        offset,
        hasMore: catalogHasMore(
          result.products.length,
          limit,
          offset,
          total,
          CATALOG_BRAND_MAX_OFFSET
        ),
      },
      { headers: JSON_HEADERS }
    );
  } catch (err) {
    console.error("[api/designers/[slug]/products]", slug, err);
    return NextResponse.json(
      { products: [], total: null, limit, offset, hasMore: false, error: "failed" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
