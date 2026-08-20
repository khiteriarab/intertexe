import { render } from "@react-email/render";
import type { SupabaseClient } from "@supabase/supabase-js";
import SaleAlertEmail from "@/emails/SaleAlertEmail";
import { EMAIL_FROM, EMAIL_REPLY_TO, EMAIL_TYPES } from "@/lib/email-constants";
import { liveProductsApparelFrom } from "@/lib/global-catalog-scope";
import { parsePrice } from "@/lib/price-drop-favorites";
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
  alreadyEmailedUserIds: Set<string>
): Promise<{ emailed: number; skipped: number }> {
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("user_id, sale_alert_context, unsubscribed_at")
    .eq("sale_alerts_enabled", true)
    .is("unsubscribed_at", null);

  const recipients = (prefs || []).filter((row) => row.user_id && !alreadyEmailedUserIds.has(String(row.user_id)));
  if (!recipients.length) return { emailed: 0, skipped: 0 };

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
    return { emailed: 0, skipped: recipients.length };
  }

  const onSale = ((saleRows || []) as SaleProduct[]).filter((product) => {
    const current = parsePrice(product.price);
    const original = parsePrice(product.original_price);
    if (product.is_sale === true && current != null && current > 0) return true;
    return original != null && current != null && current > 0 && current < original * 0.95;
  });
  if (!onSale.length) return { emailed: 0, skipped: recipients.length };

  let emailed = 0;
  let skipped = 0;

  for (const pref of recipients) {
    const userId = String(pref.user_id);
    const ctx = (pref.sale_alert_context || null) as SaleAlertContext | null;
    const ranked = [...onSale].sort((a, b) => scoreSaleProduct(b, ctx) - scoreSaleProduct(a, ctx));
    const product = ranked[0];
    if (!product) {
      skipped++;
      continue;
    }

    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email) {
      skipped++;
      continue;
    }

    const productKey = String(product.product_id || product.id);
    const { data: prior } = await supabase
      .from("price_drop_notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productKey)
      .limit(1)
      .maybeSingle();
    if (prior?.id) {
      skipped++;
      continue;
    }

    const salePrice = parsePrice(product.price);
    if (salePrice == null) {
      skipped++;
      continue;
    }
    const originalPrice = parsePrice(product.original_price);
    const productUrl = product.url || `https://www.intertexe.com/product/${product.id}`;

    try {
      const html = await render(
        SaleAlertEmail({
          productName: product.name,
          brandName: product.brand_name || "",
          originalPrice,
          salePrice,
          currency: product.currency || "USD",
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
      if (!sendResult.ok) {
        skipped++;
        continue;
      }
      await supabase.from("price_drop_notifications").insert({
        user_id: userId,
        product_id: productKey,
        old_price: originalPrice,
        new_price: salePrice,
        emailed_at: new Date().toISOString(),
      });
      emailed++;
    } catch (err) {
      console.error("sale-alert email failed:", err);
      skipped++;
    }
  }

  return { emailed, skipped };
}
