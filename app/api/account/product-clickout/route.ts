export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromToken } from "../../../../lib/auth-helpers";
import { getSupabaseAuthUserId } from "../../../../lib/supabase-auth-server";
import { parsePriceNumber } from "../../../../lib/scanner-copy";

function getServiceSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  const supabaseUid = await getSupabaseAuthUserId(token);
  if (supabaseUid) return supabaseUid;
  const user = await getUserFromToken(authHeader);
  return user?.id ? String(user.id) : null;
}

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ message: "Server not configured" }, { status: 500 });
  }

  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const productId = body.productId ?? body.product_id;
  if (!productId) {
    return NextResponse.json({ message: "productId required" }, { status: 400 });
  }

  const price =
    parsePriceNumber(body.price) ??
    (typeof body.price === "number" ? body.price : null);

  const row = {
    user_id: userId,
    product_id: String(productId),
    brand_name: body.brandName ?? body.brand_name ?? null,
    product_name: body.productName ?? body.product_name ?? null,
    product_url: body.productUrl ?? body.product_url ?? null,
    image_url: body.imageUrl ?? body.image_url ?? null,
    price,
    currency: body.currency ?? null,
    natural_fiber_percent:
      body.naturalFiberPercent ?? body.natural_fiber_percent ?? null,
    clicked_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("user_product_clickouts").insert(row);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ message: "Server not configured" }, { status: 500 });
  }

  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_product_clickouts")
    .select("*")
    .eq("user_id", userId)
    .order("clicked_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ clickouts: data ?? [] });
}
