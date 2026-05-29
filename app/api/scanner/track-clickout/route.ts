export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAuthUserId } from '../../../../lib/supabase-auth-server';
import { parsePriceNumber } from '../../../../lib/scanner-copy';
import { recordFunnelEvent } from '../../../../lib/scanner-funnel';

export async function POST(req: NextRequest) {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ message: 'Server not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const body = await req.json();
  const {
    productId,
    productName,
    brandSlug,
    sessionId,
    userId: bodyUserId,
    scannedUPC,
    scannedPrice,
    alternativePrice,
    position,
    affiliateUrl,
  } = body;

  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const authUserId = accessToken ? await getSupabaseAuthUserId(accessToken) : null;
  const userId = authUserId || bodyUserId || null;

  const altPrice = parsePriceNumber(alternativePrice) ?? (typeof alternativePrice === 'number' ? alternativePrice : null);
  const scanPrice = parsePriceNumber(scannedPrice) ?? (typeof scannedPrice === 'number' ? scannedPrice : null);

  try {
    if (sessionId) {
      await recordFunnelEvent(supabase, {
        session_id: String(sessionId),
        event_type: 'alternative_clicked',
        user_id: userId,
        scan_source: 'alternative',
        has_result: true,
      });
    }

    await supabase.from('scanner_clickouts').insert({
      product_id: productId ? String(productId) : null,
      product_name: productName || null,
      brand_slug: brandSlug || null,
      session_id: sessionId || null,
      user_id: userId,
      scanned_upc: scannedUPC || null,
      scanned_price: scanPrice,
      alternative_price: altPrice,
      price_difference: altPrice != null && scanPrice != null ? altPrice - scanPrice : null,
      position_in_results: position ?? null,
      affiliate_url: affiliateUrl || null,
      clicked_at: new Date().toISOString(),
    });
  } catch {
    /* table may not exist yet */
  }

  return NextResponse.json({
    redirect_url: affiliateUrl,
    tracked: true,
  });
}
