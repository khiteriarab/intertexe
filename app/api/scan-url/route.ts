import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

function resolveCategory(aiCategory: string, productNameLower: string): string {
  if (aiCategory && aiCategory !== "bottoms") return aiCategory;
  if (aiCategory === "bottoms") {
    if (productNameLower.match(/\b(short|shorts)\b/) && !productNameLower.match(/\b(pant|trouser|jean|jeans|denim|flare|wide.?leg|straight.?leg|slim|skinny|cargo)\b/)) return "shorts";
    if (productNameLower.match(/\b(skirt|skirts)\b/)) return "skirts";
    return "bottoms";
  }
  if (productNameLower.match(/\b(jean|jeans|pant|pants|trouser|trousers|denim|flare|chino|cargo.pant|wide.?leg)\b/)) return "bottoms";
  if (productNameLower.match(/\b(dress|gown)\b/)) return "dresses";
  if (productNameLower.match(/\b(top|blouse|shirt|tee|camisole|tank)\b/)) return "tops";
  if (productNameLower.match(/\b(skirt|skirts)\b/)) return "skirts";
  if (productNameLower.match(/\b(short|shorts)\b/)) return "shorts";
  if (productNameLower.match(/\b(jacket|coat|blazer)\b/)) return "outerwear";
  if (productNameLower.match(/\b(sweater|knit|cardigan|pullover)\b/)) return "knitwear";
  return "";
}

function extractInfoFromUrl(url: string): { brand: string; product: string; retailer: string } {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace("www.", "");
    const brandMap: Record<string, string> = {
      "nordstrom.com": "Nordstrom", "net-a-porter.com": "Net-a-Porter", "ssense.com": "SSENSE",
      "farfetch.com": "Farfetch", "mytheresa.com": "Mytheresa", "shopbop.com": "Shopbop",
      "saksfifthavenue.com": "Saks Fifth Avenue", "bergdorfgoodman.com": "Bergdorf Goodman",
      "revolve.com": "Revolve", "asos.com": "ASOS", "zara.com": "Zara",
      "everlane.com": "Everlane", "thereformation.com": "Reformation", "cos.com": "COS",
      "arket.com": "Arket", "stories.com": "& Other Stories", "hm.com": "H&M",
      "khaite.com": "Khaite", "aninebing.com": "Anine Bing", "toteme.com": "Totême",
      "frame-store.com": "Frame", "vince.com": "Vince",
      "sandro-paris.com": "Sandro", "maje.com": "Maje", "ba-sh.com": "ba&sh",
      "sezane.com": "Sézane", "reiss.com": "Reiss", "clubmonaco.com": "Club Monaco",
      "theory.com": "Theory", "eileenfisher.com": "Eileen Fisher", "filippa-k.com": "Filippa K",
      "nanushka.com": "Nanushka", "acnestudios.com": "Acne Studios", "therow.com": "The Row",
      "alcltd.com": "A.L.C.", "agolde.com": "AGOLDE", "rag-bone.com": "Rag & Bone",
      "ganni.com": "Ganni", "isabelmarant.com": "Isabel Marant", "allsaints.com": "AllSaints",
      "diesel.com": "Diesel", "onequince.com": "Quince", "massimodutti.com": "Massimo Dutti",
      "proenzaschouler.com": "Proenza Schouler", "stellamccartney.com": "Stella McCartney",
      "loewe.com": "Loewe", "chloe.com": "Chloé", "maxmara.com": "Max Mara",
    };
    const retailer = brandMap[hostname] || hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const productSlug = pathParts.filter(p => !["products", "s", "p", "shop", "collections", "en", "us", "en-us", "womens", "women", "clothing"].includes(p.toLowerCase())).pop() || "";
    const product = productSlug.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).trim();
    const isMultiBrand = ["nordstrom.com", "net-a-porter.com", "ssense.com", "farfetch.com", "mytheresa.com", "shopbop.com", "saksfifthavenue.com", "revolve.com", "asos.com"].includes(hostname);
    return { brand: isMultiBrand ? "" : retailer, product, retailer };
  } catch {
    return { brand: "", product: "", retailer: "" };
  }
}

async function webResearch(openai: OpenAI, brandName: string, productName: string, tagPrice: string, brandWebsite?: string | null): Promise<any> {
  try {
    let websiteContent = "";
    if (brandWebsite) {
      try {
        const siteUrl = brandWebsite.startsWith("http") ? brandWebsite : `https://${brandWebsite}`;
        const siteRes = await fetch(siteUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
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
      messages: [{ role: "user", content: `You are INTERTEXE's fashion intelligence analyst. Analyze: Brand: ${brandName}, Product: ${productName || "unknown"}, Price: ${tagPrice || "not visible"}. ${websiteContent ? "Brand website: " + websiteContent : ""} Return JSON: {"composition":"likely composition","naturalFiberPercent":number or null,"priceRange":"range","otherRetailers":["up to 4"],"qualityNotes":"2-3 sentences","sustainabilityNotes":"1-2 sentences or null","verdict":"honest 1-2 sentence verdict"}. Be direct and specific. IMPORTANT: Do NOT fabricate exact percentages for composition — say "likely" or "typically" if you're estimating. Return ONLY valid JSON.` }],
      max_tokens: 700,
    });
    const content = aiRes.choices[0]?.message?.content || "";
    return JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!openaiKey || !supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "Product URL required" }, { status: 400 });
    let parsedUrl: URL;
    try { parsedUrl = new URL(url); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) return NextResponse.json({ error: "Only HTTP/HTTPS URLs allowed" }, { status: 400 });
    const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "169.254.169.254", "metadata.google.internal"];
    if (blockedHosts.some(h => parsedUrl.hostname === h) || parsedUrl.hostname.endsWith(".internal") || parsedUrl.hostname.startsWith("10.") || parsedUrl.hostname.startsWith("172.") || parsedUrl.hostname.startsWith("192.168.")) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }

    const urlInfo = extractInfoFromUrl(url);
    let pageContent = "";
    try {
      const pageRes = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
        let structuredData = "";
        if (jsonLdMatch) {
          structuredData = jsonLdMatch.map(m => m.replace(/<\/?script[^>]*>/gi, "").trim()).join("\n").slice(0, 3000);
        }
        const ogTags: string[] = [];
        const metaMatches = html.matchAll(/<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi);
        for (const m of metaMatches) ogTags.push(`og:${m[1]}=${m[2]}`);
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const titleText = titleMatch ? titleMatch[1].trim() : "";
        const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
        pageContent = [titleText ? `Title: ${titleText}` : "", ogTags.length ? `Meta: ${ogTags.join(", ")}` : "", structuredData ? `Structured data: ${structuredData}` : "", bodyText ? `Page text: ${bodyText}` : ""].filter(Boolean).join("\n\n");
      }
    } catch {}

    const openai = new OpenAI({ apiKey: openaiKey });
    const supabase = createClient(supabaseUrl, supabaseKey);

    const promptContent = pageContent
      ? `URL: ${url}\n\n${pageContent}`
      : `URL: ${url}\nRetailer: ${urlInfo.retailer}\nBrand (from URL): ${urlInfo.brand || "unknown"}\nProduct (from URL path): ${urlInfo.product || "unknown"}\n\nThe page could not be scraped. Use your knowledge.`;

    const extractRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: 'Extract product info from the URL and any available page content. Return JSON: {"brandName":"","productName":"","price":"","composition":"","category":"tops/bottoms/dresses/outerwear/knitwear/other","retailer":""}. Use null for genuinely unknown fields. ONLY valid JSON.' },
        { role: "user", content: promptContent }
      ],
      max_tokens: 400,
    });
    let pageInfo;
    try {
      pageInfo = JSON.parse(extractRes.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}");
    } catch { return NextResponse.json({ error: "Could not parse product details." }, { status: 500 }); }

    const brandName = pageInfo.brandName || urlInfo.brand || "Unknown";
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

    const productNameLower = (pageInfo.productName || "").toLowerCase();
    const resolvedCategory = resolveCategory(pageInfo.category || "", productNameLower);
    const categoryKeywords: Record<string, string[]> = {
      dresses: ["dress", "gown"], tops: ["top", "blouse", "shirt", "tee"],
      bottoms: ["pant", "trouser", "jean"], skirts: ["skirt"], shorts: ["short"],
      outerwear: ["jacket", "coat", "blazer"], knitwear: ["sweater", "knit", "cardigan"],
    };
    const searchTerms = categoryKeywords[resolvedCategory] || [];
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

    return NextResponse.json({
      tagInfo: { brandName, productName: pageInfo.productName || urlInfo.product || "", price: pageInfo.price || "", composition: pageInfo.composition || "", confidence: pageContent ? "high" : "medium", rawText: `From ${pageInfo.retailer || urlInfo.retailer || new URL(url).hostname}` },
      products: products.slice(0, 12),
      matched,
      brandStats: matched && avgFiber !== null ? { avgFiber, rating: brandRating, productCount: products.length } : null,
      designerInfo: designerInfo ? { name: designerInfo.name, slug: designerInfo.slug, logo_url: designerInfo.logo_url, website: designerInfo.website, description: designerInfo.description, rating: designerInfo.rating, hasProducts: products.length > 0 } : null,
      webIntel,
      betterAlternatives: (altData || []).slice(0, 6),
    });
  } catch (err: any) {
    console.error("Scan URL error:", err.message);
    return NextResponse.json({ error: "Failed to analyze this product", detail: err.message }, { status: 500 });
  }
}
