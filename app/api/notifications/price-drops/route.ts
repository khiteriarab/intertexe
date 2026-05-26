export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { Resend } from "resend";
import PriceDropEmail from "@/emails/PriceDropEmail";
import { authorizeCron } from "@/lib/cron-auth";
import { EMAIL_FROM } from "@/lib/email-constants";
import { createServiceClient } from "@/lib/supabase/server";

function parsePrice(val: unknown): number | null {
  if (val == null) return null;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  const supabase = createServiceClient();

  const { data: priceDrops, error } = await supabase
    .from("product_favorites")
    .select(
      "user_id, product_id, saved_price, saved_currency, products!inner(id, name, brand_name, price, currency, image_url, url, natural_fiber_percent)"
    )
    .not("saved_price", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notifications =
    priceDrops?.filter((fav) => {
      const product = fav.products as { price?: unknown } | null;
      const currentPrice = parsePrice(product?.price);
      const savedPrice = parsePrice(fav.saved_price);
      return currentPrice != null && savedPrice != null && currentPrice < savedPrice * 0.95;
    }) ?? [];

  const resend = new Resend(apiKey);
  let emailed = 0;

  const userIds = [...new Set(notifications.map((n: { user_id: string }) => n.user_id))];
  const emailByUser = new Map<string, string>();
  const nameByUser = new Map<string, string>();

  for (const uid of userIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(uid);
    const email = userData?.user?.email;
    if (email && userData?.user) {
      emailByUser.set(uid, email);
      const meta = userData.user.user_metadata || {};
      nameByUser.set(
        uid,
        String(meta.first_name || meta.name || "").split(" ")[0] || ""
      );
    }
  }

  for (const notif of notifications) {
    const product = notif.products as unknown as {
      id: string;
      name: string;
      brand_name: string;
      price: unknown;
      currency?: string;
      image_url?: string;
      url?: string;
      natural_fiber_percent?: number;
    };
    const savedPrice = parsePrice(notif.saved_price);
    const currentPrice = parsePrice(product?.price);
    if (!savedPrice || !currentPrice) continue;

    const email = emailByUser.get(notif.user_id);
    if (!email) continue;

    const currency = product.currency || notif.saved_currency || "USD";
    const productUrl =
      product.url || `https://www.intertexe.com/product/${product.id}`;

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
    } catch (e) {
      console.error("Price drop email failed:", e);
    }
  }

  return NextResponse.json({
    eligible: notifications.length,
    emailed,
  });
}
