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
  const fibers: { fiber: string; percent: number; isNatural: boolean }[] = [];
  const regex = /(\d+(?:\.\d+)?)\s*%\s*([a-zA-Z\s/]+)|([a-zA-Z\s/]+?)\s*(\d+(?:\.\d+)?)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    const pct = parseFloat(m[1] || m[4]);
    const name = (m[2] || m[3]).trim().toLowerCase();
    if (pct > 0 && name) {
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
    if (productNameLower.match(/\b(short|shorts)\b/) && !productNameLower.match(/\b(pant|trouser|jean|jeans|denim|flare|wide.?leg|straight.?leg|slim|skinny|cargo)\b/)) return "shorts";
    if (productNameLower.match(/\b(skirt|skirts)\b/)) return "skirts";
    return "bottoms";
  }
  if (productNameLower.match(/\b(jean|jeans|pant|pants|trouser|trousers|denim|flare|chino|cargo.pant|wide.?leg|palazzo|slim)\b/)) return "bottoms";
  if (productNameLower.match(/\b(dress|gown|midi|maxi)\b/)) return "dresses";
  if (productNameLower.match(/\b(top|blouse|shirt|tee|camisole|tank)\b/)) return "tops";
  if (productNameLower.match(/\b(skirt|skirts)\b/)) return "skirts";
  if (productNameLower.match(/\b(short|shorts)\b/)) return "shorts";
  if (productNameLower.match(/\b(jacket|coat|blazer|parka|puffer)\b/)) return "outerwear";
  if (productNameLower.match(/\b(sweater|knit|cardigan|pullover|jumper)\b/)) return "knitwear";
  return "";
}

function parsePriceNumber(priceStr: string): number | null {
  if (!priceStr) return null;
  const match = priceStr.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const num = parseFloat(match);
  return isNaN(num) ? null : num;
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
      "tibi.com": "Tibi", "lagence.com": "L'Agence", "rixo.co.uk": "RIXO",
      "redone.com": "Re/Done", "seanewyork.com": "Sea New York",
    };
    const retailer = brandMap[hostname] || hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const productSlug = pathParts.filter(p => !["products", "s", "p", "shop", "collections", "en", "us", "en-us", "en-es", "en-gb", "womens", "women", "clothing", "new-arrivals"].includes(p.toLowerCase())).pop() || "";
    const product = productSlug.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).trim();
    const isMultiBrand = ["nordstrom.com", "net-a-porter.com", "ssense.com", "farfetch.com", "mytheresa.com", "shopbop.com", "saksfifthavenue.com", "revolve.com", "asos.com"].includes(hostname);
    return { brand: isMultiBrand ? "" : retailer, product, retailer };
  } catch {
    return { brand: "", product: "", retailer: "" };
  }
}

async function fetchAlternatives(supabase: any, category: string, brandSlug: string, priceNum: number | null) {
  const categoryKeywords: Record<string, string[]> = {
    dresses: ["dress", "gown"], tops: ["top", "blouse", "shirt", "tee", "camisole"],
    bottoms: ["pant", "trouser", "jean", "denim", "palazzo", "wide-leg", "slim"],
    outerwear: ["jacket", "coat", "blazer"], knitwear: ["sweater", "knit", "cardigan", "pullover"],
    skirts: ["skirt"], shorts: ["short", "shorts"],
  };
  const searchTerms = categoryKeywords[category] || [];

  let altQuery = supabase.from("products").select("*")
    .gte("natural_fiber_percent", 80)
    .not("image_url", "is", null)
    .order("natural_fiber_percent", { ascending: false });

  if (brandSlug && brandSlug !== "unknown") {
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
    let fallbackQuery = supabase.from("products").select("*")
      .gte("natural_fiber_percent", 80)
      .not("image_url", "is", null)
      .or(searchTerms.map(t => `name.ilike.%${t}%`).join(","))
      .order("natural_fiber_percent", { ascending: false })
      .limit(20);
    if (brandSlug && brandSlug !== "unknown") {
      fallbackQuery = fallbackQuery.neq("brand_slug", brandSlug);
    }
    const { data: fallbackData } = await fallbackQuery;
    if (fallbackData && fallbackData.length > alternatives.length) alternatives = fallbackData;
  }

  if (alternatives.length < 4) {
    const { data: anyData } = await supabase.from("products").select("*")
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
  if (naturalPercent >= 40) return `Mixed composition — only ${naturalPercent}% natural fibers. Consider alternatives with higher natural fiber content.`;
  if (naturalPercent > 0) return `Low natural fiber content — only ${naturalPercent}%. This garment is primarily synthetic. We found natural-fiber alternatives below.`;
  if (compositionText) return "This garment appears to be primarily synthetic. See natural-fiber alternatives below.";
  return "We couldn't determine the exact composition. Browse our curated natural-fiber products below.";
}

function buildResponse(data: {
  brandName: string; productName: string; price: string; composition: string;
  fibers: any[]; naturalPercent: number; category: string;
  brandProducts: any[]; designerInfo: any; alternatives: any[];
  confidence: string; source: string;
}) {
  const avgFiber = data.brandProducts.length
    ? Math.round(data.brandProducts.reduce((s: number, p: any) => s + (p.natural_fiber_percent || 0), 0) / data.brandProducts.length)
    : null;
  const brandRating = avgFiber === null ? null : avgFiber >= 95 ? "Exceptional" : avgFiber >= 85 ? "Excellent" : avgFiber >= 70 ? "Good" : "Caution";

  let effectivePercent = data.naturalPercent;
  let effectiveVerdict = "";
  let usedBrandAvg = false;
  if (effectivePercent === 0 && !data.composition && avgFiber !== null && avgFiber > 0) {
    effectivePercent = avgFiber;
    usedBrandAvg = true;
    if (avgFiber >= 90) effectiveVerdict = `Based on ${data.brandName}'s catalog, their pieces average ${avgFiber}% natural fibers — an excellent brand for natural fabrics.`;
    else if (avgFiber >= 70) effectiveVerdict = `Based on ${data.brandName}'s catalog, their pieces average ${avgFiber}% natural fibers — a solid choice for natural materials.`;
    else effectiveVerdict = `Based on ${data.brandName}'s catalog, their pieces average ${avgFiber}% natural fibers. Check the product label to confirm this item's exact composition.`;
  }
  if (!effectiveVerdict) effectiveVerdict = buildVerdict(data.naturalPercent, data.composition);

  return {
    tagInfo: {
      brandName: data.brandName, productName: data.productName, price: data.price,
      composition: data.composition, garmentType: "", size: "",
      madeIn: "", careInstructions: "",
      confidence: usedBrandAvg ? "brand-average" : data.confidence, rawText: data.source,
    },
    fiberBreakdown: data.fibers,
    naturalPercent: effectivePercent,
    isNatural: effectivePercent >= 70,
    verdict: effectiveVerdict,
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
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let requestUrl = "";
  try {
    const body = await request.json();
    requestUrl = body.url || "";
    const url = requestUrl;
    if (!url) return NextResponse.json({ error: "Product URL required" }, { status: 400 });
    let parsedUrl: URL;
    try { parsedUrl = new URL(url); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) return NextResponse.json({ error: "Only HTTP/HTTPS URLs allowed" }, { status: 400 });
    const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "169.254.169.254", "metadata.google.internal"];
    if (blockedHosts.some(h => parsedUrl.hostname === h) || parsedUrl.hostname.endsWith(".internal") || parsedUrl.hostname.startsWith("10.") || parsedUrl.hostname.startsWith("172.") || parsedUrl.hostname.startsWith("192.168.")) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }

    const urlInfo = extractInfoFromUrl(url);
    let brandName = urlInfo.brand || "";
    let productName = urlInfo.product || "";
    let price = "";
    let compositionText = "";
    let category = "";
    let fibers: { fiber: string; percent: number; isNatural: boolean }[] = [];
    let pageContent = "";

    const shopifyJsonUrl = url.replace(/\?.*$/, "").replace(/\/$/, "") + ".json";
    try {
      const jsonRes = await fetch(shopifyJsonUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (jsonRes.ok) {
        const jsonData = await jsonRes.json();
        const sp = jsonData.product;
        if (sp) {
          brandName = urlInfo.brand || sp.vendor || brandName;
          productName = sp.title || productName;
          const variant = sp.variants?.[0];
          price = variant?.price ? `$${variant.price}` : "";

          const bodyText = (sp.body_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
          const compMatch = bodyText.match(/(\d+%\s*[a-zA-Z]+(?:\s*[,\/;]\s*\d+%\s*[a-zA-Z]+)*)/);
          if (compMatch) compositionText = compMatch[0].trim();

          const titleLower = productName.toLowerCase();
          const tags = (sp.tags || []).map((t: string) => t.toLowerCase()).join(" ");
          const productType = (sp.product_type || "").toLowerCase();
          category = resolveCategory("", `${titleLower} ${tags} ${productType}`);
        }
      }
    } catch {}

    if (!compositionText || !productName) {
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
          const metaRegex = /<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
          let metaMatch: RegExpExecArray | null;
          while ((metaMatch = metaRegex.exec(html)) !== null) ogTags.push(`og:${metaMatch[1]}=${metaMatch[2]}`);
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
          const titleText = titleMatch ? titleMatch[1].trim() : "";
          const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
          pageContent = [titleText ? `Title: ${titleText}` : "", ogTags.length ? `Meta: ${ogTags.join(", ")}` : "", structuredData ? `Structured data: ${structuredData}` : "", bodyText ? `Page text: ${bodyText}` : ""].filter(Boolean).join("\n\n");
        }
      } catch {}
    }

    if (openaiKey && (!compositionText || !productName || !brandName)) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey });
        const promptContent = pageContent
          ? `URL: ${url}\n\n${pageContent}`
          : `URL: ${url}\nRetailer: ${urlInfo.retailer}\nBrand (from URL): ${urlInfo.brand || "unknown"}\nProduct (from URL path): ${urlInfo.product || "unknown"}\n\nThe page could not be scraped. Use your knowledge of this brand and product.`;

        const extractRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `Extract product info. Return JSON:
{
  "brandName": "brand",
  "productName": "product name",
  "price": "price with currency",
  "composition": "full fiber composition e.g. '98% Cotton, 2% Elastane'",
  "fibers": [{"fiber":"cotton","percent":98},{"fiber":"elastane","percent":2}],
  "category": "tops/bottoms/dresses/outerwear/knitwear/skirts/shorts/other",
  "garmentType": "specific type: dress, pants, jeans, sweater, etc."
}
Use null for genuinely unknown. For composition, extract from product description if available. ONLY valid JSON.` },
            { role: "user", content: promptContent }
          ],
          max_tokens: 500,
        });

        const pageInfo = JSON.parse(extractRes.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}");

        brandName = brandName || pageInfo.brandName || "Unknown";
        productName = productName || pageInfo.productName || "";
        price = price || pageInfo.price || "";
        compositionText = compositionText || pageInfo.composition || "";
        category = category || resolveCategory(pageInfo.category || "", `${(pageInfo.productName || "").toLowerCase()} ${(pageInfo.garmentType || "").toLowerCase()}`);

        if (!fibers.length && pageInfo.fibers?.length) {
          fibers = pageInfo.fibers.map((f: any) => {
            const pctRaw = String(f.percent || "0").replace(/%/g, "").trim();
            return {
              fiber: (f.fiber || "").toLowerCase().trim(),
              percent: parseFloat(pctRaw) || 0,
              isNatural: NATURAL_FIBERS.has((f.fiber || "").toLowerCase().trim()),
            };
          }).filter((f: any) => f.fiber && f.percent > 0);
        }
      } catch (aiErr: any) {
        console.error("AI extraction failed:", aiErr.message);
      }
    }

    brandName = brandName || urlInfo.brand || "Unknown";
    productName = productName || urlInfo.product || "Product";
    if (!category) category = resolveCategory("", productName.toLowerCase());

    if (!fibers.length && compositionText) {
      fibers = parseComposition(compositionText);
    }
    const naturalPercent = Math.min(100, computeNaturalPercent(fibers));

    const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const priceNum = parsePriceNumber(price);

    let designerInfo = null;
    let brandProducts: any[] = [];
    try {
      const [designerResult, fuzzyDesignerResult] = await Promise.all([
        supabase.from("designers").select("*").eq("slug", brandSlug).limit(1),
        supabase.from("designers").select("*").ilike("name", `%${brandName}%`).limit(1),
      ]);
      designerInfo = designerResult.data?.[0] || fuzzyDesignerResult.data?.[0] || null;

      if (brandSlug !== "unknown") {
        const { data } = await supabase.from("products").select("*")
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
      alternatives = await fetchAlternatives(supabase, category, brandSlug, priceNum);
    } catch (altErr: any) {
      console.error("Alternatives fetch failed:", altErr.message);
    }

    return NextResponse.json(buildResponse({
      brandName, productName, price, composition: compositionText,
      fibers, naturalPercent, category,
      brandProducts, designerInfo, alternatives,
      confidence: compositionText ? "high" : pageContent ? "medium" : "low",
      source: `From ${urlInfo.retailer || parsedUrl.hostname}`,
    }));
  } catch (err: any) {
    console.error("Scan URL error:", err.message);
    try {
      const urlInfo = extractInfoFromUrl(requestUrl || "");
      const brandName = urlInfo.brand || "Unknown";
      const alternatives = await fetchAlternatives(supabase, "", "", null);
      return NextResponse.json(buildResponse({
        brandName, productName: urlInfo.product || "", price: "", composition: "",
        fibers: [], naturalPercent: 0, category: "",
        brandProducts: [], designerInfo: null, alternatives,
        confidence: "low", source: "URL scan",
      }));
    } catch {
      return NextResponse.json({
        tagInfo: { brandName: "Unknown", productName: "", price: "", composition: "", garmentType: "", size: "", madeIn: "", careInstructions: "", confidence: "low", rawText: "" },
        fiberBreakdown: [], naturalPercent: 0, isNatural: false,
        verdict: "We couldn't analyze this product right now. Browse our curated natural-fiber products below.",
        category: "", products: [], matched: false, brandStats: null, designerInfo: null, betterAlternatives: [],
      });
    }
  }
}
