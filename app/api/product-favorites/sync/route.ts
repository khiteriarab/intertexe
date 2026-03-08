import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { getServerSupabase } from "../../../../lib/supabase-server";

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ productIds: [] }, { status: 401 });

  const { productIds } = await request.json();
  if (!Array.isArray(productIds)) return NextResponse.json({ message: "productIds must be an array" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ productIds: [] }, { status: 500 });

  const { data: existing } = await supabase
    .from("product_favorites")
    .select("product_id")
    .eq("user_id", user.id);

  const existingIds = new Set((existing || []).map((e: any) => e.product_id));
  const newIds = productIds.filter((id: string) => !existingIds.has(id));

  if (newIds.length > 0) {
    await supabase
      .from("product_favorites")
      .insert(newIds.map((productId: string) => ({ user_id: user.id, product_id: productId })));
  }

  const { data: allFavs } = await supabase
    .from("product_favorites")
    .select("product_id")
    .eq("user_id", user.id);

  return NextResponse.json({ productIds: (allFavs || []).map((f: any) => f.product_id) });
}
