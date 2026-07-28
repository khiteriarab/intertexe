import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { liveProductsApparelFrom } from "@/lib/global-catalog-scope";

export const dynamic = "force-dynamic";

const MIN_LIVE_PRODUCTS = 5;
const PAGE_SIZE = 1000;
const MAX_PAGES = 200;

/** Count brand_slug occurrences from a paged select. */
async function accumulateBrandCounts(
  fetchPage: (
    offset: number,
    pageSize: number
  ) => Promise<{ data: { brand_slug?: string | null }[] | null; error: { message: string } | null }>,
  brandCounts: Map<string, number>
): Promise<string | null> {
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const { data, error } = await fetchPage(offset, PAGE_SIZE);
    if (error) return error.message;
    if (!data?.length) break;

    for (const row of data) {
      const slug = String(row.brand_slug || "")
        .trim()
        .toLowerCase();
      if (!slug) continue;
      brandCounts.set(slug, (brandCounts.get(slug) || 0) + 1);
    }

    if (data.length < PAGE_SIZE) break;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const supabase = createServiceClient();
  const brandCounts = new Map<string, number>();

  // Apparel lane (existing).
  const apparelErr = await accumulateBrandCounts(
    async (offset, pageSize) =>
      liveProductsApparelFrom(supabase)
        .select("brand_slug")
        .not("brand_slug", "is", null)
        .range(offset, offset + pageSize - 1),
    brandCounts
  );
  if (apparelErr) {
    return NextResponse.json({ error: apparelErr }, { status: 500 });
  }

  // Footwear lane — natural-fiber shoes live on `products` and are excluded from
  // live_products_apparel. Without this, Manolo / Jimmy Choo / Aquazzura stay is_live=false.
  const footwearErr = await accumulateBrandCounts(
    async (offset, pageSize) =>
      supabase
        .from("products")
        .select("brand_slug")
        .eq("is_displayable", true)
        .gte("natural_fiber_percent", 80)
        .not("brand_slug", "is", null)
        .or(
          "garment_type.eq.shoes,category.ilike.%Footwear%,category.ilike.%shoe%,category.ilike.%sandal%,name.ilike.%sandal%,name.ilike.%pump%,name.ilike.%mule%,name.ilike.%loafer%,name.ilike.%boot%"
        )
        .range(offset, offset + pageSize - 1),
    brandCounts
  );
  if (footwearErr) {
    return NextResponse.json({ error: footwearErr }, { status: 500 });
  }

  const { data: designers, error: designersError } = await supabase
    .from("designers")
    .select("slug");

  if (designersError) {
    return NextResponse.json({ error: designersError.message }, { status: 500 });
  }

  const syncedAt = new Date().toISOString();
  let updated = 0;
  let live = 0;

  for (const row of designers || []) {
    const slug = String(row.slug || "")
      .trim()
      .toLowerCase();
    if (!slug) continue;
    const count = brandCounts.get(slug) || 0;
    const isLive = count >= MIN_LIVE_PRODUCTS;
    if (isLive) live++;

    const { error } = await supabase
      .from("designers")
      .update({
        is_live: isLive,
        product_count: count,
        last_synced_at: syncedAt,
      })
      .eq("slug", slug);

    if (!error) updated++;
  }

  const { count: masterTotal } = await supabase
    .from("designers")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    synced: updated,
    live,
    master_total: masterTotal ?? designers?.length ?? 0,
    catalog_brands: brandCounts.size,
    at: syncedAt,
  });
}
