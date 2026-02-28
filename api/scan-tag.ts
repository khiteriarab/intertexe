import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

async function webResearch(openai: OpenAI, brandName: string, productName: string, tagPrice: string, brandWebsite?: string | null): Promise<any> {
  try {
    let websiteContent = "";
    if (brandWebsite) {
      try {
        const url = brandWebsite.startsWith("http") ? brandWebsite : `https://${brandWebsite}`;
        const siteRes = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
          signal: AbortSignal.timeout(5000),
        });
        if (siteRes.ok) {
          const html = await siteRes.text();
          websiteContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000);
        }
      } catch {}
    }
    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `You are INTERTEXE's fashion intelligence analyst. Analyze: Brand: ${brandName}, Product: ${productName || "unknown"}, Price: ${tagPrice || "not visible"}. ${websiteContent ? "Brand website: " + websiteContent : ""} Return JSON: {"composition":"likely composition","naturalFiberPercent":number or null,"priceRange":"range","otherRetailers":["up to 4"],"qualityNotes":"2-3 sentences","sustainabilityNotes":"1-2 sentences or null","verdict":"honest 1-2 sentence verdict"}. Be direct. Return ONLY valid JSON.` }],
      max_tokens: 700,
    });
    const content = aiRes.choices[0]?.message?.content || "";
    return JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!openaiKey || !supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server not configured" });
  }

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "Image data required" });

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
    } catch { return res.status(500).json({ error: "Could not read this tag." }); }

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

    const detectedCategory = tagInfo.category || "";
    const categoryKeywords: Record<string, string[]> = {
      dresses: ["dress", "gown", "midi", "maxi", "mini dress"],
      tops: ["top", "blouse", "shirt", "tee", "camisole", "tank"],
      bottoms: ["pant", "trouser", "skirt", "jean", "short"],
      outerwear: ["jacket", "coat", "blazer", "cardigan", "sweater", "knit"],
      knitwear: ["sweater", "knit", "cardigan", "pullover"],
    };
    const searchTerms = categoryKeywords[detectedCategory] || [];
    let altQuery = supabase.from("products").select("*").eq("approved", "yes")
      .gte("natural_fiber_percent", 80).neq("brand_slug", brandSlug)
      .order("natural_fiber_percent", { ascending: false });
    if (searchTerms.length > 0) {
      altQuery = altQuery.or(searchTerms.map(t => `name.ilike.%${t}%`).join(","));
    }
    const { data: altData } = await altQuery.limit(6);

    const webIntel = await webResearch(openai, brandName, tagInfo.productName || "", tagInfo.price || "", designerInfo?.website);

    return res.status(200).json({
      tagInfo: { brandName, productName: tagInfo.productName || "", price: tagInfo.price || "", composition: tagInfo.composition || "", confidence: "high", rawText: "From tag scan" },
      products: products.slice(0, 12),
      matched,
      brandStats: matched && avgFiber !== null ? { avgFiber, rating: brandRating, productCount: products.length } : null,
      designerInfo: designerInfo ? { name: designerInfo.name, slug: designerInfo.slug, logo_url: designerInfo.logo_url, website: designerInfo.website, description: designerInfo.description, rating: designerInfo.rating, hasProducts: products.length > 0 } : null,
      webIntel,
      betterAlternatives: (altData || []).slice(0, 6),
    });
  } catch (err: any) {
    console.error("Scan tag error:", err.message);
    return res.status(500).json({ error: "Failed to analyze this tag" });
  }
}
