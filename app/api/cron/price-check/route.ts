import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import PriceDropEmail from '@/emails/PriceDropEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: favorites } = await supabase
    .from('product_favorites')
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
    .not('saved_price', 'is', null)
    .eq('products.is_active', true)

  if (!favorites || favorites.length === 0) {
    return NextResponse.json({ checked: 0, drops: 0 })
  }

  let priceDrops = 0

  for (const fav of favorites as any[]) {
    const currentPrice = parseFloat(String(fav.products.price))
    const savedPrice = parseFloat(String(fav.saved_price))
    if (!Number.isFinite(currentPrice) || !Number.isFinite(savedPrice) || savedPrice <= 0) {
      continue
    }

    if (currentPrice < savedPrice * 0.95) {
      const dropPercent = Math.round((1 - currentPrice / savedPrice) * 100)

      const { data: userData } = await supabase.auth.admin.getUserById(fav.user_id)
      if (!userData?.user?.email) continue

      try {
        const emailHtml = await render(PriceDropEmail({
          firstName: userData.user.user_metadata?.first_name || '',
          productName: fav.products.name,
          brandName: fav.products.brand_name,
          originalPrice: savedPrice,
          newPrice: currentPrice,
          currency: fav.products.currency || 'USD',
          imageUrl: fav.products.image_url || '',
          productUrl: fav.products.url,
          naturalFiberPercent: fav.products.natural_fiber_percent || 0
        }))

        await resend.emails.send({
          from: 'Intertexe <info@mail.intertexe.com>',
          to: userData.user.email,
          subject: `Price drop on your saved item — ${dropPercent}% off`,
          html: emailHtml
        })

        priceDrops++

        await supabase
          .from('product_favorites')
          .update({ saved_price: currentPrice })
          .eq('id', fav.id)

      } catch (error) {
        console.error('Price drop email failed:', error)
      }
    }

    await supabase
      .from('products')
      .update({ last_price_check: new Date().toISOString() })
      .eq('id', fav.product_id)
  }

  return NextResponse.json({
    checked: favorites.length,
    drops: priceDrops
  })
}
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
  }

  const { data: priorityProducts } = await supabase
    .from("product_favorites")
    .select("product_id")
    .limit(500);

  const productIds = [...new Set((priorityProducts || []).map((f) => f.product_id))];
  let unavailable = 0;
  let checked = 0;

  for (const productId of productIds) {
    const { data: product } = await supabase
      .from("products")
      .select("id, url")
      .eq("id", productId)
      .maybeSingle();

    if (!product?.url) continue;
    checked++;

    try {
      const response = await fetch(product.url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Intertexe/1.0)" },
      });

      if (!response.ok) {
        unavailable++;
        await supabase
          .from("products")
          .update({
            is_active: false,
            stock_status: "unavailable",
            last_price_check: new Date().toISOString(),
          })
          .eq("id", productId);
      } else {
        await supabase
          .from("products")
          .update({ last_price_check: new Date().toISOString() })
          .eq("id", productId);
      }
    } catch (e) {
      console.error(`Price check failed for ${productId}:`, e);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({
    checked,
    marked_unavailable: unavailable,
    priceChanges: 0,
  });
}
