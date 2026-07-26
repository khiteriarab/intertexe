export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { appendU1 } from "../../../../lib/affiliate-url";
import { getSupabaseAuthUserId } from "../../../../lib/supabase-auth-server";

export async function POST(req: NextRequest) {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ message: "Server not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const body = await req.json();
  const {
    editSlug,
    editMonth,
    productSlot,
    productName,
    brandName,
    affiliateUrl,
    clickTarget,
    sessionId,
  } = body;

  const authHeader = req.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const userId = accessToken ? await getSupabaseAuthUserId(accessToken) : null;
  const u1 = userId || (typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : null);
  const taggedUrl =
    typeof affiliateUrl === "string" ? appendU1(affiliateUrl, u1) : affiliateUrl || null;

  try {
    await supabase.from("editorial_clickouts").insert({
      edit_slug: editSlug || "khiteri",
      edit_month: editMonth || null,
      product_slot: productSlot ? String(productSlot) : null,
      product_name: productName || null,
      brand_name: brandName || null,
      click_target: clickTarget === "image" || clickTarget === "title" ? clickTarget : null,
      affiliate_url: taggedUrl,
      session_id: sessionId || null,
      user_id: userId,
      clicked_at: new Date().toISOString(),
    });
  } catch {
    /* table may not exist yet */
  }

  return NextResponse.json({ tracked: true, affiliateUrl: taggedUrl, u1Attached: Boolean(u1) });
}
