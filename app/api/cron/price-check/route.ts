export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-service-client";

function authorize(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
  }

  const { data: priorityProducts } = await supabase
    .from("product_favorites")
    .select("product_id")
    .limit(500);

  const productIds = [...new Set((priorityProducts || []).map((f) => f.product_id))];
  let unavailable = 0;
  let checked = 0;

  for (const productId of productIds) {
    const { data: product } = await supabase
      .from("products")
      .select("id, url")
      .eq("id", productId)
      .maybeSingle();

    if (!product?.url) continue;
    checked++;

    try {
      const response = await fetch(product.url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Intertexe/1.0)" },
      });

      if (!response.ok) {
        unavailable++;
        await supabase
          .from("products")
          .update({
            is_active: false,
            stock_status: "unavailable",
            last_price_check: new Date().toISOString(),
          })
          .eq("id", productId);
      } else {
        await supabase
          .from("products")
          .update({ last_price_check: new Date().toISOString() })
          .eq("id", productId);
      }
    } catch (e) {
      console.error(`Price check failed for ${productId}:`, e);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({
    checked,
    marked_unavailable: unavailable,
    priceChanges: 0,
  });
}
