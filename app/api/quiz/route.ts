import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { getServerSupabase } from "../../../lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get("authorization"));
    const body = await request.json();
    const { materials, priceRange, syntheticTolerance, favoriteBrands, profileType, recommendation } = body;

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ message: "Database not available" }, { status: 500 });

    const { data: result, error } = await supabase.from("quiz_results").insert({
      user_id: user?.id || null,
      materials: materials || [],
      price_range: priceRange || "",
      synthetic_tolerance: syntheticTolerance || "",
      favorite_brands: favoriteBrands || [],
      profile_type: profileType || null,
      recommendation: recommendation || null,
    }).select().single();

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    if (user && profileType) {
      await supabase.from("users").update({ fabric_persona: profileType }).eq("id", user.id);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
