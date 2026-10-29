export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { hashUrl, sanitizeCaptureUrl } from "../../../lib/capture";
import { getServerSupabase } from "../../../lib/supabase-server";

/** GET /api/price-watches — list active retailer URL watches for the signed-in user. */
export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ watches: [] }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ watches: [] }, { status: 500 });

  const url = req.nextUrl.searchParams.get("url");
  const urlHash = url ? hashUrl(sanitizeCaptureUrl(url) || url) : null;

  let query = supabase
    .from("retailer_price_watches")
    .select(
      "id, original_url, url_hash, title, brand, retailer, currency, original_price, last_known_price, capture_id, source, active, created_at"
    )
    .eq("user_id", String(user.id))
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (urlHash) query = query.eq("url_hash", urlHash);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message, watches: [] }, { status: 500 });

  return NextResponse.json({
    watches: data || [],
    watching: Boolean(urlHash && data && data.length > 0),
  });
}

/** POST /api/price-watches — watch or unwatch a retailer PDP URL. */
export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not available" }, { status: 500 });

  const enabled = body.enabled !== false && body.enabled !== "false";
  const rawUrl = String(body.originalUrl || body.url || "").trim();
  const originalUrl = sanitizeCaptureUrl(rawUrl) || rawUrl;
  if (!originalUrl || !/^https?:\/\//i.test(originalUrl)) {
    return NextResponse.json({ error: "A retailer product URL is required." }, { status: 400 });
  }
  const urlHash = hashUrl(originalUrl);
  if (!urlHash) {
    return NextResponse.json({ error: "Could not normalize that product URL." }, { status: 400 });
  }

  const userId = String(user.id);
  const priceRaw = body.price ?? body.originalPrice;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : priceRaw != null
        ? parseFloat(String(priceRaw).replace(/[^0-9.]/g, ""))
        : NaN;

  if (!enabled) {
    const { error } = await supabase
      .from("retailer_price_watches")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("url_hash", urlHash);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ enabled: false, watching: false });
  }

  let retailer = body.retailer != null ? String(body.retailer).slice(0, 120) : null;
  if (!retailer) {
    try {
      retailer = new URL(originalUrl).hostname.replace(/^www\./i, "");
    } catch {
      retailer = null;
    }
  }

  const row = {
    user_id: userId,
    original_url: originalUrl,
    url_hash: urlHash,
    title: body.title != null ? String(body.title).slice(0, 240) : null,
    brand: body.brand != null ? String(body.brand).slice(0, 120) : null,
    retailer,
    currency: body.currency != null ? String(body.currency).slice(0, 8) : null,
    original_price: Number.isFinite(price) && price > 0 ? price : null,
    last_known_price: Number.isFinite(price) && price > 0 ? price : null,
    capture_id:
      body.captureId && /^[0-9a-f-]{36}$/i.test(String(body.captureId))
        ? String(body.captureId)
        : null,
    source: String(body.source || "tx_match").slice(0, 64),
    active: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("retailer_price_watches")
    .upsert(row, { onConflict: "user_id,url_hash" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    enabled: true,
    watching: true,
    originalUrl,
    originalPrice: row.original_price,
  });
}
