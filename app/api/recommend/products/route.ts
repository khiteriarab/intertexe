import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import { buildRecommendedProducts } from "../../../../lib/recommend-products";

export const dynamic = "force-dynamic";

/**
 * Personalized product recommendations for iOS scanner / PDP rails.
 * Ranking lives on the server so merchandising rules can change without an app rebuild.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await getUserFromToken(request.headers.get("authorization"));

    let savedProductIds: string[] = Array.isArray(body?.savedProductIds)
      ? body.savedProductIds.map((id: unknown) => String(id || "").trim()).filter(Boolean)
      : [];

    // Prefer durable server favorites when signed in.
    if (user?.id) {
      const supabase = getServerSupabase();
      if (supabase) {
        const { data } = await supabase
          .from("product_favorites")
          .select("product_id")
          .eq("user_id", String(user.id))
          .order("created_at", { ascending: false })
          .limit(80);
        const serverIds = (data || [])
          .map((row: { product_id?: string }) => String(row.product_id || "").trim())
          .filter(Boolean);
        if (serverIds.length) {
          savedProductIds = Array.from(new Set([...serverIds, ...savedProductIds]));
        }
      }
    }

    const payload = await buildRecommendedProducts({
      fiber: body?.fiber,
      priceUSD: body?.priceUSD ?? body?.price,
      currency: body?.currency,
      garmentType: body?.garmentType,
      naturalPercent: body?.naturalPercent,
      region: body?.region,
      limit: body?.limit,
      savedProductIds,
      preferredMaterials: body?.preferredMaterials,
      personaMaterials: body?.personaMaterials,
      excludeProductId: body?.excludeProductId,
      composition: body?.composition,
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": user?.id ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=120",
        Vary: "Authorization",
      },
    });
  } catch (err) {
    console.error("[recommend/products] failed:", err);
    return NextResponse.json({ error: "Failed to build recommendations" }, { status: 500 });
  }
}
