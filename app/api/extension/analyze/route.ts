import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getSmartAlternatives } from "@/lib/scanner/get-smart-alternatives";

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

    const mappedPrimary = primaryFiber
      ? fiberMap[primaryFiber] || primaryFiber.split(/\s+/)[0]
      : null;

    const supabase = createServiceClient();
    const alternatives = await getSmartAlternatives(supabase, {
      detectedPrice: typeof price === "number" ? price : null,
      primaryFiber: mappedPrimary,
      naturalFiberPercent: naturalPercent,
    });

    const searchFiber = mappedPrimary || "silk";
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
      alternatives,
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
