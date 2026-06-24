export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { getServerSupabase } from "../../../../lib/supabase-server";

/** Read taste profile (quiz + scanner signals). */
export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ profile: null }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ profile: null }, { status: 500 });

  const { data, error } = await supabase
    .from("user_taste_profiles")
    .select("*")
    .eq("user_id", String(user.id))
    .maybeSingle();

  if (error) return NextResponse.json({ profile: null }, { status: 500 });
  return NextResponse.json({ profile: data });
}

/** Upsert taste profile from web quiz or iOS sync. */
export async function PUT(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "Database not available" }, { status: 500 });

  const userId = String(user.id);
  const row = {
    user_id: userId,
    preferred_fibers: Array.isArray(body.preferredFibers) ? body.preferredFibers : undefined,
    preferred_designers: Array.isArray(body.preferredDesigners) ? body.preferredDesigners : undefined,
    preferred_occasions: Array.isArray(body.preferredOccasions) ? body.preferredOccasions : undefined,
    preferred_silhouettes: Array.isArray(body.preferredSilhouettes) ? body.preferredSilhouettes : undefined,
    synthetic_tolerance:
      typeof body.syntheticTolerance === "number" ? body.syntheticTolerance : undefined,
    price_min: typeof body.priceMin === "number" ? body.priceMin : undefined,
    price_max: typeof body.priceMax === "number" ? body.priceMax : undefined,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_taste_profiles")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
