export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { getServerSupabase } from "../../../../lib/supabase-server";

const MAX_VIEWS = 48;

/** Record a product view (mirrors iOS user_product_views). */
export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const productId = String(body.productId || "").trim();
  if (!productId) return NextResponse.json({ message: "productId required" }, { status: 400 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "Database not available" }, { status: 500 });

  const userId = String(user.id);
  const { error } = await supabase.from("user_product_views").insert({
    user_id: userId,
    product_id: productId,
    viewed_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  // Trim old rows — keep latest MAX_VIEWS per user.
  const { data: recent } = await supabase
    .from("user_product_views")
    .select("id")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .range(MAX_VIEWS, MAX_VIEWS + 200);
  const staleIds = (recent || []).map((r: { id: string }) => r.id);
  if (staleIds.length) {
    await supabase.from("user_product_views").delete().in("id", staleIds);
  }

  return NextResponse.json({ success: true });
}

/** Recent product view IDs (newest first). */
export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ productIds: [] }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ productIds: [] }, { status: 500 });

  const { data, error } = await supabase
    .from("user_product_views")
    .select("product_id, viewed_at")
    .eq("user_id", String(user.id))
    .order("viewed_at", { ascending: false })
    .limit(MAX_VIEWS);

  if (error) return NextResponse.json({ productIds: [] }, { status: 500 });

  const seen = new Set<string>();
  const productIds: string[] = [];
  for (const row of data || []) {
    const id = String(row.product_id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    productIds.push(id);
  }

  return NextResponse.json({ productIds });
}
