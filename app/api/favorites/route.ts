export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { getServerSupabase } from "../../../lib/supabase-server";

/** @deprecated Use product_favorites for products; designer saves use user_saved_designers. */
export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json([], { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json([], { status: 500 });

  const { data } = await supabase
    .from("user_saved_designers")
    .select("designer_name, created_at")
    .eq("user_id", String(user.id));

  const mapped = (data || []).map((row) => ({
    designerId: row.designer_name,
    designerName: row.designer_name,
    createdAt: row.created_at,
  }));
  return NextResponse.json(mapped);
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { designerId } = await request.json();
  if (!designerId) return NextResponse.json({ message: "designerId required" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "Database not available" }, { status: 500 });

  const designerName = String(designerId).trim();
  const { data: existing } = await supabase
    .from("user_saved_designers")
    .select("designer_name")
    .eq("user_id", String(user.id))
    .eq("designer_name", designerName)
    .limit(1);

  if (existing?.length) {
    return NextResponse.json({
      designerId: designerName,
      designerName,
      createdAt: new Date().toISOString(),
    });
  }

  const { error } = await supabase.from("user_saved_designers").insert({
    user_id: String(user.id),
    designer_name: designerName,
  });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ designerId: designerName, designerName }, { status: 201 });
}
