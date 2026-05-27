import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const barcode = req.nextUrl.searchParams.get("barcode");
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  if (!barcode?.trim()) {
    return NextResponse.json({ error: "barcode query param required" }, { status: 400 });
  }

  const { data: client } = await supabase
    .from("platform_clients")
    .select("id, name, plan")
    .eq("api_key", apiKey)
    .eq("is_active", true)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const upc = barcode.replace(/\D/g, "");

  const { data: composition } = await supabase
    .from("barcode_compositions")
    .select("*")
    .eq("upc_code", upc)
    .maybeSingle();

  await supabase
    .from("platform_clients")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", client.id);

  if (!composition) {
    return NextResponse.json({
      found: false,
      barcode: upc,
      message: "Barcode not yet in database. Submit for verification.",
    });
  }

  return NextResponse.json({
    found: true,
    barcode: upc,
    dppReady: composition.dpp_ready,
    composition: {
      text: composition.composition,
      fibers: composition.fiber_breakdown,
      naturalFiberPercent: composition.natural_fiber_percent,
      hasRecycledContent: composition.has_recycled_content,
      recycledContentPercent: composition.recycled_content_percent,
    },
    origin: {
      countryOfOrigin: composition.country_of_origin,
      manufacturerCountry: composition.manufacturer_country || null,
    },
    care: {
      instructions: composition.care_instructions,
    },
    verification: {
      verifiedBy: composition.verified_by,
      verificationDate: composition.verification_date,
      source: composition.source,
      confidenceScore: composition.confidence_score,
    },
    dppFields: {
      composition: !!composition.composition,
      countryOfOrigin: !!composition.country_of_origin,
      careInstructions: !!composition.care_instructions,
      recycledContent: composition.has_recycled_content !== null,
      allRequiredFieldsPresent: composition.dpp_ready,
    },
  });
}
