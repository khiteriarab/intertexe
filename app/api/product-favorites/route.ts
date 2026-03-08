import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { getServerSupabase } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ productIds: [] }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ productIds: [] }, { status: 500 });

  const { data } = await supabase.from("product_favorites").select("product_id").eq("user_id", user.id);
  return NextResponse.json({ productIds: (data || []).map((r: any) => r.product_id) });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { productId } = await request.json();
  if (!productId) return NextResponse.json({ message: "productId required" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "Database not available" }, { status: 500 });

  const { data: existing } = await supabase
    .from("product_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .limit(1);

  if (existing && existing.length > 0) return NextResponse.json({ success: true });

  await supabase.from("product_favorites").insert({ user_id: user.id, product_id: productId });
  return NextResponse.json({ success: true }, { status: 201 });
}
