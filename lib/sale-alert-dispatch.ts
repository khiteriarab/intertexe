import { render } from "@react-email/render";
import type { SupabaseClient } from "@supabase/supabase-js";
import SaleAlertEmail from "@/emails/SaleAlertEmail";
import { EMAIL_FROM, EMAIL_REPLY_TO, EMAIL_TYPES } from "@/lib/email-constants";
import { liveProductsApparelFrom } from "@/lib/global-catalog-scope";
import { parsePrice } from "@/lib/price-drop-favorites";
import {
  formatSaleAlertPushBody,
  sendAlertPushToUser,
} from "@/lib/push/send-user-alert";
import { sendCustomerEmail } from "@/lib/resend-customer";
import { scoreSaleProduct, type SaleAlertContext } from "@/lib/sale-alerts";

type SaleProduct = {
  id: string;
  product_id: string | null;
  name: string;
  brand_name: string | null;
  category: string | null;
  composition: string | null;
  price: unknown;
  original_price: unknown;
  currency: string | null;
  image_url: string | null;
  url: string | null;
  natural_fiber_percent: number | null;
  is_sale: boolean | null;
};

export async function dispatchCatalogSaleAlerts(
  supabase: SupabaseClient,
  alreadyNotifiedUserIds: Set<string>
): Promise<{ emailed: number; pushed: number; skipped: number }> {
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("user_id, sale_alert_context, unsubscribed_at")
    .eq("sale_alerts_enabled", true)
    .is("unsubscribed_at", null);

  const recipients = (prefs || []).filter(
    (row) => row.user_id && !alreadyNotifiedUserIds.has(String(row.user_id))
  );
  if (!recipients.length) return { emailed: 0, pushed: 0, skipped: 0 };

  const { data: saleRows, error } = await liveProductsApparelFrom(supabase)
    .select(
      "id, product_id, name, brand_name, category, composition, price, original_price, currency, image_url, url, natural_fiber_percent, is_sale"
    )
    .eq("is_sale", true)
    .not("image_url", "is", null)
    .gte("natural_fiber_percent", 80)
    .limit(80);

  if (error) {
    console.error("sale-alert catalog query:", error.message);
    return { emailed: 0, pushed: 0, skipped: recipients.length };
  }

  const onSale = ((saleRows || []) as SaleProduct[]).filter((product) => {
    const current = parsePrice(product.price);
    const original = parsePrice(product.original_price);
    if (product.is_sale === true && current != null && current > 0) return true;
    return original != null && current != null && current > 0 && current < original * 0.95;
  });
  if (!onSale.length) return { emailed: 0, pushed: 0, skipped: recipients.length };

  let emailed = 0;
  let pushed = 0;
  let skipped = 0;
  const resendEnabled = Boolean(process.env.RESEND_API_KEY);

  for (const pref of recipients) {
    const userId = String(pref.user_id);
    const ctx = (pref.sale_alert_context || null) as SaleAlertContext | null;
    const ranked = [...onSale].sort((a, b) => scoreSaleProduct(b, ctx) - scoreSaleProduct(a, ctx));
    const product = ranked[0];
    if (!product) {
      skipped++;
      continue;
    }

    const productKey = String(product.product_id || product.id);
    const salePrice = parsePrice(product.price);
    if (salePrice == null) {
      skipped++;
      continue;
    }
    const originalPrice = parsePrice(product.original_price);
    const productUrl = product.url || `https://www.intertexe.com/product/${product.id}`;
    const currency = product.currency || "USD";
    const notificationId = `sale-alert-${userId}-${productKey}-${salePrice}`;

    const { data: prior } = await supabase
      .from("price_drop_notifications")
      .select("id, emailed_at, pushed_at")
      .eq("user_id", userId)
      .eq("product_id", productKey)
      .eq("new_price", salePrice)
      .limit(1)
      .maybeSingle();
    if (prior?.id && prior.emailed_at && prior.pushed_at) {
      skipped++;
      continue;
    }

    let emailSent = Boolean(prior?.emailed_at);
    let pushSent = Boolean(prior?.pushed_at);

    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email;

    if (!emailSent && email && resendEnabled) {
      try {
        const html = await render(
          SaleAlertEmail({
            productName: product.name,
            brandName: product.brand_name || "",
            originalPrice,
            salePrice,
            currency,
            imageUrl: product.image_url || "",
            productUrl,
            naturalFiberPercent: Number(product.natural_fiber_percent) || 0,
          })
        );
        const sendResult = await sendCustomerEmail({
          to: email,
          subject: "A sale on INTERTEXE",
          html,
          emailType: EMAIL_TYPES.SALE_ALERT,
          userId,
          from: EMAIL_FROM,
          replyTo: EMAIL_REPLY_TO,
          metadata: {
            product_id: productKey,
            classification: "sale_alert",
            source: ctx?.source || "account",
          },
        });
        if (sendResult.ok) {
          emailSent = true;
          emailed++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error("sale-alert email failed:", err);
        skipped++;
      }
    }

    if (!pushSent) {
      const pushResult = await sendAlertPushToUser(supabase, {
        userId,
        title: "A sale on INTERTEXE",
        body: formatSaleAlertPushBody(product.brand_name, product.name, salePrice, currency),
        imageUrl: product.image_url,
        deeplink: "sale",
        notificationType: "sale_alert",
        notificationId,
        productId: productKey,
      });
      if (pushResult.sent) {
        pushSent = true;
        pushed++;
      }
    }

    if (!emailSent && !pushSent) {
      skipped++;
      continue;
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
        user_id: userId,
        product_id: productKey,
        old_price: originalPrice,
        new_price: salePrice,
        emailed_at: emailSent ? now : null,
        pushed_at: pushSent ? now : null,
      });
    }
  }

  return { emailed, pushed, skipped };
}
