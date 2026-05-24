import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  return NextResponse.json({
    service: "Intertexe Fiber Intelligence API",
    version: "1.0",
    description: "Analyzes clothing composition and surfaces natural fiber alternatives",
    endpoints: {
      analyze: "POST /api/extension/analyze",
    },
    contact: "info@intertexe.com",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { composition, product_name, price, currency, color } = await req.json();

    if (!composition && !product_name) {
      return NextResponse.json(
        { error: "composition or product_name required" },
        { status: 400 }
      );
    }

    const fiberMatches = [
      ...(composition || "").matchAll(/(\d+(?:\.\d+)?)\s*%\s*([a-zA-Z\s]+?)(?=[,\n]|$)/gi),
    ];

    const naturalFibers = [
      "silk",
      "linen",
      "cashmere",
      "cotton",
      "wool",
      "merino",
      "alpaca",
      "leather",
      "mohair",
      "angora",
    ];

    let naturalPercent = 0;
    let primaryFiber: string | null = null;
    const fibers: { name: string; percentage: number; isNatural: boolean }[] = [];

    for (const match of fiberMatches) {
      const pct = parseFloat(match[1]);
      const name = match[2].trim().toLowerCase();
      const isNatural = naturalFibers.some((f) => name.includes(f));
      if (isNatural) {
        naturalPercent += pct;
        if (!primaryFiber) primaryFiber = name;
      }
      fibers.push({ name, percentage: pct, isNatural });
    }

    naturalPercent = Math.min(Math.round(naturalPercent), 100);

    const supabase = createClient();
    const fiberMap: Record<string, string> = {
      merino: "wool",
      lambswool: "wool",
      alpaca: "wool",
      mohair: "wool",
      suede: "leather",
      nubuck: "leather",
      denim: "cotton",
      chambray: "cotton",
    };

    const searchFiber = primaryFiber
      ? fiberMap[primaryFiber] || primaryFiber
      : "silk";

    const rpcParams: Record<string, unknown> = {
      p_fiber: searchFiber,
      p_limit: 6,
      p_offset: 0,
      p_preferred_region: "us",
      p_fallback_region: "us",
      p_min_nfp: 80,
    };
    if (price) rpcParams.p_max_price = price * 1.5;

    const { data: alternatives } = await supabase.rpc("catalog_list", rpcParams);

    const isNatural = naturalPercent >= 80;

    return NextResponse.json({
      verdict: isNatural ? "natural" : naturalPercent >= 50 ? "blend" : "synthetic",
      natural_fiber_percent: naturalPercent,
      is_natural: isNatural,
      primary_fiber: primaryFiber,
      fibers,
      message: isNatural
        ? `This item is ${naturalPercent}% natural fiber.`
        : `Only ${naturalPercent}% natural fiber. Here are better alternatives from Intertexe.`,
      alternatives: alternatives || [],
      intertexe_url: `https://www.intertexe.com/shop?fiber=${searchFiber}`,
      powered_by: "INTERTEXE · The Material Standard",
      currency: currency ?? null,
      color: color ?? null,
    });
  } catch (err) {
    console.error("Extension API error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
