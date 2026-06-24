export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { getServerSupabase } from "../../../lib/supabase-server";
import { pruneUnavailableProductFavorites } from "../../../lib/prune-product-favorites";

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ productIds: [] }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ productIds: [] }, { status: 500 });

  const userId = String(user.id);
  try {
    const { kept, removed } = await pruneUnavailableProductFavorites(supabase, userId);
    return NextResponse.json({ productIds: kept, removedCount: removed.length });
  } catch (err) {
    console.error("[product-favorites] prune failed:", err);
    const { data } = await supabase.from("product_favorites").select("product_id").eq("user_id", userId);
    return NextResponse.json({ productIds: (data || []).map((r: { product_id: string }) => r.product_id) });
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const productId = body.productId as string;
  if (!productId) return NextResponse.json({ message: "productId required" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "Database not available" }, { status: 500 });

  const userId = String(user.id);

  let savedPrice: number | null = body.savedPrice ?? null;
  let savedCurrency: string | null = body.savedCurrency ?? null;
  if (savedPrice == null) {
    const { data: product } = await supabase
      .from("products")
      .select("price, currency")
      .eq("id", productId)
      .maybeSingle();
    if (product?.price) {
      const n = parseFloat(String(product.price).replace(/[^0-9.]/g, ""));
      if (Number.isFinite(n)) savedPrice = n;
      savedCurrency = product.currency || null;
    }
  }

  const row: Record<string, unknown> = {
    user_id: userId,
    product_id: productId,
    saved_price: savedPrice,
    saved_currency: savedCurrency,
    price_at_save: savedPrice,
  };

  const { error } = await supabase
    .from("product_favorites")
    .upsert(row, { onConflict: "user_id,product_id" });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
