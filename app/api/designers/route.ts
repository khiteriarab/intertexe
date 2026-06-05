import { NextRequest, NextResponse } from "next/server";
import {
  fetchDesignersByNames,
  fetchDesignersByIds,
} from "../../../lib/supabase-server";
import { fetchCatalogDesigners } from "../../../lib/catalog-designers";

export const revalidate = 300;

const PRODUCT_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, max-age=300",
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || undefined;
  const names = searchParams.get("names");
  const ids = searchParams.get("ids");
  const region = searchParams.get("region") || "us";

  try {
    if (ids) {
      const idList = ids.split(",").filter(Boolean).slice(0, 100);
      const designers = await fetchDesignersByIds(idList);
      return NextResponse.json(designers, { headers: PRODUCT_CACHE_HEADERS });
    }
    if (names) {
      const nameList = names.split(",").map((n) => n.trim()).filter(Boolean);
      const designers = await fetchDesignersByNames(nameList);
      return NextResponse.json(designers, { headers: PRODUCT_CACHE_HEADERS });
    }

    let brands = await fetchCatalogDesigners(region);

    if (query) {
      const needle = query.toLowerCase();
      brands = brands.filter(
        (b) => b.name.toLowerCase().includes(needle) || b.slug.includes(needle)
      );
    }

    return NextResponse.json(
      { designers: brands, total: brands.length },
      { headers: PRODUCT_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("[api/designers]", error);
    return NextResponse.json({ designers: [], total: 0 }, { status: 500 });
  }
}
