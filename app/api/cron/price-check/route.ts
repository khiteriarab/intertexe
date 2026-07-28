import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import PriceDropEmail from "@/emails/PriceDropEmail";
import { EMAIL_FROM } from "@/lib/email-constants";
import {
  isPriceDrop,
  loadFavoriteProductsForPriceCheck,
  parsePrice,
  type FavoritePriceRow,
} from "@/lib/price-drop-favorites";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }
  const resend = new Resend(apiKey);
  const supabase = createServiceClient();

  const { data: favorites, error } = await supabase
    .from("product_favorites")
    .select("id, user_id, product_id, saved_price, saved_currency")
    .not("saved_price", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!favorites?.length) {
    return NextResponse.json({ checked: 0, drops: 0 });
  }

  const favRows = favorites as FavoritePriceRow[];
  const productsByKey = await loadFavoriteProductsForPriceCheck(supabase, favRows);
  let priceDrops = 0;
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

    const { data: userData } = await supabase.auth.admin.getUserById(fav.user_id);
    if (!userData?.user?.email) continue;

    try {
      const dropPercent = Math.round((1 - currentPrice / savedPrice) * 100);
      const emailHtml = await render(
        PriceDropEmail({
          firstName: userData.user.user_metadata?.first_name || "",
          productName: product.name,
          brandName: product.brand_name,
          originalPrice: savedPrice,
          newPrice: currentPrice,
          currency: product.currency || fav.saved_currency || "USD",
          imageUrl: product.image_url || "",
          productUrl: product.url || `https://www.intertexe.com/product/${product.id}`,
          naturalFiberPercent: product.natural_fiber_percent || 0,
        })
      );

      await resend.emails.send({
        from: EMAIL_FROM,
        to: userData.user.email,
        subject: `Price drop on your saved item — ${dropPercent}% off`,
        html: emailHtml,
      });

      priceDrops++;
      await supabase
        .from("product_favorites")
        .update({ saved_price: currentPrice })
        .eq("id", fav.id);
    } catch (err) {
      console.error("Price drop email failed:", err);
    }

    await supabase
      .from("products")
      .update({ last_price_check: new Date().toISOString() })
      .eq("id", product.id);
  }

  return NextResponse.json({
    checked: favRows.length,
    matched,
    drops: priceDrops,
  });
}
