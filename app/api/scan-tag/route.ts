export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { scannerCatalogQuery } from "../../../lib/scanner-catalog";

const NATURAL_FIBERS = new Set([
  "cotton", "linen", "silk", "wool", "cashmere", "mohair", "alpaca", "hemp",
  "jute", "ramie", "bamboo", "merino", "angora", "camel", "vicuna", "yak",
  "flax", "kapok", "coir", "lyocell", "tencel", "modal", "cupro", "viscose",
]);

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

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
  if (productNameLower.match(/\b(jean|jeans|pant|pants|trouser|trousers|denim|flare|chino|cargo.pant|wide.?leg|palazzo|slim)\b/)) return "bottoms";
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

async function fetchAlternatives(supabase: any, category: string, brandSlug: string, priceNum: number | null) {
  const categoryKeywords: Record<string, string[]> = {
    dresses: ["dress", "gown"], tops: ["top", "blouse", "shirt", "tee", "camisole"],
    bottoms: ["pant", "trouser", "jean", "denim", "palazzo", "wide-leg", "slim"],
    outerwear: ["jacket", "coat", "blazer"], knitwear: ["sweater", "knit", "cardigan", "pullover"],
    skirts: ["skirt"], shorts: ["short", "shorts"],
  };
  const searchTerms = categoryKeywords[category] || [];

  let altQuery = scannerCatalogQuery(supabase)
    .order("natural_fiber_percent", { ascending: false });

  if (brandSlug && brandSlug !== "unknown-brand") {
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
    if (priceFiltered.length >= 4) alternatives = priceFiltered;
  }

  if (alternatives.length < 4 && searchTerms.length > 0) {
    let fallbackQuery = scannerCatalogQuery(supabase)
      .or(searchTerms.map(t => `name.ilike.%${t}%`).join(","))
      .order("natural_fiber_percent", { ascending: false })
      .limit(20);
    if (brandSlug && brandSlug !== "unknown-brand") {
      fallbackQuery = fallbackQuery.neq("brand_slug", brandSlug);
    }
    const { data: fallbackData } = await fallbackQuery;
    if (fallbackData && fallbackData.length > alternatives.length) alternatives = fallbackData;
  }

  if (alternatives.length < 4) {
    const { data: anyData } = await scannerCatalogQuery(supabase)
      .gte("natural_fiber_percent", 90)
      .not("image_url", "is", null)
      .order("natural_fiber_percent", { ascending: false })
      .limit(12);
    if (anyData && anyData.length > alternatives.length) alternatives = anyData;
  }

  return alternatives.slice(0, 8);
}

function buildVerdict(naturalPercent: number, compositionText: string): string {
  if (naturalPercent >= 90) return `Excellent choice — ${naturalPercent}% natural fibers. This is a high-quality material composition.`;
  if (naturalPercent >= 70) return `Good composition — ${naturalPercent}% natural fibers. A solid natural-fiber garment.`;
  if (naturalPercent >= 40) return `Mixed composition — only ${naturalPercent}% natural fibers. Consider alternatives with higher natural fiber content for better quality and sustainability.`;
  if (naturalPercent > 0) return `Low natural fiber content — only ${naturalPercent}%. This garment is primarily synthetic. We found natural-fiber alternatives below.`;
  if (compositionText) return "This garment appears to be primarily synthetic. See natural-fiber alternatives below.";
  return "We couldn't determine the exact composition. Browse our curated natural-fiber products below.";
}

function buildResponse(data: {
  brandName: string; productName: string; price: string; composition: string;
  garmentType: string; size: string; madeIn: string; careInstructions: string;
  fibers: any[]; naturalPercent: number; category: string;
  brandProducts: any[]; designerInfo: any; alternatives: any[];
  confidence: string;
}) {
  const avgFiber = data.brandProducts.length
    ? Math.round(data.brandProducts.reduce((s: number, p: any) => s + (p.natural_fiber_percent || 0), 0) / data.brandProducts.length)
    : null;
  const brandRating = avgFiber === null ? null : avgFiber >= 95 ? "Exceptional" : avgFiber >= 85 ? "Excellent" : avgFiber >= 70 ? "Good" : "Caution";

  return {
    tagInfo: {
      brandName: data.brandName, productName: data.productName, price: data.price,
      composition: data.composition, garmentType: data.garmentType, size: data.size,
      madeIn: data.madeIn, careInstructions: data.careInstructions,
      confidence: data.confidence, rawText: "From tag scan",
    },
    fiberBreakdown: data.fibers,
    naturalPercent: data.naturalPercent,
    isNatural: data.naturalPercent >= 70,
    verdict: buildVerdict(data.naturalPercent, data.composition),
    category: data.category,
    products: data.brandProducts.slice(0, 12),
    matched: !!(data.designerInfo || data.brandProducts.length),
    brandStats: data.brandProducts.length && avgFiber !== null ? { avgFiber, rating: brandRating, productCount: data.brandProducts.length } : null,
    designerInfo: data.designerInfo ? {
      name: data.designerInfo.name, slug: data.designerInfo.slug,
      logo_url: data.designerInfo.logo_url, website: data.designerInfo.website,
      description: data.designerInfo.description, rating: data.designerInfo.rating,
      hasProducts: data.brandProducts.length > 0,
    } : null,
    betterAlternatives: data.alternatives,
  };
}

export async function POST(request: NextRequest) {
  const openai = getOpenAIClient();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { image } = await request.json();
    if (!image) return NextResponse.json({ error: "Image data required" }, { status: 400 });

    let tagInfo: any = {};
    let aiFailed = false;

    if (openai) {
      try {
        const visionRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: [
              {
                type: "text",
                text: `You are analyzing a photo of a clothing tag or label. This could be:
- The sewn-in composition/care label (inside the garment)
- The hanging price/brand tag (attached when purchasing)
- Both tags together in one photo
- A photo showing the garment itself

Extract ALL information you can see. Use visual clues to determine the garment type — if you can see the garment in the photo, identify what it is (dress, skirt, pants, jacket, sweater, etc.). If you only see a tag, use any product name, description, or style number to infer the category.

Return JSON with these fields:
{
  "brandName": "exact brand name visible on any tag",
  "productName": "product name/style if visible, OR your best description of the garment type (e.g. 'Midi Dress', 'Knit Sweater', 'Tailored Trousers')",
  "price": "price if visible on hanging tag, include currency symbol",
  "composition": "FULL fiber composition exactly as written, e.g. '70% Cotton, 30% Polyester'",
  "fibers": [{"fiber": "cotton", "percent": 70}, {"fiber": "polyester", "percent": 30}],
  "category": "one of: tops, bottoms, dresses, outerwear, knitwear, skirts, shorts, accessories, other",
  "garmentType": "specific garment type if identifiable: dress, skirt, pants, jeans, blouse, t-shirt, sweater, cardigan, jacket, coat, blazer, shorts, jumpsuit, etc.",
  "madeIn": "country of manufacture if visible",
  "careInstructions": "brief care notes if visible",
  "size": "size if visible"
}

IMPORTANT:
- Extract the EXACT composition percentages from the tag
- If you see "100% Cotton" return fibers as [{"fiber":"cotton","percent":100}]
- Include ALL fibers listed, even at small percentages like 2% Elastane
- If composition is not visible, set composition to null and fibers to []
- For category: use the hanging tag product name, or garment shape if visible, to determine if it's a dress, skirt, top, etc.
- If you can see the actual garment (not just a tag), use its visual appearance to determine the garment type and category
- Only return valid JSON, no markdown.`
              },
              { type: "image_url", image_url: { url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}` } },
            ],
          }],
          max_tokens: 600,
        });
        const raw = visionRes.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}";
        tagInfo = JSON.parse(raw);
      } catch (aiErr: any) {
        console.error("AI vision failed:", aiErr.message);
        aiFailed = true;
      }
    } else {
      aiFailed = true;
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

    const garmentType = (tagInfo.garmentType || "").toLowerCase();
    const productNameLower = (tagInfo.productName || "").toLowerCase();
    const combinedName = `${productNameLower} ${garmentType}`.trim();
    const resolvedCategory = resolveCategory(tagInfo.category || "", combinedName);
    const priceNum = parsePriceNumber(tagInfo.price || "");

    let designerInfo = null;
    let brandProducts: any[] = [];
    try {
      const [designerResult, fuzzyDesignerResult] = await Promise.all([
        supabase.from("designers").select("*").eq("slug", brandSlug).limit(1),
        supabase.from("designers").select("*").ilike("name", `%${brandName}%`).limit(1),
      ]);
      designerInfo = designerResult.data?.[0] || fuzzyDesignerResult.data?.[0] || null;

      if (designerInfo || brandSlug !== "unknown-brand") {
        const { data } = await scannerCatalogQuery(supabase)
          .or(`brand_slug.eq.${brandSlug},brand_name.ilike.%${brandName}%`)
          .not("image_url", "is", null)
          .order("natural_fiber_percent", { ascending: false })
          .limit(12);
        brandProducts = data || [];
      }
    } catch (dbErr: any) {
      console.error("DB brand lookup failed:", dbErr.message);
    }

    let alternatives: any[] = [];
    try {
      alternatives = await fetchAlternatives(supabase, resolvedCategory, brandSlug, priceNum);
    } catch (altErr: any) {
      console.error("Alternatives fetch failed:", altErr.message);
    }

    return NextResponse.json(buildResponse({
      brandName, productName: tagInfo.productName || "", price: tagInfo.price || "",
      composition: compositionText, garmentType: tagInfo.garmentType || "",
      size: tagInfo.size || "", madeIn: tagInfo.madeIn || "",
      careInstructions: tagInfo.careInstructions || "",
      fibers, naturalPercent, category: resolvedCategory,
      brandProducts, designerInfo, alternatives,
      confidence: aiFailed ? "low" : fibers.length > 0 ? "high" : compositionText ? "medium" : "low",
    }));
  } catch (err: any) {
    console.error("Scan tag error:", err.message);
    try {
      const alternatives = await fetchAlternatives(supabase, "", "", null);
      return NextResponse.json(buildResponse({
        brandName: "Unknown Brand", productName: "", price: "", composition: "",
        garmentType: "", size: "", madeIn: "", careInstructions: "",
        fibers: [], naturalPercent: 0, category: "",
        brandProducts: [], designerInfo: null, alternatives,
        confidence: "low",
      }));
    } catch {
      return NextResponse.json({ error: "Something went wrong, but please try again." }, { status: 500 });
    }
  }
}
