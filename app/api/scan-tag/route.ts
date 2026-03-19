import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const NATURAL_FIBERS = new Set([
  "cotton", "linen", "silk", "wool", "cashmere", "mohair", "alpaca", "hemp",
  "jute", "ramie", "bamboo", "merino", "angora", "camel", "vicuna", "yak",
  "flax", "kapok", "coir", "lyocell", "tencel", "modal", "cupro", "viscose",
]);

function parseComposition(raw: string): { fiber: string; percent: number; isNatural: boolean }[] {
  if (!raw) return [];
  const parts = raw.split(/[,;·•]+/).map(s => s.trim()).filter(Boolean);
  const fibers: { fiber: string; percent: number; isNatural: boolean }[] = [];
  for (const part of parts) {
    const match = part.match(/(\d+(?:\.\d+)?)\s*%?\s*(.+)|(.+?)\s*(\d+(?:\.\d+)?)\s*%/);
    if (match) {
      const pct = parseFloat(match[1] || match[4]);
      const name = (match[2] || match[3]).trim().toLowerCase();
      fibers.push({ fiber: name, percent: pct, isNatural: NATURAL_FIBERS.has(name) });
    }
  }
  return fibers;
}

function computeNaturalPercent(fibers: { fiber: string; percent: number; isNatural: boolean }[]): number {
  if (!fibers.length) return 0;
  return Math.round(fibers.filter(f => f.isNatural).reduce((s, f) => s + f.percent, 0));
}

function resolveCategory(aiCategory: string, productNameLower: string): string {
  const cat = (aiCategory || "").toLowerCase().trim();
  if (cat && cat !== "bottoms" && cat !== "other") return cat;
  if (cat === "bottoms") {
    if (productNameLower.match(/\b(short|shorts)\b/)) return "shorts";
    if (productNameLower.match(/\b(skirt|skirts)\b/)) return "skirts";
    return "bottoms";
  }
  if (productNameLower.match(/\b(jean|jeans|pant|pants|trouser|trousers|denim)\b/)) return "bottoms";
  if (productNameLower.match(/\b(dress|gown|midi|maxi)\b/)) return "dresses";
  if (productNameLower.match(/\b(top|blouse|shirt|tee|t-shirt|camisole|tank)\b/)) return "tops";
  if (productNameLower.match(/\b(jacket|coat|blazer|parka|puffer)\b/)) return "outerwear";
  if (productNameLower.match(/\b(sweater|knit|cardigan|pullover|jumper)\b/)) return "knitwear";
  if (productNameLower.match(/\b(skirt)\b/)) return "skirts";
  return "";
}

function parsePriceNumber(priceStr: string): number | null {
  if (!priceStr) return null;
  const match = priceStr.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const num = parseFloat(match);
  return isNaN(num) ? null : num;
}

export async function POST(request: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!openaiKey || !supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const { image } = await request.json();
    if (!image) return NextResponse.json({ error: "Image data required" }, { status: 400 });

    const openai = new OpenAI({ apiKey: openaiKey });
    const supabase = createClient(supabaseUrl, supabaseKey);

    const visionRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Read this clothing tag/label photo carefully. Extract ALL information visible on the tag.

Return JSON with these fields:
{
  "brandName": "exact brand name from tag",
  "productName": "product name if visible, or describe the garment type (e.g. 'Knit Sweater', 'Silk Blouse')",
  "price": "price if visible, include currency symbol",
  "composition": "FULL fiber composition exactly as written, e.g. '70% Cotton, 30% Polyester'",
  "fibers": [{"fiber": "cotton", "percent": 70}, {"fiber": "polyester", "percent": 30}],
  "category": "one of: tops, bottoms, dresses, outerwear, knitwear, skirts, shorts, accessories, other",
  "madeIn": "country of manufacture if visible",
  "careInstructions": "brief care notes if visible"
}

IMPORTANT:
- Extract the EXACT composition percentages from the tag
- If you see "100% Cotton" return fibers as [{"fiber":"cotton","percent":100}]
- Include ALL fibers listed, even at small percentages like 2% Elastane
- If composition is not visible, set composition to null and fibers to []
- Only return valid JSON, no markdown.`
          },
          { type: "image_url", image_url: { url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}` } },
        ],
      }],
      max_tokens: 600,
    });

    let tagInfo;
    try {
      const raw = visionRes.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}";
      tagInfo = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Could not read this tag. Try a clearer photo." }, { status: 500 });
    }

    const brandName = tagInfo.brandName || "Unknown Brand";
    const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const compositionText = tagInfo.composition || "";
    let fibers = (tagInfo.fibers || []).map((f: any) => {
      const pctRaw = String(f.percent || "0").replace(/%/g, "").trim();
      return {
        fiber: (f.fiber || "").toLowerCase().trim(),
        percent: parseFloat(pctRaw) || 0,
        isNatural: NATURAL_FIBERS.has((f.fiber || "").toLowerCase().trim()),
      };
    }).filter((f: any) => f.fiber && f.percent > 0);
    const fiberSum = fibers.reduce((s: number, f: any) => s + f.percent, 0);
    if ((!fibers.length || fiberSum < 10) && compositionText) {
      fibers = parseComposition(compositionText);
    }
    const naturalPercent = Math.min(100, computeNaturalPercent(fibers));
    const isNatural = naturalPercent >= 70;

    const productNameLower = (tagInfo.productName || "").toLowerCase();
    const resolvedCategory = resolveCategory(tagInfo.category || "", productNameLower);
    const priceNum = parsePriceNumber(tagInfo.price || "");

    const [designerResult, fuzzyDesignerResult] = await Promise.all([
      supabase.from("designers").select("*").eq("slug", brandSlug).limit(1),
      supabase.from("designers").select("*").ilike("name", `%${brandName}%`).limit(1),
    ]);
    const designerInfo = designerResult.data?.[0] || fuzzyDesignerResult.data?.[0] || null;

    let brandProducts: any[] = [];
    if (designerInfo || brandSlug !== "unknown-brand") {
      const { data } = await supabase.from("products").select("*")
        .or(`brand_slug.eq.${brandSlug},brand_name.ilike.%${brandName}%`)
        .not("image_url", "is", null)
        .order("natural_fiber_percent", { ascending: false })
        .limit(12);
      brandProducts = data || [];
    }

    const totalFiber = brandProducts.reduce((s: number, p: any) => s + (p.natural_fiber_percent || 0), 0);
    const avgFiber = brandProducts.length ? Math.round(totalFiber / brandProducts.length) : null;
    const brandRating = avgFiber === null ? null : avgFiber >= 95 ? "Exceptional" : avgFiber >= 85 ? "Excellent" : avgFiber >= 70 ? "Good" : "Caution";

    const categoryKeywords: Record<string, string[]> = {
      dresses: ["dress", "gown"], tops: ["top", "blouse", "shirt", "tee", "camisole"],
      bottoms: ["pant", "trouser", "jean", "denim"], outerwear: ["jacket", "coat", "blazer"],
      knitwear: ["sweater", "knit", "cardigan", "pullover"], skirts: ["skirt"],
      shorts: ["short", "shorts"],
    };
    const searchTerms = categoryKeywords[resolvedCategory] || [];

    let altQuery = supabase.from("products").select("*")
      .gte("natural_fiber_percent", 80)
      .not("image_url", "is", null)
      .order("natural_fiber_percent", { ascending: false });

    if (brandSlug !== "unknown-brand") {
      altQuery = altQuery.neq("brand_slug", brandSlug);
    }

    if (searchTerms.length > 0) {
      altQuery = altQuery.or(searchTerms.map(t => `name.ilike.%${t}%`).join(","));
    }

    const { data: altData } = await altQuery.limit(40);

    let alternatives = altData || [];
    if (priceNum && alternatives.length > 4) {
      const priceLow = priceNum * 0.4;
      const priceHigh = priceNum * 2.5;
      const priceFiltered = alternatives.filter((p: any) => {
        const pn = parsePriceNumber(p.price || "");
        return pn !== null && pn >= priceLow && pn <= priceHigh;
      });
      if (priceFiltered.length >= 4) {
        alternatives = priceFiltered;
      }
    }
    if (alternatives.length < 4 && searchTerms.length > 0) {
      let fallbackQuery = supabase.from("products").select("*")
        .gte("natural_fiber_percent", 80)
        .not("image_url", "is", null)
        .or(searchTerms.map(t => `name.ilike.%${t}%`).join(","))
        .order("natural_fiber_percent", { ascending: false })
        .limit(20);
      if (brandSlug !== "unknown-brand") {
        fallbackQuery = fallbackQuery.neq("brand_slug", brandSlug);
      }
      const { data: fallbackData } = await fallbackQuery;
      if (fallbackData && fallbackData.length > alternatives.length) {
        alternatives = fallbackData;
      }
    }

    let verdict = "";
    if (naturalPercent >= 90) {
      verdict = `Excellent choice — ${naturalPercent}% natural fibers. This is a high-quality material composition.`;
    } else if (naturalPercent >= 70) {
      verdict = `Good composition — ${naturalPercent}% natural fibers. A solid natural-fiber garment.`;
    } else if (naturalPercent >= 40) {
      verdict = `Mixed composition — only ${naturalPercent}% natural fibers. Consider alternatives with higher natural fiber content for better quality and sustainability.`;
    } else if (naturalPercent > 0) {
      verdict = `Low natural fiber content — only ${naturalPercent}%. This garment is primarily synthetic. We found natural-fiber alternatives below.`;
    } else if (compositionText) {
      verdict = "This garment appears to be primarily synthetic. See natural-fiber alternatives below.";
    }

    return NextResponse.json({
      tagInfo: {
        brandName,
        productName: tagInfo.productName || "",
        price: tagInfo.price || "",
        composition: compositionText,
        madeIn: tagInfo.madeIn || "",
        careInstructions: tagInfo.careInstructions || "",
        confidence: fibers.length > 0 ? "high" : compositionText ? "medium" : "low",
        rawText: "From tag scan",
      },
      fiberBreakdown: fibers,
      naturalPercent,
      isNatural,
      verdict,
      category: resolvedCategory,
      products: brandProducts.slice(0, 12),
      matched: !!(designerInfo || brandProducts.length),
      brandStats: brandProducts.length && avgFiber !== null ? { avgFiber, rating: brandRating, productCount: brandProducts.length } : null,
      designerInfo: designerInfo ? {
        name: designerInfo.name, slug: designerInfo.slug,
        logo_url: designerInfo.logo_url, website: designerInfo.website,
        description: designerInfo.description, rating: designerInfo.rating,
        hasProducts: brandProducts.length > 0,
      } : null,
      betterAlternatives: alternatives.slice(0, 8),
    });
  } catch (err: any) {
    console.error("Scan tag error:", err.message);
    return NextResponse.json({ error: "Failed to analyze this tag. Try a clearer photo." }, { status: 500 });
  }
}
