export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { getServerSupabase } from "../../../lib/supabase-server";
import { snakeToCamel } from "../../../lib/case-utils";
import { upsertTastePreferences } from "../../../lib/taste-preferences";

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
      await upsertTastePreferences(supabase, String(user.id), {
        preferredFibers: materials || [],
        preferredDesigners: favoriteBrands || [],
        syntheticTolerance:
          syntheticTolerance === "low" ? 5 : syntheticTolerance === "high" ? 25 : 10,
        profileType,
        quizRecommendation: recommendation,
      });
    }

    return NextResponse.json(snakeToCamel(result), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
