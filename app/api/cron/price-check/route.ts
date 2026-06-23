import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import PriceDropEmail from "@/emails/PriceDropEmail";

import { EMAIL_FROM } from "@/lib/email-constants";

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

  const { data: favorites } = await supabase
    .from("product_favorites")
    .select(`
      id,
      user_id,
      product_id,
      saved_price,
      saved_currency,
      products!inner(
        id, name, brand_name, price, currency,
        image_url, url, natural_fiber_percent, is_active
      )
    `)
    .not("saved_price", "is", null)
    .eq("products.is_active", true);

  if (!favorites || favorites.length === 0) {
    return NextResponse.json({ checked: 0, drops: 0 });
  }

  let priceDrops = 0;

  for (const fav of favorites as any[]) {
    const currentPrice = parseFloat(String(fav.products.price));
    const savedPrice = parseFloat(String(fav.saved_price));
    if (!Number.isFinite(currentPrice) || !Number.isFinite(savedPrice) || savedPrice <= 0) {
      continue;
    }

    if (currentPrice < savedPrice * 0.95) {
      const dropPercent = Math.round((1 - currentPrice / savedPrice) * 100);

      const { data: userData } = await supabase.auth.admin.getUserById(fav.user_id);
      if (!userData?.user?.email) continue;

      try {
        const emailHtml = await render(
          PriceDropEmail({
            firstName: userData.user.user_metadata?.first_name || "",
            productName: fav.products.name,
            brandName: fav.products.brand_name,
            originalPrice: savedPrice,
            newPrice: currentPrice,
            currency: fav.products.currency || "USD",
            imageUrl: fav.products.image_url || "",
            productUrl: fav.products.url,
            naturalFiberPercent: fav.products.natural_fiber_percent || 0,
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
      } catch (error) {
        console.error("Price drop email failed:", error);
      }
    }

    await supabase
      .from("products")
      .update({ last_price_check: new Date().toISOString() })
      .eq("id", fav.product_id);
  }

  return NextResponse.json({
    checked: favorites.length,
    drops: priceDrops,
  });
}
