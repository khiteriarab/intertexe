import { NextRequest, NextResponse } from "next/server";
import { fetchDesignersByNames, fetchDesignersByIds, getServerSupabase } from "../../../lib/supabase-server";

export const revalidate = 300;

const PRODUCT_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, max-age=300",
};

type DesignerListItem = { slug: string; name: string; count: number };

type CacheEntry = { at: number; data: DesignerListItem[] };
const cache = ((globalThis as any).__designersCache ??= new Map<string, CacheEntry>());

async function ensureKeyBrands(region: string, brands: DesignerListItem[]): Promise<DesignerListItem[]> {
  const supabase = getServerSupabase();
  if (!supabase) return brands;
  const keys = ["zimmermann", "toteme"];
  const have = new Set(brands.map((b) => b.slug));
  const missing = keys.filter((k) => !have.has(k));
  if (!missing.length) return brands;

  const { data, error } = await supabase
    .from("products")
    .select("brand_slug, brand_name")
    .eq("region", region)
    .eq("is_displayable", true)
    .in("brand_slug", missing);

  if (error || !data?.length) return brands;
  const counts = new Map<string, { name: string; count: number }>();
  for (const row of data as any[]) {
    const slug = String(row.brand_slug || "").toLowerCase();
    if (!slug) continue;
    const name = String(row.brand_name || slug);
    const cur = counts.get(slug);
    if (cur) cur.count += 1;
    else counts.set(slug, { name, count: 1 });
  }
  for (const [slug, val] of counts.entries()) {
    if (val.count >= 2) {
      brands.push({ slug, name: val.name, count: val.count });
    }
  }
  return brands.sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchDesignersFast(region: string): Promise<DesignerListItem[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  // Fast path: aggregate directly from products (is_displayable only), avoids heavy live view scans.
  const { data, error } = await supabase
    .from("products")
    .select("brand_slug, brand_name")
    .eq("region", region)
    .eq("is_displayable", true)
    .not("brand_slug", "is", null)
    .not("brand_name", "is", null)
    .limit(20000);

  if (error || !data) {
    console.warn("[api/designers] products aggregate failed", error?.message);
    return [];
  }

  const map = new Map<string, { slug: string; name: string; count: number }>();
  for (const row of data as any[]) {
    const slug = String(row.brand_slug || "").trim().toLowerCase();
    const name = String(row.brand_name || slug).trim();
    if (!slug || !name) continue;
    const item = map.get(slug);
    if (item) item.count += 1;
    else map.set(slug, { slug, name, count: 1 });
  }

  return [...map.values()]
    .filter((b) => b.count >= 2)
    .sort((a, b) => a.name.localeCompare(b.name));
}

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

    const key = `${region}:all`;
    const hit = cache.get(key);
    const fresh = hit && Date.now() - hit.at < 300_000;
    let brands = fresh ? hit.data : await fetchDesignersFast(region);
    brands = await ensureKeyBrands(region, brands);
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
