export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { getServerSupabase } from "../../../lib/supabase-server";

/** Merge local activity into Supabase (views + clickouts) — mirrors iOS account sync. */
export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const productViews: string[] = Array.isArray(body.productViews) ? body.productViews : [];
  const clickouts: string[] = Array.isArray(body.clickouts) ? body.clickouts : [];

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "Database not available" }, { status: 500 });

  const userId = String(user.id);
  const now = new Date().toISOString();

  for (const productId of productViews.slice(0, 48)) {
    if (!productId) continue;
    await supabase.from("user_product_views").insert({
      user_id: userId,
      product_id: productId,
      viewed_at: now,
    });
  }

  for (const productId of clickouts.slice(0, 48)) {
    if (!productId) continue;
    await supabase.from("user_product_clickouts").insert({
      user_id: userId,
      product_id: productId,
      clicked_at: now,
    });
  }

  const [{ data: views }, { data: outs }] = await Promise.all([
    supabase
      .from("user_product_views")
      .select("product_id, viewed_at")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(48),
    supabase
      .from("user_product_clickouts")
      .select("product_id, clicked_at")
      .eq("user_id", userId)
      .order("clicked_at", { ascending: false })
      .limit(48),
  ]);

  const dedupe = (rows: { product_id: string }[] | null) => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const row of rows || []) {
      const id = String(row.product_id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids;
  };

  return NextResponse.json({
    productViews: dedupe(views),
    clickouts: dedupe(outs),
  });
}
