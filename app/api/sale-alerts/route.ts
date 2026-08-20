export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { captureWatchId, savedPriceText } from "../../../lib/sale-alerts";
import { getServerSupabase } from "../../../lib/supabase-server";

function captureIdFrom(req: NextRequest, body?: Record<string, unknown>): string {
  const fromQuery = req.nextUrl.searchParams.get("captureId") || "";
  const fromBody = body?.captureId != null ? String(body.captureId) : "";
  return (fromBody || fromQuery).trim();
}

export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ enabled: false }, { status: 401 });

  const captureId = captureIdFrom(req);
  if (!captureId) return NextResponse.json({ error: "captureId required" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ enabled: false }, { status: 500 });

  const { data } = await supabase
    .from("price_watches")
    .select("product_id")
    .eq("user_id", String(user.id))
    .eq("product_id", captureWatchId(captureId))
    .maybeSingle();

  return NextResponse.json({ enabled: Boolean(data?.product_id) });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const captureId = captureIdFrom(req, body);
  if (!captureId) return NextResponse.json({ error: "captureId required" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not available" }, { status: 500 });

  const enabled = body.enabled !== false && body.enabled !== "false";
  const watchId = captureWatchId(captureId);
  const userId = String(user.id);

  if (!enabled) {
    await supabase.from("price_watches").delete().eq("user_id", userId).eq("product_id", watchId);
    return NextResponse.json({ enabled: false });
  }

  const originalPrice =
    savedPriceText(body.price, body.currency != null ? String(body.currency) : null) ||
    savedPriceText(body.savedPrice, body.currency != null ? String(body.currency) : null);
  if (!originalPrice) {
    return NextResponse.json({ error: "A price is required to watch this piece for a sale." }, { status: 400 });
  }

  const { error } = await supabase.from("price_watches").upsert(
    {
      user_id: userId,
      product_id: watchId,
      original_price: originalPrice,
    },
    { onConflict: "user_id,product_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ enabled: true });
}
