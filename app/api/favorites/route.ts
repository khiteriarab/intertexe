import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { getServerSupabase } from "../../../lib/supabase-server";
import { snakeToCamel } from "../../../lib/case-utils";

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json([], { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json([], { status: 500 });

  const { data } = await supabase.from("favorites").select("*").eq("user_id", user.id);
  return NextResponse.json(snakeToCamel(data || []));
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { designerId } = await request.json();
  if (!designerId) return NextResponse.json({ message: "designerId required" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "Database not available" }, { status: 500 });

  const { data: existing } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .eq("designer_id", designerId)
    .limit(1);

  if (existing && existing.length > 0) return NextResponse.json(snakeToCamel(existing[0]));

  const { data: fav, error } = await supabase
    .from("favorites")
    .insert({ user_id: user.id, designer_id: designerId })
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(snakeToCamel(fav), { status: 201 });
}
