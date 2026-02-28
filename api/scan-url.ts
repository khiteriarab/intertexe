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
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Product URL required" });
    try { new URL(url); } catch { return res.status(400).json({ error: "Invalid URL" }); }

    let pageContent = "";
    try {
      const pageRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "Accept": "text/html" },
        signal: AbortSignal.timeout(10000),
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        pageContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
      }
    } catch {}
    if (!pageContent) return res.status(400).json({ error: "Could not access this URL." });

    const openai = new OpenAI({ apiKey: openaiKey });
    const supabase = createClient(supabaseUrl, supabaseKey);

    const extractRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: 'Extract product info. Return JSON: {"brandName":"","productName":"","price":"","composition":"","category":"tops/bottoms/dresses/outerwear/other","retailer":""}. Nulls for missing. ONLY valid JSON.' },
        { role: "user", content: `URL: ${url}\n\nPage:\n${pageContent}` }
      ],
      max_tokens: 400,
    });
    let pageInfo;
    try {
      pageInfo = JSON.parse(extractRes.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}");
    } catch { return res.status(500).json({ error: "Could not parse product details." }); }

    const brandName = pageInfo.brandName || "Unknown";
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

    const detectedCategory = pageInfo.category || "";
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

    const webIntel = await webResearch(openai, brandName, pageInfo.productName || "", pageInfo.price || "", designerInfo?.website);
    if (webIntel && pageInfo.composition) {
      webIntel.composition = pageInfo.composition;
      const naturalFibers = ["cotton","silk","wool","linen","cashmere","hemp","flax","merino","alpaca","mohair"];
      let totalNatural = 0;
      for (const f of naturalFibers) { const m = pageInfo.composition.toLowerCase().match(new RegExp(`(\\d+)%\\s*${f}`)); if (m) totalNatural += parseInt(m[1]); }
      if (totalNatural > 0) webIntel.naturalFiberPercent = Math.min(totalNatural, 100);
    }

    return res.status(200).json({
      tagInfo: { brandName, productName: pageInfo.productName || "", price: pageInfo.price || "", confidence: "high", rawText: `From ${pageInfo.retailer || new URL(url).hostname}` },
      products: products.slice(0, 12),
      matched,
      brandStats: matched && avgFiber !== null ? { avgFiber, rating: brandRating, productCount: products.length } : null,
      designerInfo: designerInfo ? { name: designerInfo.name, slug: designerInfo.slug, logo_url: designerInfo.logo_url, website: designerInfo.website, description: designerInfo.description, rating: designerInfo.rating, hasProducts: products.length > 0 } : null,
      webIntel,
      betterAlternatives: (altData || []).slice(0, 6),
    });
  } catch (err: any) {
    console.error("Scan URL error:", err.message);
    return res.status(500).json({ error: "Failed to analyze this product" });
  }
}
