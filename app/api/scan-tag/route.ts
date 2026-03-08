import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

function resolveCategory(aiCategory: string, productNameLower: string): string {
  if (aiCategory && aiCategory !== "bottoms") return aiCategory;
  if (aiCategory === "bottoms") {
    if (productNameLower.match(/\b(short|shorts)\b/)) return "shorts";
    if (productNameLower.match(/\b(skirt|skirts)\b/)) return "skirts";
    return "bottoms";
  }
  if (productNameLower.match(/\b(jean|jeans|pant|pants|trouser|trousers|denim)\b/)) return "bottoms";
  if (productNameLower.match(/\b(dress|gown)\b/)) return "dresses";
  if (productNameLower.match(/\b(top|blouse|shirt|tee)\b/)) return "tops";
  if (productNameLower.match(/\b(jacket|coat|blazer)\b/)) return "outerwear";
  if (productNameLower.match(/\b(sweater|knit|cardigan)\b/)) return "knitwear";
  return "";
}

export async function POST(request: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

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
          { type: "text", text: 'Read this clothing tag/label photo. Extract brand name, product name, price, and any material composition visible. Return JSON: {"brandName":"","productName":"","price":"","composition":"","category":"tops/bottoms/dresses/outerwear/other"}. Nulls for missing. ONLY valid JSON.' },
          { type: "image_url", image_url: { url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}` } },
        ],
      }],
      max_tokens: 400,
    });

    let tagInfo;
    try {
      tagInfo = JSON.parse(visionRes.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}");
    } catch { return NextResponse.json({ error: "Could not read this tag." }, { status: 500 }); }

    const brandName = tagInfo.brandName || "Unknown";
    const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const [productResult, designerResult, fuzzyDesignerResult] = await Promise.all([
      supabase.from("products").select("*").eq("approved", "yes").eq("brand_slug", brandSlug).limit(12),
      supabase.from("designers").select("*").eq("slug", brandSlug).limit(1),
      supabase.from("designers").select("*").ilike("name", `%${brandName}%`).limit(1),
    ]);

    let designerInfo = designerResult.data?.[0] || fuzzyDesignerResult.data?.[0] || null;
    let products = productResult.data || [];
    let matched = !!(designerInfo || products.length);

    if (!products.length) {
      const { data } = await supabase.from("products").select("*").eq("approved", "yes")
        .or(`brand_name.ilike.%${brandName}%,brand_slug.ilike.%${brandSlug}%`).limit(12);
      if (data?.length) { products = data; matched = true; }
    }

    const totalFiber = products.reduce((s: number, p: any) => s + (p.natural_fiber_percent || 0), 0);
    const avgFiber = products.length ? Math.round(totalFiber / products.length) : null;
    const brandRating = avgFiber === null ? null : avgFiber >= 95 ? "Exceptional" : avgFiber >= 85 ? "Excellent" : avgFiber >= 70 ? "Good" : "Caution";

    const productNameLower = (tagInfo.productName || "").toLowerCase();
    const resolvedCategory = resolveCategory(tagInfo.category || "", productNameLower);
    const categoryKeywords: Record<string, string[]> = {
      dresses: ["dress", "gown"], tops: ["top", "blouse", "shirt", "tee"],
      bottoms: ["pant", "trouser", "jean"], outerwear: ["jacket", "coat", "blazer"],
      knitwear: ["sweater", "knit", "cardigan"],
    };
    const searchTerms = categoryKeywords[resolvedCategory] || [];
    let altQuery = supabase.from("products").select("*").eq("approved", "yes")
      .gte("natural_fiber_percent", 80).neq("brand_slug", brandSlug)
      .order("natural_fiber_percent", { ascending: false });
    if (searchTerms.length > 0) {
      altQuery = altQuery.or(searchTerms.map(t => `name.ilike.%${t}%`).join(","));
    }
    const { data: altData } = await altQuery.limit(6);

    return NextResponse.json({
      tagInfo: { brandName, productName: tagInfo.productName || "", price: tagInfo.price || "", composition: tagInfo.composition || "", confidence: "high", rawText: "From tag scan" },
      products: products.slice(0, 12),
      matched,
      brandStats: matched && avgFiber !== null ? { avgFiber, rating: brandRating, productCount: products.length } : null,
      designerInfo: designerInfo ? { name: designerInfo.name, slug: designerInfo.slug, logo_url: designerInfo.logo_url, website: designerInfo.website, description: designerInfo.description, rating: designerInfo.rating, hasProducts: products.length > 0 } : null,
      betterAlternatives: (altData || []).slice(0, 6),
    });
  } catch (err: any) {
    console.error("Scan tag error:", err.message);
    return NextResponse.json({ error: "Failed to analyze this tag" }, { status: 500 });
  }
}
