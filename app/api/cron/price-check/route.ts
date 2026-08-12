import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  isPriceDrop,
  loadFavoriteProductsForPriceCheck,
  parsePrice,
  type FavoritePriceRow,
} from "@/lib/price-drop-favorites";

export const dynamic = "force-dynamic";

/**
 * LEGACY price-check cron — email sending RETIRED.
 *
 * Canonical customer price-drop emails are sent only by:
 *   GET /api/notifications/price-drops (deduped via price_drop_notifications + email_deliveries)
 *
 * This route no longer sends Resend email. It remains callable for manual ops to
 * refresh last_price_check timestamps only. Removed from vercel.json schedules.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: favorites, error } = await supabase
    .from("product_favorites")
    .select("id, user_id, product_id, saved_price, saved_currency")
    .not("saved_price", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!favorites?.length) {
    return NextResponse.json({
      checked: 0,
      dropsDetected: 0,
      emailed: 0,
      note: "Email sending retired — use /api/notifications/price-drops",
    });
  }

  const favRows = favorites as FavoritePriceRow[];
  const productsByKey = await loadFavoriteProductsForPriceCheck(supabase, favRows);
  let dropsDetected = 0;
  let matched = 0;

  for (const fav of favRows) {
    const product = productsByKey.get(String(fav.product_id));
    if (!product) continue;
    matched++;
    if (product.is_active === false) continue;

    const currentPrice = parsePrice(product.price);
    const savedPrice = parsePrice(fav.saved_price);
    if (!isPriceDrop(savedPrice, currentPrice) || savedPrice == null || currentPrice == null) {
      continue;
    }

    dropsDetected++;
    await supabase
      .from("products")
      .update({ last_price_check: new Date().toISOString() })
      .eq("id", product.id);
  }

  return NextResponse.json({
    checked: favRows.length,
    matched,
    dropsDetected,
    emailed: 0,
    note: "Email sending retired — use /api/notifications/price-drops",
  });
}
