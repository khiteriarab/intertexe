import { NextRequest, NextResponse } from "next/server";
import { liveProductsApparelFrom } from "@/lib/global-catalog-scope";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { brand_name, product_url } = await req.json();
    const supabase = createClient();

    let query = liveProductsApparelFrom(supabase)
      
      .select(
        "id, name, brand_name, price, currency, url, image_url, natural_fiber_percent, composition"
      )
      .limit(6);

    if (brand_name) query = query.ilike("brand_name", `%${brand_name}%`);
    if (product_url) query = query.ilike("url", `%${product_url}%`);

    const { data } = await query;

    return NextResponse.json({
      found: (data?.length || 0) > 0,
      products: (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        brand: row.brand_name,
        price: row.price,
        currency: row.currency,
        url: row.url,
        image_url: row.image_url,
        natural_fiber_percent: row.natural_fiber_percent,
        composition: row.composition,
      })),
      intertexe_url: brand_name
        ? `https://www.intertexe.com/designers?q=${encodeURIComponent(brand_name)}`
        : "https://www.intertexe.com",
    });
  } catch (err) {
    console.error("Extension product lookup error:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
