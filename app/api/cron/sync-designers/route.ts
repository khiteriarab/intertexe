import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const supabase = createServiceClient();

  const { data: brands, error: brandsError } = await supabase
    .from("products")
    .select("brand_slug, brand_name, image_url, natural_fiber_percent")
    .eq("approved", "yes")
    .eq("is_active", true)
    .not("brand_slug", "is", null);

  if (brandsError) {
    return NextResponse.json({ error: brandsError.message }, { status: 500 });
  }

  const brandMap: Record<string, { slug: string; name: string; image_url: string | null; nfp_sum: number; count: number }> = {};

  for (const product of brands || []) {
    const slug = String(product.brand_slug || "").trim();
    if (!slug) continue;
    if (!brandMap[slug]) {
      brandMap[slug] = {
        slug,
        name: product.brand_name || slug,
        image_url: product.image_url || null,
        nfp_sum: 0,
        count: 0,
      };
    }
    brandMap[slug].nfp_sum += Number(product.natural_fiber_percent || 0);
    brandMap[slug].count++;
  }

  const { data: existing, error: existingError } = await supabase.from("designers").select("slug");
  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existingSlugs = new Set((existing || []).map((d: { slug: string }) => d.slug));
  const missing = Object.values(brandMap).filter((b) => !existingSlugs.has(b.slug));

  let created = 0;
  for (const brand of missing) {
    const avgNFP = Math.round(brand.nfp_sum / Math.max(brand.count, 1));
    const { error } = await supabase.from("designers").insert({
      slug: brand.slug,
      name: brand.name,
      image_url: brand.image_url,
      hero_image: brand.image_url,
      natural_fiber_percent: avgNFP,
      status: "active",
      is_featured: false,
      created_at: new Date().toISOString(),
    });
    if (!error) created++;
  }

  return NextResponse.json({
    brandsChecked: Object.keys(brandMap).length,
    newDesignersCreated: created,
    totalMissing: missing.length,
  });
}
