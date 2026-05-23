export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { scannerCatalogQuery } from "../../../lib/scanner-catalog";

const NATURAL_FIBERS = new Set([
  "cotton", "linen", "silk", "wool", "cashmere", "mohair", "alpaca", "hemp",
  "jute", "ramie", "bamboo", "merino", "angora", "camel", "vicuna", "yak",
  "flax", "kapok", "coir", "lyocell", "tencel", "modal", "cupro",
  "leather", "suede", "nubuck", "shearling",
]);

const SYNTHETIC_FIBERS = new Set([
  "polyester", "nylon", "acrylic", "spandex", "elastane", "lycra", "polyamide",
  "polypropylene", "polyurethane", "pvc", "vinyl", "rayon", "viscose",
  "acetate", "triacetate", "modacrylic", "olefin", "recycled polyester",
  "recycled nylon", "recycled polyamide", "econyl",
]);

const FIBER_NORMALIZATION: [RegExp, string][] = [
  [/\b(european\s+)?flax(\s+linen)?\b/i, "linen"],
  [/\b(european\s+)?linen(\s+flax)?\b/i, "linen"],
  [/\bflax\b/i, "linen"],
  [/\bpima\s+cotton\b/i, "cotton"],
  [/\bsupima\s+cotton\b/i, "cotton"],
  [/\begyptian\s+cotton\b/i, "cotton"],
  [/\borganic\s+cotton\b/i, "cotton"],
  [/\bsea\s+island\s+cotton\b/i, "cotton"],
  [/\bbci\s+certified\s+cotton\b/i, "cotton"],
  [/\braw\s+denim\b/i, "cotton"],
  [/\bselvedge\s+denim\b/i, "cotton"],
  [/\bdenim\b/i, "cotton"],
  [/\bmerino\s+wool\b/i, "merino"],
  [/\bvirgin\s+wool\b/i, "wool"],
  [/\bshetland\s+wool\b/i, "wool"],
  [/\blambswool\b/i, "wool"],
  [/\bmongolian\s+cashmere\b/i, "cashmere"],
  [/\bscottish\s+cashmere\b/i, "cashmere"],
  [/\bbaby\s+alpaca\b/i, "alpaca"],
  [/\bsuri\s+alpaca\b/i, "alpaca"],
  [/\bmulberry\s+silk\b/i, "silk"],
  [/\bcharmeuse\s+silk\b/i, "silk"],
  [/\bhabotai\s+silk\b/i, "silk"],
  [/\bcrêpe\s+de\s+chine\b/i, "silk"],
  [/\bwashed\s+silk\b/i, "silk"],
  [/\brecycled\s+polyester\b/i, "recycled polyester"],
  [/\brecycled\s+nylon\b/i, "recycled nylon"],
  [/\brecycled\s+polyamide\b/i, "recycled nylon"],
  [/\beconyl\b/i, "recycled nylon"],
  [/\brecycled\s+cotton\b/i, "cotton"],
  [/\brecycled\s+wool\b/i, "wool"],
  [/\brecycled\s+cashmere\b/i, "cashmere"],
  [/\beuropean\b/i, "linen"],
];

function normalizeFiberName(raw: string): string {
  const cleaned = raw.trim().toLowerCase()
    .replace(/\s+(in|with|for|from|featuring|fabrication|jersey|fleece|french|terry|poplin|weave|fabric|certified|standard|oeko|tex|bci|gots).*$/i, "")
    .replace(/[®™©]/g, "")
    .trim();

  for (const [pattern, normalized] of FIBER_NORMALIZATION) {
    if (pattern.test(cleaned)) return normalized;
  }

  const words = cleaned.split(/\s+/);
  for (const word of words) {
    if (NATURAL_FIBERS.has(word)) return word;
    if (SYNTHETIC_FIBERS.has(word)) return word;
  }

  return cleaned;
}

function parseComposition(raw: string): { fiber: string; percent: number; isNatural: boolean }[] {
  if (!raw) return [];
  const fibers: { fiber: string; percent: number; isNatural: boolean }[] = [];
  const regex = /(\d+(?:\.\d+)?)\s*%\s*([a-zA-Z\s/®™]+?)(?=[,;/&]|\d+\s*%|$)|([a-zA-Z\s/®™]+?)\s*(\d+(?:\.\d+)?)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    const pct = parseFloat(m[1] || m[4]);
    const rawName = (m[2] || m[3]).trim();
    if (pct > 0 && rawName) {
      const name = normalizeFiberName(rawName);
      if (!name || /^\s*$/.test(name)) continue;
      const isRecycledSynthetic = /^recycled\s+(polyester|nylon|polyamide|plastic)$/i.test(name);
      const baseFiber = name.replace(/^recycled\s+/i, "").trim();
      const isNat = isRecycledSynthetic ? false : (NATURAL_FIBERS.has(baseFiber) || NATURAL_FIBERS.has(name));
      const displayName = name.charAt(0).toUpperCase() + name.slice(1);
      fibers.push({ fiber: displayName, percent: pct, isNatural: isNat });
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
  if (productNameLower.match(/\b(jacket|coat|blazer|parka|puffer|bomber|chaqueta|abrigo|manteau|veste|giubbotto)\b/)) return "outerwear";
  if (productNameLower.match(/\b(sweater|knit|cardigan|pullover|jumper)\b/)) return "knitwear";
  return "";
}

function parsePriceNumber(priceStr: string): number | null {
  if (!priceStr) return null;
  const match = priceStr.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const num = parseFloat(match);
  return isNaN(num) ? null : num;
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

function normalizeProductUrl(raw: string): string {
  let cleaned = String(raw || "")
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "");
  if (cleaned && !/^https?:\/\//i.test(cleaned)) cleaned = "https://" + cleaned;
  return cleaned;
}

function inferFibersFromName(name: string): { fiber: string; percent: number; isNatural: boolean }[] {
  const lower = name.toLowerCase();
  const materialKeywords: Record<string, string> = {
    "leather": "leather", "cuero": "leather", "piel": "leather", "leder": "leather", "cuir": "leather", "pelle": "leather",
    "suede": "suede", "ante": "suede", "daim": "suede", "camoscio": "suede", "wildleder": "suede",
    "silk": "silk", "seda": "silk", "soie": "silk", "seta": "silk", "seide": "silk",
    "cotton": "cotton", "algodón": "cotton", "algodon": "cotton", "coton": "cotton", "cotone": "cotton", "baumwolle": "cotton",
    "linen": "linen", "lino": "linen", "lin": "linen", "leinen": "linen",
    "wool": "wool", "lana": "wool", "laine": "wool", "wolle": "wool",
    "cashmere": "cashmere", "cachemire": "cashmere", "cachemira": "cashmere", "kaschmir": "cashmere",
    "mohair": "mohair",
    "alpaca": "alpaca",
    "hemp": "hemp", "cáñamo": "hemp", "chanvre": "hemp", "canapa": "hemp",
    "ramie": "ramie", "ramio": "ramie",
    "denim": "cotton",
  };
  for (const [keyword, fiber] of Object.entries(materialKeywords)) {
    const re = new RegExp(`\\b${keyword}\\b`, "i");
    if (re.test(lower)) {
      const isNatural = NATURAL_FIBERS.has(fiber) || ["leather", "suede"].includes(fiber);
      return [{ fiber, percent: 100, isNatural }];
    }
  }
  return [];
}

function humanizeProductSlug(slug: string): string {
  return slug
    .replace(/\.\w+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\bp\d{5,}\b/gi, "")
    .replace(/\bv\d+\b/gi, "")
    .replace(/\d{6,}/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function extractInfoFromUrl(url: string): { brand: string; product: string; retailer: string; detectedFibers: string[]; detectedCategory: string } {
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
      "diesel.com": "Diesel", "faithfullthebrand.com": "Faithfull the Brand", "au.faithfullthebrand.com": "Faithfull the Brand", "onequince.com": "Quince", "massimodutti.com": "Massimo Dutti",
      "proenzaschouler.com": "Proenza Schouler", "stellamccartney.com": "Stella McCartney",
      "loewe.com": "Loewe", "chloe.com": "Chloé", "maxmara.com": "Max Mara",
      "tibi.com": "Tibi", "lagence.com": "L'Agence", "rixo.co.uk": "RIXO",
      "redone.com": "Re/Done", "seanewyork.com": "Sea New York",
      "julia-heuer.com": "Julia Heuer",
      "adolfodominguez.com": "Adolfo Dominguez", "mangooutlet.com": "Mango", "mango.com": "Mango",
      "brunellocucinelli.com": "Brunello Cucinelli", "loropiana.com": "Loro Piana",
      "hermes.com": "Hermès", "bottegaveneta.com": "Bottega Veneta",
    };
    const hostnameParts = hostname.split(".");
    const baseDomain = hostnameParts.length > 2 ? hostnameParts.slice(-2).join(".") : hostname;
    const retailer = brandMap[hostname] || brandMap[baseDomain] || hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const productSlug = pathParts.filter(p => !["products", "s", "p", "shop", "collections", "en", "us", "en-us", "en-es", "en-gb", "es-es", "fr-fr", "de-de", "it-it", "pt-pt", "en-de", "en-fr", "womens", "women", "clothing", "new-arrivals", "mujer", "femme", "donna", "damen", "ropa", "vetements"].includes(p.toLowerCase())).pop() || "";
    const product = humanizeProductSlug(productSlug);
    const fullPath = (parsed.pathname + " " + productSlug).toLowerCase();
    const fiberAliases: Record<string, string> = {
      ramie: "Ramie", ramio: "Ramie", linen: "Linen", lino: "Linen", lin: "Linen", flax: "Linen",
      cotton: "Cotton", algodon: "Cotton", "algodón": "Cotton", silk: "Silk", seda: "Silk",
      wool: "Wool", lana: "Wool", cashmere: "Cashmere", cachemir: "Cashmere",
      hemp: "Hemp", canapa: "Hemp",
    };
    const detectedFibers = [...new Set(Object.entries(fiberAliases).filter(([key]) => fullPath.includes(key)).map(([, value]) => value))];
    const categoryTerms: Record<string, string[]> = {
      outerwear: ["jacket", "coat", "blazer", "parka", "trench", "chaqueta", "abrigo"],
      dresses: ["dress", "gown", "vestido", "robe"],
      tops: ["top", "shirt", "blouse", "camisole", "tank"],
      knitwear: ["sweater", "knit", "cardigan", "pullover"],
      bottoms: ["pant", "trouser", "jean", "short"],
      skirts: ["skirt"],
    };
    let detectedCategory = "";
    for (const [cat, terms] of Object.entries(categoryTerms)) {
      if (terms.some(term => fullPath.includes(term))) { detectedCategory = cat; break; }
    }
    const multiBrandDomains = ["nordstrom.com", "net-a-porter.com", "ssense.com", "farfetch.com", "mytheresa.com", "shopbop.com", "saksfifthavenue.com", "revolve.com", "asos.com"];
    const isMultiBrand = multiBrandDomains.includes(hostname) || multiBrandDomains.includes(baseDomain);
    return { brand: isMultiBrand ? "" : retailer, product, retailer, detectedFibers, detectedCategory };
  } catch {
    return { brand: "", product: "", retailer: "", detectedFibers: [], detectedCategory: "" };
  }
}

function sortAlternatives(products: any[], priceNum: number | null, fiberFilter: string): any[] {
  return [...products].sort((a: any, b: any) => {
    const aFiber = fiberFilter && (a.composition || "").toLowerCase().includes(fiberFilter) ? 1 : 0;
    const bFiber = fiberFilter && (b.composition || "").toLowerCase().includes(fiberFilter) ? 1 : 0;
    if (bFiber !== aFiber) return bFiber - aFiber;
    if (priceNum) {
      const ap = parsePriceNumber(a.price || "");
      const bp = parsePriceNumber(b.price || "");
      const aBetter = ap !== null && ap <= priceNum ? 1 : 0;
      const bBetter = bp !== null && bp <= priceNum ? 1 : 0;
      if (bBetter !== aBetter) return bBetter - aBetter;
      const aDistance = ap === null ? Infinity : Math.abs(ap - priceNum);
      const bDistance = bp === null ? Infinity : Math.abs(bp - priceNum);
      if (aDistance !== bDistance) return aDistance - bDistance;
    }
    return (b.natural_fiber_percent || 0) - (a.natural_fiber_percent || 0);
  });
}

async function fetchAlternatives(supabase: any, category: string, brandSlug: string, priceNum: number | null, fiberFilter = "") {
  const categoryKeywords: Record<string, string[]> = {
    dresses: ["dress", "gown"], tops: ["top", "blouse", "shirt", "tee", "camisole"],
    bottoms: ["pant", "trouser", "jean", "denim", "palazzo", "wide-leg", "slim"],
    outerwear: ["jacket", "coat", "blazer"], knitwear: ["sweater", "knit", "cardigan", "pullover"],
    skirts: ["skirt"], shorts: ["short", "shorts"],
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

  const { data: altData } = await altQuery.limit(80);
  let alternatives = sortAlternatives(altData || [], priceNum, fiberFilter);

  if (alternatives.length < 6 && fiberFilter && category) {
    let categoryQuery = scannerCatalogQuery(supabase)
      .eq("category", category)
      .gte("natural_fiber_percent", 80)
      .not("image_url", "is", null)
      .order("natural_fiber_percent", { ascending: false })
      .limit(80);
    if (brandSlug && brandSlug !== "unknown") {
      categoryQuery = categoryQuery.neq("brand_slug", brandSlug);
    }
    const { data: categoryData } = await categoryQuery;
    if (categoryData?.length) alternatives = sortAlternatives([...alternatives, ...categoryData], priceNum, fiberFilter);
  }

  if (alternatives.length < 4 && searchTerms.length > 0) {
    let fallbackQuery = scannerCatalogQuery(supabase)
      .or(searchTerms.map(t => `name.ilike.%${t}%`).join(","))
      .order("natural_fiber_percent", { ascending: false })
      .limit(40);
    if (brandSlug && brandSlug !== "unknown") {
      fallbackQuery = fallbackQuery.neq("brand_slug", brandSlug);
    }
    const { data: fallbackData } = await fallbackQuery;
    if (fallbackData && fallbackData.length > alternatives.length) alternatives = sortAlternatives(fallbackData, priceNum, fiberFilter);
  }

  if (alternatives.length < 4) {
    const { data: anyData } = await scannerCatalogQuery(supabase)
      .order("natural_fiber_percent", { ascending: false })
      .limit(30);
    if (anyData && anyData.length > alternatives.length) alternatives = sortAlternatives(anyData, priceNum, fiberFilter);
  }

  const brandBuckets: Record<string, any[]> = {};
  for (const p of alternatives) {
    const bs = p.brand_slug || "unknown";
    if (!brandBuckets[bs]) brandBuckets[bs] = [];
    brandBuckets[bs].push(p);
  }

  const diversified: any[] = [];
  const brandSlugs = Object.keys(brandBuckets);
  let idx = 0;
  while (diversified.length < 12 && idx < 100) {
    const bs = brandSlugs[idx % brandSlugs.length];
    if (brandBuckets[bs] && brandBuckets[bs].length > 0) {
      diversified.push(brandBuckets[bs].shift()!);
    }
    idx++;
    if (brandSlugs.every(b => !brandBuckets[b] || brandBuckets[b].length === 0)) break;
  }

  return diversified.slice(0, 12);
}

async function generateAIVerdict(
  openai: OpenAI,
  brandName: string,
  productName: string,
  composition: string,
  naturalPercent: number,
  fibers: { fiber: string; percent: number; isNatural: boolean }[],
  price: string,
  category: string
): Promise<string> {
  try {
    const fiberList = fibers.map(f => `${f.percent}% ${f.fiber} (${f.isNatural ? "natural" : "synthetic"})`).join(", ");
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a fabric expert for INTERTEXE, a luxury natural-fabric fashion platform. Give a concise 2-3 sentence verdict about this garment's material quality. Be specific about the fibers used. If it's synthetic or low natural content, explain why natural alternatives are better (breathability, durability, sustainability). If it's high natural content, praise the specific fiber quality. Mention "recycled" polyester/nylon is still plastic on skin. Never use bullet points. Be direct, knowledgeable, editorial — like a luxury fashion editor.`
        },
        {
          role: "user",
          content: `Brand: ${brandName}\nProduct: ${productName}\nPrice: ${price}\nComposition: ${composition || "Unknown"}\nFiber breakdown: ${fiberList || "None detected"}\nNatural fiber %: ${naturalPercent}%\nCategory: ${category}`
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });
    return res.choices[0]?.message?.content?.trim() || "";
  } catch {
    return "";
  }
}

function buildFallbackVerdict(naturalPercent: number, compositionText: string, fibers: { fiber: string; percent: number; isNatural: boolean }[]): string {
  const inferred = compositionText.includes("(inferred");
  const syntheticFibers = fibers.filter(f => !f.isNatural).map(f => f.fiber);
  const hasRecycledSynthetic = syntheticFibers.some(f => /recycled/i.test(f));

  if (naturalPercent >= 95) return inferred
    ? `This appears to be made from natural materials based on the product description — ${naturalPercent}% natural. Verify the label for exact composition.`
    : `Excellent choice — ${naturalPercent}% natural fibers. This is a high-quality material composition.`;
  if (naturalPercent >= 70) return `Good composition — ${naturalPercent}% natural fibers. A solid natural-fiber garment.`;
  if (naturalPercent >= 40) {
    const synthNote = hasRecycledSynthetic ? " \"Recycled\" polyester/nylon is still synthetic plastic on your skin." : "";
    return `Mixed composition — only ${naturalPercent}% natural fibers.${synthNote} Consider alternatives with higher natural fiber content.`;
  }
  if (naturalPercent > 0) {
    const synthNote = hasRecycledSynthetic ? " Recycled synthetics are still plastic — they don't breathe or age like natural fibers." : "";
    return `Low natural fiber content — only ${naturalPercent}%.${synthNote} This garment is primarily synthetic. We found natural-fiber alternatives below.`;
  }
  if (compositionText) {
    if (/recycled/i.test(compositionText)) {
      return "This garment uses recycled materials, but they're still synthetic fibers — plastic on your skin. See natural-fiber alternatives below that breathe better and last longer.";
    }
    return "This garment appears to be primarily synthetic. See natural-fiber alternatives below.";
  }
  return "We couldn't determine the exact composition. Browse our curated natural-fiber products below.";
}

function buildResponse(data: {
  brandName: string; productName: string; price: string; composition: string;
  fibers: any[]; naturalPercent: number; category: string;
  brandProducts: any[]; designerInfo: any; alternatives: any[];
  confidence: string; source: string; imageUrl: string; verdict: string;
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
    if (avgFiber >= 90) effectiveVerdict = `We couldn't confirm this specific item's composition, but based on ${data.brandName}'s catalog, their pieces average ${avgFiber}% natural fibers — an excellent brand for natural fabrics. Check the product label to confirm.`;
    else if (avgFiber >= 70) effectiveVerdict = `We couldn't confirm this specific item's composition, but based on ${data.brandName}'s catalog, their pieces average ${avgFiber}% natural fibers. Check the product label to verify.`;
    else effectiveVerdict = `We couldn't confirm this specific item's composition. Based on ${data.brandName}'s catalog, their pieces average ${avgFiber}% natural fibers — some items may contain synthetics. Check the product label.`;
  } else {
    effectiveVerdict = data.verdict || buildFallbackVerdict(data.naturalPercent, data.composition, data.fibers);
  }

  return {
    tagInfo: {
      brandName: data.brandName, productName: data.productName, price: data.price,
      composition: data.composition, garmentType: "", size: "",
      madeIn: "", careInstructions: "",
      confidence: usedBrandAvg ? "brand-average" : data.confidence, rawText: data.source,
    },
    imageUrl: data.imageUrl,
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
  const openai = getOpenAIClient();
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
    let url = normalizeProductUrl(requestUrl);
    if (!url) return NextResponse.json({ error: "Product URL required" }, { status: 400 });
    let parsedUrl: URL;
    try { parsedUrl = new URL(url); } catch { return NextResponse.json({ error: "Please paste a full product URL." }, { status: 400 }); }
    for (const p of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gad_source", "gad_campaignid", "gbraid", "gclid", "fbclid", "mc_cid", "mc_eid"]) {
      parsedUrl.searchParams.delete(p);
    }
    url = parsedUrl.toString();
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
    let imageUrl = "";
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

          if (sp.image?.src) {
            imageUrl = sp.image.src;
          } else if (sp.images?.length > 0) {
            imageUrl = sp.images[0].src || sp.images[0];
          }

          const bodyText = (sp.body_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
          const compMatch = bodyText.match(/(\d+(?:\.\d+)?%\s*[a-zA-Z][a-zA-Z\s]*?(?:,\s*\d+(?:\.\d+)?%\s*[a-zA-Z][a-zA-Z\s]*?)*?)(?=\s*[.&]|\s*OEKO|\s*BCI|\s*GOTS|\s*certified|\s*standard|$)/i);
          if (compMatch) compositionText = compMatch[0].trim();

          const titleLower = productName.toLowerCase();
          const tags = (sp.tags || []).map((t: string) => t.toLowerCase()).join(" ");
          const productType = (sp.product_type || "").toLowerCase();
          category = resolveCategory("", `${titleLower} ${tags} ${productType}`);
        }
      }
    } catch {}

    if (!compositionText || !productName || !imageUrl) {
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

          if (!imageUrl) {
            const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
            if (ogImageMatch) imageUrl = ogImageMatch[1];
          }
          if (!imageUrl) {
            const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
            if (twitterImageMatch) imageUrl = twitterImageMatch[1];
          }

          const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
          let structuredData = "";
          if (jsonLdMatch) {
            structuredData = jsonLdMatch.map(m => m.replace(/<\/?script[^>]*>/gi, "").trim()).join("\n").slice(0, 3000);
            for (const match of jsonLdMatch) {
              try {
                const jsonStr = match.replace(/<\/?script[^>]*>/gi, "").trim();
                const parsed = JSON.parse(jsonStr);
                const items = parsed["@graph"] ? parsed["@graph"] : [parsed];
                for (const item of (Array.isArray(items) ? items : [items])) {
                  if (!imageUrl && item.image) {
                    const img = Array.isArray(item.image) ? item.image[0] : item.image;
                    imageUrl = typeof img === 'string' ? img : img?.url || img?.contentUrl || "";
                  }
                }
              } catch {}
            }
          }

          if (imageUrl && !imageUrl.startsWith("http")) {
            try { imageUrl = new URL(imageUrl, url).toString(); } catch { imageUrl = ""; }
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

    if (openai && (!compositionText || !productName || !brandName || !imageUrl)) {
      try {
        const promptContent = pageContent
          ? `URL: ${url}\n\n${pageContent}`
          : `URL: ${url}\nRetailer: ${urlInfo.retailer}\nBrand (from URL): ${urlInfo.brand || "unknown"}\nProduct (from URL path): ${urlInfo.product || "unknown"}\n\nThe page could not be scraped. Use your knowledge of this brand and product.`;

        const extractRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `Extract product info from a fashion product page. The page may be in ANY language (Spanish, French, Italian, German, Portuguese, etc.) — translate product names to English. Return ONLY valid JSON:
{
  "brandName": "brand",
  "productName": "product name in English (clean, no extra text)",
  "price": "price with currency symbol",
  "composition": "full fiber composition e.g. '98% Cotton, 2% Elastane'",
  "fibers": [{"fiber":"cotton","percent":98},{"fiber":"elastane","percent":2}],
  "category": "tops/bottoms/dresses/outerwear/knitwear/skirts/shorts/other",
  "garmentType": "specific type: dress, pants, jeans, sweater, top, blouse, etc.",
  "imageUrl": "primary product image URL (full https URL)"
}
CRITICAL FIBER NAMING RULES:
- Use STANDARD English fiber names: cotton, linen, silk, wool, cashmere, polyester, nylon, elastane, ramie, etc.
- Translate foreign fiber names: ramio=ramie, algodón/algodon=cotton, seda=silk, lana=wool, lino=linen, cachemir/cachemire=cashmere, soie=silk, coton=cotton, baumwolle=cotton, seide=silk, cotone=cotton, seta=silk, canapa=hemp
- "European Flax" or "Flax" or "European Linen" = linen
- "Pima Cotton" or "Supima Cotton" or "Egyptian Cotton" or "Organic Cotton" or "BCI Cotton" = cotton
- "Merino Wool" or "Virgin Wool" or "Lambswool" = wool (or merino for merino wool)
- "Mongolian Cashmere" = cashmere
- "Mulberry Silk" = silk
- "Recycled Polyester" = recycled polyester (STILL synthetic)
- "Recycled Nylon" or "ECONYL" = recycled nylon (STILL synthetic)
- NEVER use geographic terms (European, Egyptian, Mongolian) as the fiber name itself
- Always extract the ACTUAL FIBER (linen, cotton, wool, silk, etc.)
- If composition is in the URL path (e.g. "ramio" or "lino" in the URL slug), use that as a fiber hint
Use null for genuinely unknown.` },
            { role: "user", content: promptContent }
          ],
          max_tokens: 500,
        });

        const pageInfo = JSON.parse(extractRes.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}");

        brandName = brandName || pageInfo.brandName || "Unknown";
        productName = productName || pageInfo.productName || "";
        price = price || pageInfo.price || "";
        compositionText = compositionText || pageInfo.composition || "";
        if (!imageUrl && pageInfo.imageUrl) imageUrl = pageInfo.imageUrl;
        category = category || resolveCategory(pageInfo.category || "", `${(pageInfo.productName || "").toLowerCase()} ${(pageInfo.garmentType || "").toLowerCase()}`);

        if (!fibers.length && pageInfo.fibers?.length) {
          fibers = pageInfo.fibers.map((f: any) => {
            const pctRaw = String(f.percent || "0").replace(/%/g, "").trim();
            const rawFiberName = (f.fiber || "").trim();
            const name = normalizeFiberName(rawFiberName);
            if (!name) return null;
            const isRecycledSynthetic = /^recycled\s+(polyester|nylon|polyamide|plastic)$/i.test(name);
            const baseFiber = name.replace(/^recycled\s+/i, "").trim();
            const displayName = name.charAt(0).toUpperCase() + name.slice(1);
            return {
              fiber: displayName,
              percent: parseFloat(pctRaw) || 0,
              isNatural: isRecycledSynthetic ? false : (NATURAL_FIBERS.has(baseFiber) || NATURAL_FIBERS.has(name)),
            };
          }).filter((f: any) => f && f.fiber && f.percent > 0);
        }
      } catch (aiErr: any) {
        console.error("AI extraction failed:", aiErr.message);
      }
    }

    brandName = brandName || urlInfo.brand || "Unknown";
    productName = productName || urlInfo.product || "Product";
    if (!category) category = resolveCategory("", productName.toLowerCase());
    if ((!category || category === "other") && urlInfo.detectedCategory) category = urlInfo.detectedCategory;

    if (!fibers.length && compositionText) {
      fibers = parseComposition(compositionText);
    }
    if (!fibers.length) {
      const nameToCheck = [productName, compositionText, pageContent.slice(0, 500)].filter(Boolean).join(" ");
      fibers = inferFibersFromName(nameToCheck);
      if (!fibers.length && urlInfo.detectedFibers.length > 0) {
        fibers = urlInfo.detectedFibers.map((fiber) => ({
          fiber,
          percent: 100,
          isNatural: true,
        }));
      }
      if (fibers.length && !compositionText) {
        compositionText = `${fibers[0].fiber.charAt(0).toUpperCase() + fibers[0].fiber.slice(1)} (inferred from product name)`;
      }
    }
    const naturalPercent = Math.min(100, computeNaturalPercent(fibers));

    const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const priceNum = parsePriceNumber(price);
    const detectedFiberForSearch = urlInfo.detectedFibers[0] || (fibers.find(f => f.isNatural)?.fiber) || "";
    const fiberFilter = detectedFiberForSearch.toLowerCase().split(" ")[0];

    let designerInfo = null;
    let brandProducts: any[] = [];
    try {
      const [designerResult, fuzzyDesignerResult] = await Promise.all([
        supabase.from("designers").select("*").eq("slug", brandSlug).limit(1),
        supabase.from("designers").select("*").ilike("name", `%${brandName}%`).limit(1),
      ]);
      designerInfo = designerResult.data?.[0] || fuzzyDesignerResult.data?.[0] || null;

      if (brandSlug !== "unknown") {
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
      alternatives = await fetchAlternatives(supabase, category, brandSlug, priceNum, fiberFilter);
    } catch (altErr: any) {
      console.error("Alternatives fetch failed:", altErr.message);
    }

    let aiVerdict = "";
    if (openai) {
      aiVerdict = await generateAIVerdict(openai, brandName, productName, compositionText, naturalPercent, fibers, price, category);
    }

    return NextResponse.json(buildResponse({
      brandName, productName, price, composition: compositionText,
      fibers, naturalPercent, category,
      brandProducts, designerInfo, alternatives,
      confidence: compositionText?.includes("(inferred") ? "inferred" : compositionText ? "high" : pageContent ? "medium" : "low",
      source: `From ${urlInfo.retailer || parsedUrl.hostname}`,
      imageUrl,
      verdict: aiVerdict,
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
        imageUrl: "",
        verdict: "",
      }));
    } catch {
      return NextResponse.json({
        tagInfo: { brandName: "Unknown", productName: "", price: "", composition: "", garmentType: "", size: "", madeIn: "", careInstructions: "", confidence: "low", rawText: "" },
        imageUrl: "",
        fiberBreakdown: [], naturalPercent: 0, isNatural: false,
        verdict: "We couldn't analyze this product right now. Browse our curated natural-fiber products below.",
        category: "", products: [], matched: false, brandStats: null, designerInfo: null, betterAlternatives: [],
      });
    }
  }
}
