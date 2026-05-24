export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { scannerCatalogQuery } from "../../../lib/scanner-catalog";
import { fetchTastePreferences, upsertTastePreferences } from "../../../lib/taste-preferences";
import { getSupabaseAuthUserId } from "../../../lib/supabase-auth-server";

const NATURAL_FIBERS = new Set([
  "cotton", "linen", "silk", "wool", "cashmere", "mohair", "alpaca", "hemp",
  "jute", "ramie", "bamboo", "merino", "angora", "camel", "vicuna", "yak",
  "flax", "kapok", "coir",
]);

const SEMI_SYNTHETIC_FIBERS = new Set([
  "viscose", "rayon", "modal", "lyocell", "tencel", "cupro", "acetate",
]);

const SYNTHETIC_FIBERS = new Set([
  "polyester", "nylon", "acrylic", "spandex", "elastane", "lycra", "polyamide",
  "polypropylene", "polyurethane", "pvc", "vinyl", "modacrylic", "olefin",
]);

const FIBER_TRANSLATIONS: Record<string, string> = {
  algodon: "cotton", algodón: "cotton", coton: "cotton", cotone: "cotton", baumwolle: "cotton",
  seda: "silk", soie: "silk", seta: "silk", seide: "silk",
  lana: "wool", laine: "wool", wolle: "wool",
  lino: "linen", lin: "linen", leinen: "linen",
  cachemir: "cashmere", cachemire: "cashmere", cachemira: "cashmere", kaschmir: "cashmere",
  ramio: "ramie",
  cáñamo: "hemp", chanvre: "hemp", canapa: "hemp",
  poliéster: "polyester", poliestere: "polyester",
  elastano: "elastane", élasthanne: "elastane",
  poliamida: "polyamide",
};

function normalizeFiber(raw: string): string {
  const lower = raw.trim().toLowerCase()
    .replace(/\b(organic|european|egyptian|pima|supima|mongolian|scottish|virgin|baby|suri|mulberry|recycled|certified|bci|gots)\s+/gi, "")
    .replace(/[®™©]/g, "").trim();
  if (FIBER_TRANSLATIONS[lower]) return FIBER_TRANSLATIONS[lower];
  if (/flax/.test(lower)) return "linen";
  if (/merino/.test(lower)) return "merino";
  if (/lambswool|shetland/.test(lower)) return "wool";
  if (/denim/.test(lower)) return "cotton";
  if (/econyl/.test(lower)) return "nylon";
  if (/spandex/.test(lower)) return "elastane";
  if (/rayon/.test(lower)) return "viscose";
  return lower.split(/\s+/).pop() || lower;
}

function classifyFiber(name: string): "natural" | "semi-synthetic" | "synthetic" {
  if (NATURAL_FIBERS.has(name)) return "natural";
  if (SEMI_SYNTHETIC_FIBERS.has(name)) return "semi-synthetic";
  return "synthetic";
}

type FiberEntry = { fiber: string; percent: number; isNatural: boolean; classification: string };

function parseComposition(raw: string): FiberEntry[] {
  if (!raw) return [];
  const fibers: FiberEntry[] = [];
  const regex = /(\d+(?:\.\d+)?)\s*%\s*([a-zA-ZÀ-ÿ\s/]+?)(?=[,;/&]|\d+\s*%|$)/g;
  let m: RegExpExecArray | null;
  let total = 0;
  while ((m = regex.exec(raw)) !== null) {
    if (total >= 100) break;
    const pct = parseFloat(m[1]);
    const rawName = m[2].trim();
    if (pct <= 0 || !rawName) continue;
    const name = normalizeFiber(rawName);
    const cls = classifyFiber(name);
    fibers.push({
      fiber: name.charAt(0).toUpperCase() + name.slice(1),
      percent: pct,
      isNatural: cls === "natural",
      classification: cls,
    });
    total += pct;
  }
  return fibers;
}

function computeNaturalPercent(fibers: FiberEntry[]): number {
  return Math.min(100, Math.round(fibers.filter(f => f.isNatural).reduce((s, f) => s + f.percent, 0)));
}

function computeFiberQualityScore(fibers: FiberEntry[], naturalPercent: number): number {
  if (!fibers.length) return 0;
  let score = naturalPercent;
  const premiumFibers = ["silk", "cashmere", "merino", "alpaca", "linen"];
  const hasPremium = fibers.some(f => premiumFibers.includes(f.fiber.toLowerCase()) && f.percent >= 30);
  if (hasPremium) score = Math.min(100, score + 5);
  const semiSynPct = fibers.filter(f => f.classification === "semi-synthetic").reduce((s, f) => s + f.percent, 0);
  if (semiSynPct > 0) score = Math.max(0, score - Math.round(semiSynPct * 0.3));
  return Math.max(0, Math.min(100, score));
}

function slugifyBrand(value: string): string {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeProductUrl(raw: string): string {
  let cleaned = String(raw || "")
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "");
  if (cleaned && !/^https?:\/\//i.test(cleaned)) cleaned = "https://" + cleaned;
  return cleaned;
}

function humanizeProductSlug(slug: string): string {
  return slug
    .replace(/\.\w+$/, "")
    .replace(/^productpage[.\s-]*\d*/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\bp\d{5,}\b/gi, "")
    .replace(/\bv\d+\b/gi, "")
    .replace(/\d{6,}/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

const CATEGORY_TERMS: Record<string, string[]> = {
  dresses: ["dress", "gown", "vestido", "robe", "kleid", "abito", "jumpsuit", "romper"],
  tops: ["top", "blouse", "shirt", "tee", "t-shirt", "camisole", "tank", "polo", "henley", "bodysuit", "camisa", "blusa", "camiseta"],
  bottoms: ["pant", "pants", "trouser", "jean", "jeans", "chino", "legging", "pantalon", "hose"],
  skirts: ["skirt", "falda", "gonna", "jupe"],
  shorts: ["short", "shorts", "bermuda"],
  outerwear: ["jacket", "coat", "blazer", "parka", "puffer", "bomber", "chaqueta", "abrigo", "manteau", "veste"],
  knitwear: ["sweater", "knit", "cardigan", "pullover", "jumper", "jersey", "punto", "maglia"],
  swimwear: ["swim", "bikini", "bañador", "maillot"],
  loungewear: ["pajama", "robe", "lounge", "pijama", "sleepwear"],
};

function resolveCategory(hints: string): string {
  const lower = hints.toLowerCase();
  for (const [cat, terms] of Object.entries(CATEGORY_TERMS)) {
    if (terms.some(t => lower.includes(t))) return cat;
  }
  return "";
}

function parsePriceNumber(priceStr: string): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

async function extractFromImage(openai: OpenAI, image: string): Promise<any> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `You are an expert fashion analyst for INTERTEXE, a luxury natural-fiber fashion platform. Analyze this photo which could be:
- A clothing COMPOSITION TAG (sewn-in label showing fiber content)
- A PRICE TAG (hanging tag with brand, price, product name)
- A BARCODE label
- A photo of the GARMENT ITSELF (the actual clothing item)
- Any combination of the above

Extract ALL information you can see or infer. Return ONLY valid JSON:
{
  "inputType": "tag|price_tag|barcode|garment|mixed",
  "brandName": "exact brand name if visible",
  "productName": "product name or your best description e.g. 'Black Midi Dress', 'Navy Wool Blazer'",
  "price": "price with currency if visible",
  "composition": "EXACT fiber composition as written e.g. '70% Cotton, 30% Polyester'",
  "fibers": [{"fiber":"cotton","percent":70},{"fiber":"polyester","percent":30}],
  "category": "tops/bottoms/dresses/outerwear/knitwear/skirts/shorts/swimwear/loungewear/other",
  "garmentType": "specific type: midi dress, blazer, slim jeans, knit sweater, etc.",
  "color": "primary color(s) of the garment e.g. 'black', 'navy blue', 'cream', 'red floral'",
  "silhouette": "fit description: slim, oversized, relaxed, fitted, a-line, straight, wide-leg, etc.",
  "size": "size if visible",
  "madeIn": "country if visible",
  "careInstructions": "brief care notes if visible",
  "barcode": "barcode/GTIN number if visible",
  "confidence": "high/medium/low - how confident are you in the extracted data"
}

CRITICAL RULES:
- Extract EXACT composition percentages from tags. If you see "100% Lana" return fibers as [{"fiber":"wool","percent":100}]
- Translate foreign fiber names to English: ramio=ramie, algodón=cotton, seda=silk, lana=wool, lino=linen, cachemir=cashmere, soie=silk, coton=cotton, baumwolle=cotton, seide=silk, poliéster=polyester
- If you can see the garment, describe its color and silhouette even if you can't read a tag
- If you can see a barcode, extract the number
- Semi-synthetics: viscose, modal, lyocell, tencel, cupro are NOT natural fibers
- If composition isn't visible, set composition to null and fibers to []
- Set confidence to "low" if you're guessing, "medium" if partially visible, "high" if clearly readable`
        },
        { type: "image_url", image_url: { url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}` } },
      ],
    }],
    max_tokens: 700,
  });
  const raw = res.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}";
  return JSON.parse(raw);
}

async function extractFromUrl(openai: OpenAI | null, url: string): Promise<any> {
  let pageContent = "";
  let imageUrl = "";

  const shopifyJsonUrl = url.replace(/\?.*$/, "").replace(/\/$/, "") + ".json";
  try {
    const jsonRes = await fetch(shopifyJsonUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (jsonRes.ok) {
      const sp = (await jsonRes.json()).product;
      if (sp) {
        const bodyText = (sp.body_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        const compMatch = bodyText.match(/(\d+(?:\.\d+)?%\s*[a-zA-Z][a-zA-Z\s]*?(?:,\s*\d+(?:\.\d+)?%\s*[a-zA-Z][a-zA-Z\s]*?)*?)(?=\s*[.&]|\s*OEKO|\s*BCI|\s*GOTS|$)/i);
        imageUrl = sp.image?.src || sp.images?.[0]?.src || "";
        return {
          brandName: sp.vendor || "",
          productName: sp.title || "",
          price: sp.variants?.[0]?.price ? `$${sp.variants[0].price}` : "",
          composition: compMatch?.[0]?.trim() || "",
          category: resolveCategory(`${sp.title} ${sp.product_type} ${(sp.tags || []).join(" ")}`),
          garmentType: sp.product_type || "",
          imageUrl,
          confidence: compMatch ? "high" : "medium",
          inputType: "url",
        };
      }
    }
  } catch {}

  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8,fr;q=0.7",
      },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      if (!imageUrl) {
        const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
        if (ogImg) imageUrl = ogImg[1];
      }
      const jsonLd = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      const structuredData = jsonLd ? jsonLd.map(m => m.replace(/<\/?script[^>]*>/gi, "").trim()).join("\n").slice(0, 3000) : "";
      const ogTags: string[] = [];
      const metaRegex = /<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
      let mm: RegExpExecArray | null;
      while ((mm = metaRegex.exec(html)) !== null) ogTags.push(`og:${mm[1]}=${mm[2]}`);
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
      pageContent = [
        titleMatch ? `Title: ${titleMatch[1].trim()}` : "",
        ogTags.length ? `Meta: ${ogTags.join(", ")}` : "",
        structuredData ? `Structured data: ${structuredData}` : "",
        bodyText ? `Page text: ${bodyText}` : "",
      ].filter(Boolean).join("\n\n");
    }
  } catch {}

  const parsed = new URL(url);
  const hostname = parsed.hostname.replace("www.", "");
  const brandMap: Record<string, string> = {
    "nordstrom.com": "Nordstrom", "net-a-porter.com": "Net-a-Porter", "ssense.com": "SSENSE",
    "farfetch.com": "Farfetch", "mytheresa.com": "Mytheresa", "shopbop.com": "Shopbop",
    "saksfifthavenue.com": "Saks Fifth Avenue", "revolve.com": "Revolve", "asos.com": "ASOS",
    "zara.com": "Zara", "hm.com": "H&M", "everlane.com": "Everlane", "thereformation.com": "Reformation",
    "cos.com": "COS", "arket.com": "Arket", "khaite.com": "Khaite",
    "aninebing.com": "Anine Bing", "toteme.com": "Totême", "vince.com": "Vince",
    "sandro-paris.com": "Sandro", "maje.com": "Maje", "ba-sh.com": "ba&sh",
    "sezane.com": "Sézane", "reiss.com": "Reiss", "theory.com": "Theory",
    "eileenfisher.com": "Eileen Fisher", "nanushka.com": "Nanushka",
    "acnestudios.com": "Acne Studios", "therow.com": "The Row",
    "agolde.com": "AGOLDE", "ganni.com": "Ganni", "isabelmarant.com": "Isabel Marant",
    "allsaints.com": "AllSaints", "diesel.com": "Diesel",
    "massimodutti.com": "Massimo Dutti", "maxmara.com": "Max Mara",
    "adolfodominguez.com": "Adolfo Dominguez", "mango.com": "Mango",
    "brunellocucinelli.com": "Brunello Cucinelli", "loropiana.com": "Loro Piana",
  };
  const hostParts = hostname.split(".");
  const baseDomain = hostParts.length > 2 ? hostParts.slice(-2).join(".") : hostname;
  const brandFromUrl = brandMap[hostname] || brandMap[baseDomain] || hostname.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const skipSlugs = new Set(["products", "s", "p", "shop", "collections", "en", "us", "en-us", "es-es", "fr-fr", "de-de", "it-it", "womens", "women", "clothing", "mujer", "femme", "donna", "ropa"]);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const productSlug = pathParts.filter(p => !skipSlugs.has(p.toLowerCase())).pop() || "";
  const productFromUrl = humanizeProductSlug(productSlug);

  const pathLower = parsed.pathname.toLowerCase();
  const fiberHints: string[] = [];
  for (const [foreign, english] of Object.entries(FIBER_TRANSLATIONS)) {
    if (pathLower.includes(foreign)) fiberHints.push(english);
  }
  for (const f of ["cotton", "silk", "wool", "linen", "cashmere", "ramie", "hemp"]) {
    if (pathLower.includes(f)) fiberHints.push(f);
  }
  const uniqueFiberHints = [...new Set(fiberHints)];

  if (openai && pageContent) {
    try {
      const aiHints = uniqueFiberHints.length ? `\nFibers detected in URL: ${uniqueFiberHints.join(", ")}` : "";
      const extractRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Extract product info from a fashion product page. The page may be in ANY language — translate to English. Return ONLY valid JSON:
{"brandName":"","productName":"product name in English","price":"","composition":"e.g. 100% Ramie","fibers":[{"fiber":"ramie","percent":100}],"category":"tops/bottoms/dresses/outerwear/knitwear/skirts/shorts/other","garmentType":"","color":"primary color","imageUrl":"full URL"}
Translate fibers: ramio=ramie, algodón=cotton, seda=silk, lana=wool, lino=linen. Use null for unknown.` },
          { role: "user", content: `URL: ${url}${aiHints}\n\n${pageContent}` }
        ],
        max_tokens: 500,
      });
      const aiInfo = JSON.parse(extractRes.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}");
      return {
        ...aiInfo,
        brandName: aiInfo.brandName || brandFromUrl,
        productName: aiInfo.productName || productFromUrl,
        imageUrl: imageUrl || aiInfo.imageUrl || "",
        inputType: "url",
        confidence: aiInfo.composition ? "high" : "medium",
        fiberHints: uniqueFiberHints,
      };
    } catch (e: any) {
      console.error("AI URL extraction failed:", e.message);
    }
  }

  return {
    brandName: brandFromUrl,
    productName: productFromUrl,
    composition: uniqueFiberHints.length ? uniqueFiberHints.map(f => `100% ${f.charAt(0).toUpperCase() + f.slice(1)}`).join(", ") + " (from URL)" : "",
    fibers: uniqueFiberHints.map(f => ({ fiber: f, percent: 100 })),
    category: resolveCategory(productFromUrl + " " + pathLower),
    imageUrl,
    inputType: "url",
    confidence: uniqueFiberHints.length ? "inferred" : "low",
    fiberHints: uniqueFiberHints,
  };
}

function identifyProduct(extracted: any): {
  fibers: FiberEntry[];
  naturalPercent: number;
  qualityScore: number;
  compositionText: string;
} {
  let fibers: FiberEntry[] = [];
  let compositionText = extracted.composition || "";

  if (extracted.fibers?.length) {
    fibers = extracted.fibers.map((f: any) => {
      const name = normalizeFiber(f.fiber || "");
      const cls = classifyFiber(name);
      return {
        fiber: name.charAt(0).toUpperCase() + name.slice(1),
        percent: parseFloat(String(f.percent || 0).replace(/%/g, "")) || 0,
        isNatural: cls === "natural",
        classification: cls,
      };
    }).filter((f: FiberEntry) => f.fiber && f.percent > 0);
  }

  if (!fibers.length && compositionText) {
    fibers = parseComposition(compositionText);
  }

  if (!fibers.length && extracted.fiberHints?.length) {
    fibers = extracted.fiberHints.map((f: string) => ({
      fiber: f.charAt(0).toUpperCase() + f.slice(1),
      percent: 100,
      isNatural: classifyFiber(f) === "natural",
      classification: classifyFiber(f),
    }));
    if (!compositionText) {
      compositionText = fibers.map(f => `100% ${f.fiber}`).join(", ") + " (inferred)";
    }
  }

  const naturalPercent = computeNaturalPercent(fibers);
  const qualityScore = computeFiberQualityScore(fibers, naturalPercent);

  return { fibers, naturalPercent, qualityScore, compositionText };
}

function sortAlternativeRows(rows: any[], priceNum: number | null, fiberFilter: string): any[] {
  return [...rows].sort((a: any, b: any) => {
    const aFiber = fiberFilter && (a.composition || "").toLowerCase().includes(fiberFilter) ? 1 : 0;
    const bFiber = fiberFilter && (b.composition || "").toLowerCase().includes(fiberFilter) ? 1 : 0;
    if (bFiber !== aFiber) return bFiber - aFiber;
    if (priceNum) {
      const ap = parsePriceNumber(a.price || "");
      const bp = parsePriceNumber(b.price || "");
      const aBetter = ap !== null && ap <= priceNum ? 1 : 0;
      const bBetter = bp !== null && bp <= priceNum ? 1 : 0;
      if (bBetter !== aBetter) return bBetter - aBetter;
    }
    return (b.natural_fiber_percent || 0) - (a.natural_fiber_percent || 0);
  });
}

async function searchAlternatives(
  supabase: any,
  category: string,
  brandSlug: string,
  priceNum: number | null,
  color: string,
  fiberFilter = "",
  preferredFiber?: string,
): Promise<any[]> {
  const effectiveFiber =
    preferredFiber?.toLowerCase().split(/\s+/)[0] ||
    fiberFilter?.toLowerCase().split(/\s+/)[0] ||
    "";
  const categoryKeywords: Record<string, string[]> = {
    dresses: ["dress", "gown"], tops: ["top", "blouse", "shirt", "tee", "camisole", "tank"],
    bottoms: ["pant", "trouser", "jean", "denim", "palazzo", "wide-leg"],
    outerwear: ["jacket", "coat", "blazer"], knitwear: ["sweater", "knit", "cardigan", "pullover"],
    skirts: ["skirt"], shorts: ["short", "shorts"],
    swimwear: ["swim", "bikini"], loungewear: ["pajama", "robe", "lounge"],
  };
  const searchTerms = categoryKeywords[category] || [];

  let altQuery = scannerCatalogQuery(supabase)
    .order("natural_fiber_percent", { ascending: false });

  if (brandSlug && brandSlug !== "unknown") {
    altQuery = altQuery.neq("brand_slug", brandSlug);
  }
  if (category) {
    altQuery = altQuery.eq("category", category);
  }
  if (fiberFilter) {
    altQuery = altQuery.ilike("composition", `%${fiberFilter}%`);
  } else if (searchTerms.length > 0) {
    altQuery = altQuery.or(searchTerms.map(t => `name.ilike.%${t}%`).join(","));
  }

  const { data: altData } = await altQuery.limit(60);
  let alternatives = sortAlternativeRows(altData || [], priceNum, effectiveFiber);

  if (alternatives.length < 6 && effectiveFiber && category) {
    let categoryQuery = scannerCatalogQuery(supabase)
      .eq("category", category)
      .order("natural_fiber_percent", { ascending: false })
      .limit(60);
    if (brandSlug && brandSlug !== "unknown") {
      categoryQuery = categoryQuery.neq("brand_slug", brandSlug);
    }
    const { data: categoryData } = await categoryQuery;
    if (categoryData?.length) alternatives = sortAlternativeRows([...alternatives, ...categoryData], priceNum, effectiveFiber);
  }

  if (alternatives.length < 6) {
    const { data: fallback } = await supabase.from("products").select("*")
      .gte("natural_fiber_percent", 80)
      .not("image_url", "is", null).neq("image_url", "")
      .not("price", "is", null).neq("price", "")
      .order("natural_fiber_percent", { ascending: false })
      .limit(30);
    if (fallback && fallback.length > alternatives.length) alternatives = sortAlternativeRows(fallback, priceNum, effectiveFiber);
  }

  const brandBuckets: Record<string, any[]> = {};
  for (const p of alternatives) {
    const bs = p.brand_slug || "unknown";
    if (!brandBuckets[bs]) brandBuckets[bs] = [];
    brandBuckets[bs].push(p);
  }
  const diversified: any[] = [];
  const slugs = Object.keys(brandBuckets);
  let idx = 0;
  while (diversified.length < 12 && idx < 200) {
    const bs = slugs[idx % slugs.length];
    if (brandBuckets[bs]?.length > 0) diversified.push(brandBuckets[bs].shift()!);
    idx++;
    if (slugs.every(b => !brandBuckets[b]?.length)) break;
  }

  return diversified.slice(0, 12);
}

function buildVerdict(
  naturalPercent: number,
  qualityScore: number,
  fibers: FiberEntry[],
  compositionText: string,
  brandName: string,
  garmentType: string,
): string {
  const semis = fibers.filter(f => f.classification === "semi-synthetic");
  const synthetics = fibers.filter(f => f.classification === "synthetic");
  const naturals = fibers.filter(f => f.isNatural);
  const item = garmentType || "item";

  if (naturalPercent >= 95) {
    const topFiber = naturals[0]?.fiber || "natural fibers";
    return `Excellent — this ${item} is ${naturalPercent}% natural fiber. ${topFiber} is breathable, durable, and ages beautifully. A quality choice.`;
  }
  if (naturalPercent >= 80) {
    return `Good composition — ${naturalPercent}% natural fiber. This ${item} meets our quality threshold, though it contains some ${synthetics[0]?.fiber || semis[0]?.fiber || "synthetic"} blend.`;
  }
  if (naturalPercent >= 50) {
    return `Mixed composition — only ${naturalPercent}% natural fiber. The ${synthetics.map(f => f.fiber).join(", ") || "synthetic content"} reduces breathability. We found better natural-fiber alternatives below.`;
  }
  if (naturalPercent > 0) {
    const semiNote = semis.length ? ` ${semis.map(s => s.fiber).join(", ")} ${semis.length === 1 ? "is" : "are"} semi-synthetic — derived from plants but heavily processed.` : "";
    return `Low natural fiber — only ${naturalPercent}%.${semiNote} This ${item} is primarily synthetic. See natural-fiber alternatives below.`;
  }
  if (compositionText) {
    return `This ${item} appears to be synthetic. Natural fiber alternatives below offer better breathability, durability, and comfort.`;
  }
  return `We couldn't determine the exact fiber content of this ${item} from ${brandName}. Browse verified natural-fiber alternatives below.`;
}

function buildConfirmationPrompt(extracted: any): string | null {
  if (extracted.confidence === "high") return null;
  const parts: string[] = [];
  if (extracted.color) parts.push(extracted.color);
  if (extracted.garmentType) parts.push(extracted.garmentType);
  else if (extracted.category && extracted.category !== "other") parts.push(extracted.category.replace(/s$/, ""));
  if (parts.length === 0) return null;
  return `Is this a ${parts.join(" ")}?`;
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const supabase = createClient(supabaseUrl, supabaseKey);
  const openai = getOpenAIClient();

  try {
    const body = await request.json();
    const { image, url, barcode, confirmation } = body;
    let sourceHost = "";

    let extracted: any = {};

    if (image) {
      if (!openai) return NextResponse.json({ error: "AI service not available" }, { status: 500 });
      extracted = await extractFromImage(openai, image);
    } else if (url) {
      const cleanedUrl = normalizeProductUrl(url);
      let parsedUrl: URL;
      try { parsedUrl = new URL(cleanedUrl); } catch { return NextResponse.json({ error: "Please paste a full product URL." }, { status: 400 }); }
      for (const p of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gad_source", "gad_campaignid", "gbraid", "gclid", "fbclid", "mc_cid", "mc_eid"]) {
        parsedUrl.searchParams.delete(p);
      }
      const cleanUrl = parsedUrl.toString();
      sourceHost = parsedUrl.hostname;
      try {
        extracted = await extractFromUrl(openai, cleanUrl);
      } catch (e: any) {
        console.error("URL extraction failed:", e.message);
        extracted = {
          brandName: parsedUrl.hostname.replace(/^www\./, "").split(".")[0].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          productName: parsedUrl.pathname.split("/").filter(Boolean).pop()?.replace(/\.\w+$/, "").replace(/[-_]/g, " ") || "",
          inputType: "url",
          confidence: "low",
          fibers: [],
        };
      }
    } else if (barcode) {
      extracted = {
        barcode,
        inputType: "barcode",
        confidence: "low",
        productName: "",
        brandName: "",
      };
    } else {
      return NextResponse.json({ error: "Provide an image, URL, or barcode" }, { status: 400 });
    }

    if (confirmation) {
      if (confirmation.category) extracted.category = confirmation.category;
      if (confirmation.color) extracted.color = confirmation.color;
      if (confirmation.garmentType) extracted.garmentType = confirmation.garmentType;
      extracted.confidence = "confirmed";
    }

    const brandName = extracted.brandName || "Unknown";
    const brandSlug = slugifyBrand(brandName);
    const productName = extracted.productName || "";
    const price = extracted.price || "";
    const imageUrl = extracted.imageUrl || "";
    let category = extracted.category || resolveCategory(`${productName} ${extracted.garmentType || ""}`);
    const color = extracted.color || "";
    const garmentType = extracted.garmentType || "";

    const analysis = identifyProduct(extracted);

    let designerInfo = null;
    let brandProducts: any[] = [];
    try {
      const [dr, fdr] = await Promise.all([
        supabase.from("designers").select("*").eq("slug", brandSlug).limit(1),
        supabase.from("designers").select("*").ilike("name", `%${brandName}%`).limit(1),
      ]);
      designerInfo = dr.data?.[0] || fdr.data?.[0] || null;
      if (brandSlug !== "unknown") {
        const normalizedBrandName = brandName.replace(/'/g, "''");
        const { data } = await scannerCatalogQuery(supabase)
          .or(`brand_slug.eq.${brandSlug},brand_name.ilike.%${normalizedBrandName}%`)
          .order("natural_fiber_percent", { ascending: false }).limit(12);
        brandProducts = data || [];

        if (brandProducts.length === 0 && productName) {
          const terms = [productName, extracted.garmentType, category]
            .filter(Boolean)
            .join(" ")
            .split(/\s+/)
            .map((term: string) => term.toLowerCase().replace(/[^a-z0-9]/g, ""))
            .filter((term: string) => term.length >= 4)
            .slice(0, 4);
          if (terms.length > 0) {
            const { data: productMatches } = await scannerCatalogQuery(supabase)
              .or(terms.map((term: string) => `name.ilike.%${term}%`).join(","))
              .order("natural_fiber_percent", { ascending: false }).limit(12);
            brandProducts = productMatches || [];
          }
        }
      }
    } catch (e: any) {
      console.error("Brand lookup failed:", e.message);
    }

    let effectivePercent = analysis.naturalPercent;
    let usedBrandAvg = false;
    if (effectivePercent === 0 && !analysis.compositionText && brandProducts.length > 0) {
      const avgFiber = Math.round(brandProducts.reduce((s, p) => s + (p.natural_fiber_percent || 0), 0) / brandProducts.length);
      if (avgFiber > 0) {
        effectivePercent = Math.min(avgFiber, 99);
        usedBrandAvg = true;
      }
    }

    const priceNum = parsePriceNumber(price);
    const detectedFiberForSearch = analysis.fibers.find(f => f.isNatural)?.fiber || "";
    const fiberFilter = detectedFiberForSearch.toLowerCase().split(" ")[0] || "";
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const userId = accessToken ? await getSupabaseAuthUserId(accessToken) : null;
    const prefs = userId ? await fetchTastePreferences(supabase, userId) : null;
    const preferredFiber = prefs?.preferredFibers?.[0]?.toLowerCase() || "";
    const primaryNaturalFiber = analysis.fibers.find(f => f.isNatural)?.fiber?.toLowerCase() || "";
    const alternativeFiber =
      effectivePercent >= 80 && primaryNaturalFiber
        ? primaryNaturalFiber.split(/\s+/)[0]
        : preferredFiber || primaryNaturalFiber || "silk";

    let alternatives: any[] = [];
    try {
      alternatives = await searchAlternatives(
        supabase,
        category,
        brandSlug,
        priceNum,
        color,
        fiberFilter,
        alternativeFiber
      );
    } catch (e: any) {
      console.error("Alternatives search failed:", e.message);
    }

    const primaryFiber =
      analysis.fibers[0]?.fiber?.toLowerCase() ||
      fiberFilter ||
      alternativeFiber;

    let verdict = "";
    if (openai && analysis.fibers.length > 0) {
      try {
        const vRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a fabric expert for INTERTEXE. Give a concise 2-3 sentence verdict about this garment's material quality. Be specific about the fibers. If synthetic, explain why natural is better. If natural, praise the quality. Never use bullet points. Be direct and editorial." },
            { role: "user", content: `Brand: ${brandName}\nProduct: ${productName}\nComposition: ${analysis.compositionText}\nNatural %: ${analysis.naturalPercent}%\nQuality Score: ${analysis.qualityScore}/100\nCategory: ${garmentType || category}` }
          ],
          max_tokens: 200,
          temperature: 0.7,
        });
        verdict = vRes.choices[0]?.message?.content?.trim() || "";
      } catch {}
    }
    if (!verdict) {
      if (usedBrandAvg) {
        verdict = `We couldn't confirm this specific item's composition, but ${brandName}'s catalog averages ${effectivePercent}% natural fibers. Check the product label to verify.`;
      } else {
        verdict = buildVerdict(analysis.naturalPercent, analysis.qualityScore, analysis.fibers, analysis.compositionText, brandName, garmentType);
      }
    }

    const avgFiber = brandProducts.length
      ? Math.min(99, Math.round(brandProducts.reduce((s: number, p: any) => s + (p.natural_fiber_percent || 0), 0) / brandProducts.length))
      : null;
    const brandRating = avgFiber === null ? null : avgFiber >= 95 ? "Exceptional" : avgFiber >= 85 ? "Excellent" : avgFiber >= 70 ? "Good" : "Caution";

    const confirmPrompt = buildConfirmationPrompt(extracted);

    if (userId) {
      try {
        await supabase.from("scan_history").insert({
          user_id: userId,
          scanned_at: new Date().toISOString(),
          brand: brandName,
          product_name: productName,
          composition: analysis.compositionText || extracted.composition || "",
          natural_percent: effectivePercent,
          verdict,
          scan_source: extracted.inputType || (image ? "image" : url ? "url" : barcode ? "barcode" : "manual"),
          raw_analysis: {
            detected_fiber: primaryFiber,
            is_natural: effectivePercent >= 80,
            alternatives_shown: alternatives.slice(0, 12).map((p: any) => p.id).filter(Boolean),
          },
        });
      } catch (e: any) {
        console.error("scan_history insert:", e.message);
      }
    }

    if (userId && primaryFiber) {
      const currentFibers = prefs?.preferredFibers || [];
      const updatedFibers = [
        primaryFiber,
        ...currentFibers.filter((f) => f.toLowerCase() !== primaryFiber),
      ].slice(0, 5);
      try {
        await upsertTastePreferences(supabase, userId, { preferredFibers: updatedFibers });
      } catch (e: any) {
        console.error("user_preferences update:", e.message);
      }
    }

    return NextResponse.json({
      tagInfo: {
        brandName, productName, price,
        composition: analysis.compositionText,
        garmentType, size: extracted.size || "",
        madeIn: extracted.madeIn || "",
        careInstructions: extracted.careInstructions || "",
        confidence: usedBrandAvg ? "brand-average" : extracted.confidence || "low",
        rawText: image ? "From photo scan" : url ? `From ${sourceHost || "product URL"}` : "From barcode",
        inputType: extracted.inputType || "unknown",
        color,
        silhouette: extracted.silhouette || "",
        barcode: extracted.barcode || "",
      },
      imageUrl,
      fiberBreakdown: analysis.fibers,
      naturalPercent: effectivePercent,
      qualityScore: analysis.qualityScore,
      isNatural: effectivePercent >= 80,
      verdict,
      category,
      products: brandProducts.slice(0, 12),
      matched: !!(designerInfo || brandProducts.length || alternatives.length),
      brandStats: brandProducts.length && avgFiber !== null ? { avgFiber, rating: brandRating, productCount: brandProducts.length } : null,
      designerInfo: designerInfo ? {
        name: designerInfo.name, slug: designerInfo.slug,
        logo_url: designerInfo.logo_url, website: designerInfo.website,
        description: designerInfo.description, rating: designerInfo.rating,
        hasProducts: brandProducts.length > 0,
      } : null,
      betterAlternatives: alternatives,
      confirmationPrompt: confirmPrompt,
    });
  } catch (err: any) {
    console.error("Scan error:", err.message);
    try {
      const alternatives = await searchAlternatives(supabase, "", "", null, "");
      return NextResponse.json({
        tagInfo: {
          brandName: "Unknown", productName: "", price: "", composition: "",
          garmentType: "", size: "", madeIn: "", careInstructions: "",
          confidence: "low", rawText: "", inputType: "unknown",
          color: "", silhouette: "", barcode: "",
        },
        imageUrl: "",
        fiberBreakdown: [], naturalPercent: 0, qualityScore: 0,
        isNatural: false,
        verdict: "We couldn't analyze this item right now. Browse our curated natural-fiber products below.",
        category: "", products: [], matched: false,
        brandStats: null, designerInfo: null,
        betterAlternatives: alternatives,
        confirmationPrompt: null,
      });
    } catch {
      return NextResponse.json({ error: "Scan failed" }, { status: 500 });
    }
  }
}
