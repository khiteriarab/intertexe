export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
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

function parsePrice(val: unknown): number | null {
  if (val == null) return null;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
  }

  const { data: priceDrops, error } = await supabase
    .from("product_favorites")
    .select(
      "user_id, product_id, saved_price, saved_currency, products!inner(id, name, brand_name, price, currency, image_url, url)"
    )
    .not("saved_price", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notifications =
    priceDrops?.filter((fav: any) => {
      const currentPrice = parsePrice(fav.products?.price);
      const savedPrice = parsePrice(fav.saved_price);
      return currentPrice != null && savedPrice != null && currentPrice < savedPrice * 0.95;
    }) ?? [];

  const apiKey = process.env.RESEND_API_KEY;
  const resend = apiKey ? new Resend(apiKey) : null;
  const from = process.env.RESEND_FROM_EMAIL ?? "Intertexe <hello@intertexe.com>";
  let emailed = 0;

  const userIds = [...new Set(notifications.map((n: any) => n.user_id))];
  const emailByUser = new Map<string, string>();

  for (const uid of userIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(uid);
    const email = userData?.user?.email;
    if (email) emailByUser.set(uid, email);
  }

  for (const notif of notifications) {
    const product = notif.products as any;
    const savedPrice = parsePrice(notif.saved_price);
    const currentPrice = parsePrice(product?.price);
    if (!savedPrice || !currentPrice) continue;

    const drop = Math.round((1 - currentPrice / savedPrice) * 100);
    const email = emailByUser.get(notif.user_id);
    if (!resend || !email) continue;

    try {
      await resend.emails.send({
        from,
        to: email,
        subject: `Price drop on your saved item — ${drop}% off`,
        html: `
          <p>Good news. ${product.brand_name} ${product.name} has dropped ${drop}% in price.</p>
          <p>Now ${product.currency || notif.saved_currency || ""} ${product.price}</p>
          <p><a href="https://www.intertexe.com/product/${product.id}">View on Intertexe</a></p>
        `,
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
