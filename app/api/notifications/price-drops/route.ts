export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { Resend } from "resend";
import PriceDropEmail from "@/emails/PriceDropEmail";
import { authorizeCron } from "@/lib/cron-auth";
import { EMAIL_FROM } from "@/lib/email-constants";
import { createServiceClient } from "@/lib/supabase/server";
import {
  isPriceDrop,
  loadFavoriteProductsForPriceCheck,
  parsePrice,
  type FavoritePriceRow,
} from "@/lib/price-drop-favorites";

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  const supabase = createServiceClient();

  const { data: favorites, error } = await supabase
    .from("product_favorites")
    .select("id, user_id, product_id, saved_price, saved_currency")
    .not("saved_price", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const favRows = (favorites || []) as FavoritePriceRow[];
  const productsByKey = await loadFavoriteProductsForPriceCheck(supabase, favRows);

  const eligible = favRows.filter((fav) => {
    const product = productsByKey.get(String(fav.product_id));
    if (!product || product.is_active === false) return false;
    return isPriceDrop(parsePrice(fav.saved_price), parsePrice(product.price));
  });

  const resend = new Resend(apiKey);
  let emailed = 0;
  let skippedNoEmail = 0;
  let skippedNoProduct = 0;

  const userIds = [...new Set(eligible.map((n) => n.user_id))];
  const emailByUser = new Map<string, string>();
  const nameByUser = new Map<string, string>();

  for (const uid of userIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(uid);
    const email = userData?.user?.email;
    if (email && userData?.user) {
      emailByUser.set(uid, email);
      const meta = userData.user.user_metadata || {};
      nameByUser.set(uid, String(meta.first_name || meta.name || "").split(" ")[0] || "");
    }
  }

  for (const notif of eligible) {
    const product = productsByKey.get(String(notif.product_id));
    if (!product) {
      skippedNoProduct++;
      continue;
    }
    const savedPrice = parsePrice(notif.saved_price);
    const currentPrice = parsePrice(product.price);
    if (savedPrice == null || currentPrice == null) continue;

    const email = emailByUser.get(notif.user_id);
    if (!email) {
      skippedNoEmail++;
      continue;
    }

    const currency = product.currency || notif.saved_currency || "USD";
    const productUrl = product.url || `https://www.intertexe.com/product/${product.id}`;

    try {
      const emailHtml = await render(
        PriceDropEmail({
          firstName: nameByUser.get(notif.user_id) || "",
          productName: product.name,
          brandName: product.brand_name,
          originalPrice: savedPrice,
          newPrice: currentPrice,
          currency,
          imageUrl: product.image_url || "",
          productUrl,
          naturalFiberPercent: Math.round(Number(product.natural_fiber_percent) || 0),
        })
      );

      const drop = Math.round((1 - currentPrice / savedPrice) * 100);
      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: `Price drop on your saved item — ${drop}% off`,
        html: emailHtml,
      });
      emailed++;

      // Prevent repeat alerts for the same drop level.
      if (notif.id) {
        await supabase
          .from("product_favorites")
          .update({ saved_price: currentPrice })
          .eq("id", notif.id);
      }
    } catch (e) {
      console.error("Price drop email failed:", e);
    }
  }

  return NextResponse.json({
    checked: favRows.length,
    matchedProducts: productsByKey.size,
    eligible: eligible.length,
    emailed,
    skippedNoEmail,
    skippedNoProduct,
  });
}
