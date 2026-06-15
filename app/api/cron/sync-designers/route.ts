import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { liveProductsApparelFrom } from "@/lib/global-catalog-scope";

export const dynamic = "force-dynamic";

const MIN_LIVE_PRODUCTS = 5;
const PAGE_SIZE = 1000;
const MAX_PAGES = 200;

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const supabase = createServiceClient();
  const brandCounts = new Map<string, number>();

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const { data, error } = await liveProductsApparelFrom(supabase)
      .select("brand_slug")
      .not("brand_slug", "is", null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.length) break;

    for (const row of data) {
      const slug = String(row.brand_slug || "").trim().toLowerCase();
      if (!slug) continue;
      brandCounts.set(slug, (brandCounts.get(slug) || 0) + 1);
    }

    if (data.length < PAGE_SIZE) break;
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
    const slug = String(row.slug || "").trim().toLowerCase();
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
