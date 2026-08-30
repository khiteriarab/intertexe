export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import PriceDropEmail from "@/emails/PriceDropEmail";
import { authorizeCron } from "@/lib/cron-auth";
import { EMAIL_FROM, EMAIL_REPLY_TO, EMAIL_TYPES } from "@/lib/email-constants";
import {
  formatPriceDropPushBody,
  sendAlertPushToUser,
} from "@/lib/push/send-user-alert";
import { dispatchCatalogSaleAlerts } from "@/lib/sale-alert-dispatch";
import { sendCustomerEmail } from "@/lib/resend-customer";
import { createServiceClient } from "@/lib/supabase/server";
import {
  isPriceDrop,
  loadFavoriteProductsForPriceCheck,
  parsePrice,
  type FavoritePriceRow,
} from "@/lib/price-drop-favorites";

/**
 * Canonical price-drop alert pipeline (email + rich APNs push).
 * Deduped by price_drop_notifications + email_deliveries logging.
 */
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const supabase = createServiceClient();
  const resendEnabled = Boolean(process.env.RESEND_API_KEY);

  const { data: favorites, error } = await supabase
    .from("product_favorites")
    .select("id, user_id, product_id, saved_price, saved_currency")
    .not("saved_price", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const seen = new Set<string>();
  const favRows: FavoritePriceRow[] = [];
  for (const row of (favorites || []) as FavoritePriceRow[]) {
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
  let pushed = 0;
  let skippedNoEmail = 0;
  let skippedNoProduct = 0;
  let skippedDuplicate = 0;
  let skippedOptOut = 0;
  let skippedNoToken = 0;
  const notifiedUserIds = new Set<string>();

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

    const { data: prior } = await supabase
      .from("price_drop_notifications")
      .select("id, emailed_at, pushed_at")
      .eq("user_id", notif.user_id)
      .eq("product_id", notif.product_id)
      .eq("new_price", currentPrice)
      .limit(1)
      .maybeSingle();

    const email = emailByUser.get(notif.user_id);
    const canEmail = Boolean(email && resendEnabled);
    let emailSent = Boolean(prior?.emailed_at);
    let pushSent = Boolean(prior?.pushed_at);

    if (prior?.id && emailSent && pushSent) {
      skippedDuplicate++;
      continue;
    }
    if (prior?.id && emailSent && !canEmail && pushSent) {
      skippedDuplicate++;
      continue;
    }

    const productKey = String(product.product_id || product.id || notif.product_id);
    const notificationId = `price-drop-${notif.user_id}-${productKey}-${currentPrice}`;

    if (!emailSent && email && resendEnabled) {
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

        if (sendResult.ok) {
          emailSent = true;
          emailed++;
          notifiedUserIds.add(notif.user_id);
        } else {
          console.error("Price drop email failed:", sendResult.error);
        }
      } catch (e) {
        console.error("Price drop email failed:", e);
      }
    } else if (!emailSent && !email) {
      skippedNoEmail++;
    }

    if (!pushSent) {
      const currency = product.currency || notif.saved_currency || "USD";
      const drop = Math.round((1 - currentPrice / savedPrice) * 100);
      const pushResult = await sendAlertPushToUser(supabase, {
        userId: notif.user_id,
        title: "Price drop on your saved item",
        body: formatPriceDropPushBody(
          product.brand_name,
          product.name,
          drop,
          currentPrice,
          currency
        ),
        imageUrl: product.image_url,
        deeplink: "product",
        notificationType: "price_drop",
        notificationId,
        productId: productKey,
      });
      if (pushResult.sent) {
        pushSent = true;
        pushed++;
        notifiedUserIds.add(notif.user_id);
      } else if (pushResult.reason === "no_token") {
        skippedNoToken++;
      }
    }

    if (!emailSent && !pushSent) continue;

    if (notif.id) {
      await supabase
        .from("product_favorites")
        .update({ saved_price: currentPrice })
        .eq("id", notif.id);
    }

    const now = new Date().toISOString();
    if (prior?.id) {
      await supabase
        .from("price_drop_notifications")
        .update({
          ...(emailSent && !prior.emailed_at ? { emailed_at: now } : {}),
          ...(pushSent && !prior.pushed_at ? { pushed_at: now } : {}),
        })
        .eq("id", prior.id);
    } else {
      await supabase.from("price_drop_notifications").insert({
        user_id: notif.user_id,
        product_id: notif.product_id,
        old_price: savedPrice,
        new_price: currentPrice,
        emailed_at: emailSent ? now : null,
        pushed_at: pushSent ? now : null,
      });
    }
  }

  const saleAlerts = await dispatchCatalogSaleAlerts(supabase, notifiedUserIds);

  return NextResponse.json({
    checked: favRows.length,
    matchedProducts: productsByKey.size,
    eligible: eligible.length,
    emailed,
    pushed,
    skippedNoEmail,
    skippedNoToken,
    skippedNoProduct,
    skippedOptOut,
    skippedDuplicate,
    saleAlerts,
    resendEnabled,
  });
}
