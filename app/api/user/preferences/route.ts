export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { getServerSupabase } from "../../../../lib/supabase-server";
import type { MarketFilter } from "../../../../lib/shipping-regions";

const VALID_MARKETS: MarketFilter[] = ["all", "us-ca", "eu-uk-me"];

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ shopMarket: "all" });

  const { data } = await supabase
    .from("user_preferences")
    .select("shop_market, country_code, currency")
    .eq("user_id", String(user.id))
    .maybeSingle();

  return NextResponse.json({
    shopMarket: (data?.shop_market as MarketFilter) || "all",
    countryCode: data?.country_code || null,
    currency: data?.currency || null,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const shopMarket = body.shopMarket as MarketFilter;
  if (!VALID_MARKETS.includes(shopMarket)) {
    return NextResponse.json({ message: "Invalid shopMarket" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "Database unavailable" }, { status: 500 });

  await supabase.from("user_preferences").upsert({
    user_id: String(user.id),
    shop_market: shopMarket,
    country_code: body.countryCode || null,
    currency: body.currency || null,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, shopMarket });
}
