import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type FeaturedBrandPayload = {
  slug: string;
  name: string;
  description: string | null;
  editorial_image_url: string | null;
  hero_image_url: string | null;
  new_count: number;
};

export async function GET(request: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ brands: [] }, { status: 200 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit") || "5");
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? Math.floor(limitParam) : 5, 1), 10);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentRows, error: recentError } = await supabase
    .from("live_products_apparel")
    .select("brand_slug, brand_name")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(12000);

  if (recentError || !recentRows?.length) {
    return NextResponse.json({ brands: [] }, { status: 200 });
  }

  const counts = new Map<string, { name: string; count: number }>();
  for (const row of recentRows) {
    const slug = String(row.brand_slug || "").trim().toLowerCase();
    if (!slug) continue;
    const current = counts.get(slug);
    if (current) {
      current.count += 1;
    } else {
      counts.set(slug, {
        name: String(row.brand_name || slug),
        count: 1,
      });
    }
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit);

  const brands: FeaturedBrandPayload[] = [];
  for (const [slug, info] of top) {
    const richDesigner = await supabase
      .from("designers")
      .select("slug, name, description, editorial_image_url, hero_image_url")
      .eq("slug", slug)
      .maybeSingle();
    const basicDesigner = richDesigner.error
      ? await supabase
          .from("designers")
          .select("slug, name")
          .eq("slug", slug)
          .maybeSingle()
      : null;
    const designer = (richDesigner.data || basicDesigner?.data) as Record<string, unknown> | null;

    let fallbackImage: string | null = null;
    const editorialImage = (designer?.["editorial_image_url"] as string | null) ?? null;
    const heroImage = (designer?.["hero_image_url"] as string | null) ?? null;
    if (!editorialImage && !heroImage) {
      const { data: fallback } = await supabase
        .from("live_products_apparel")
        .select("image_url")
        .eq("brand_slug", slug)
        .not("image_url", "is", null)
        .order("natural_fiber_percent", { ascending: false })
        .limit(1)
        .maybeSingle();
      fallbackImage = (fallback?.image_url as string | null) ?? null;
    }

    brands.push({
      slug,
      name: String((designer?.["name"] as string | null) || info.name || slug),
      description: (designer?.["description"] as string | null) ?? null,
      editorial_image_url: editorialImage,
      hero_image_url: heroImage ?? fallbackImage,
      new_count: info.count,
    });
  }

  return NextResponse.json({ brands }, { status: 200 });
}
