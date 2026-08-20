export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import PriceDropEmail from "@/emails/PriceDropEmail";
import { authorizeCron } from "@/lib/cron-auth";
import { EMAIL_FROM, EMAIL_REPLY_TO, EMAIL_TYPES } from "@/lib/email-constants";
import { sendCustomerEmail } from "@/lib/resend-customer";
import { createServiceClient } from "@/lib/supabase/server";
import {
  isPriceDrop,
  loadCaptureSaleWatchFavorites,
  loadFavoriteProductsForPriceCheck,
  parsePrice,
  type FavoritePriceRow,
} from "@/lib/price-drop-favorites";

/**
 * Canonical price-drop email pipeline.
 * Deduped by price_drop_notifications + email_deliveries logging.
 * /api/cron/price-check no longer sends email.
 */
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  if (!process.env.RESEND_API_KEY) {
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

  const seen = new Set<string>();
  const favRows: FavoritePriceRow[] = [];
  for (const row of [...((favorites || []) as FavoritePriceRow[]), ...(await loadCaptureSaleWatchFavorites(supabase))]) {
    const key = `${row.user_id}:${row.product_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    favRows.push(row);
  }
  const productsByKey = await loadFavoriteProductsForPriceCheck(supabase, favRows);

  const eligible = favRows.filter((fav) => {
    const product = productsByKey.get(String(fav.product_id));
    if (!product || product.is_active === false) return false;
    return isPriceDrop(parsePrice(fav.saved_price), parsePrice(product.price));
  });

  let emailed = 0;
  let skippedNoEmail = 0;
  let skippedNoProduct = 0;
  let skippedDuplicate = 0;
  let skippedOptOut = 0;

  const userIds = [...new Set(eligible.map((n) => n.user_id))];
  const emailByUser = new Map<string, string>();
  const nameByUser = new Map<string, string>();
  const optedOut = new Set<string>();

  for (const uid of userIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(uid);
    const email = userData?.user?.email;
    if (email && userData?.user) {
      emailByUser.set(uid, email);
      const meta = userData.user.user_metadata || {};
      nameByUser.set(uid, String(meta.first_name || meta.name || "").split(" ")[0] || "");
      if (meta.notify_price_drops === false || meta.notify_price_drops === "false") {
        optedOut.add(uid);
      }
    }
  }

  if (userIds.length) {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("user_id, marketing_emails, unsubscribed_at")
      .in("user_id", userIds);
    for (const row of prefs || []) {
      if (row.marketing_emails === false || row.unsubscribed_at) {
        optedOut.add(String(row.user_id));
      }
    }
  }

  for (const notif of eligible) {
    if (optedOut.has(notif.user_id)) {
      skippedOptOut++;
      continue;
    }
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

    // Structural dedupe: same user + product + new_price already emailed → skip.
    const { data: prior } = await supabase
      .from("price_drop_notifications")
      .select("id")
      .eq("user_id", notif.user_id)
      .eq("product_id", notif.product_id)
      .eq("new_price", currentPrice)
      .limit(1)
      .maybeSingle();
    if (prior?.id) {
      skippedDuplicate++;
      continue;
    }

    const currency = product.currency || notif.saved_currency || "USD";
    const productUrl = product.url || `https://www.intertexe.com/product/${product.id}`;
    const drop = Math.round((1 - currentPrice / savedPrice) * 100);

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

      const sendResult = await sendCustomerEmail({
        to: email,
        subject: `Price drop on your saved item — ${drop}% off`,
        html: emailHtml,
        emailType: EMAIL_TYPES.PRICE_DROP,
        userId: notif.user_id,
        from: EMAIL_FROM,
        replyTo: EMAIL_REPLY_TO,
        metadata: {
          product_id: notif.product_id,
          old_price: savedPrice,
          new_price: currentPrice,
          classification: "transactional_alert",
        },
      });

      if (!sendResult.ok) {
        console.error("Price drop email failed:", sendResult.error);
        continue;
      }

      emailed++;

      if (notif.id) {
        await supabase
          .from("product_favorites")
          .update({ saved_price: currentPrice })
          .eq("id", notif.id);
      }

      await supabase.from("price_drop_notifications").insert({
        user_id: notif.user_id,
        product_id: notif.product_id,
        old_price: savedPrice,
        new_price: currentPrice,
        emailed_at: new Date().toISOString(),
      });
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
    skippedOptOut,
    skippedDuplicate,
  });
}
