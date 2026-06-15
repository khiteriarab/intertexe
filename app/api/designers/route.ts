import { NextRequest, NextResponse } from "next/server";
import { fetchDesignersByNames, fetchDesignersByIds, getServerSupabase } from "../../../lib/supabase-server";
import { SHOPPABLE_MIN_PRODUCTS } from "../../../lib/shoppable-brands";

export const revalidate = 300;

const PRODUCT_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, max-age=300",
};

type DesignerListItem = { slug: string; name: string; count: number };

type CacheEntry = { at: number; data: DesignerListItem[] };
const cache = ((globalThis as any).__designersCache ??= new Map<string, CacheEntry>());

async function fetchDesignersFromTable(): Promise<DesignerListItem[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("designers")
    .select("slug, name, product_count")
    .eq("is_live", true)
    .gte("product_count", SHOPPABLE_MIN_PRODUCTS)
    .order("name");

  if (error || !data?.length) {
    console.warn("[api/designers] designers table query failed", error?.message);
    return [];
  }

  return data.map((row: any) => ({
    slug: String(row.slug || "").toLowerCase(),
    name: String(row.name || row.slug || ""),
    count: Number(row.product_count) || 0,
  }));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || undefined;
  const names = searchParams.get("names");
  const ids = searchParams.get("ids");

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

    const key = "live:all";
    const hit = cache.get(key);
    const fresh = hit && Date.now() - hit.at < 300_000;
    let brands = fresh ? hit.data : await fetchDesignersFromTable();
    if (!fresh) cache.set(key, { at: Date.now(), data: brands });

    if (query) {
      const needle = query.toLowerCase();
      brands = brands.filter((b) => b.name.toLowerCase().includes(needle) || b.slug.includes(needle));
    }

    return NextResponse.json({ designers: brands, total: brands.length }, { headers: PRODUCT_CACHE_HEADERS });
  } catch (error) {
    console.error("[api/designers]", error);
    return NextResponse.json({ designers: [], total: 0 }, { status: 500 });
  }
}
