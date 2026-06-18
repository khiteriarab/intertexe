export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { scannerCatalogQuery } from "../../../lib/scanner-catalog";
import { fetchTastePreferences, upsertTastePreferences } from "../../../lib/taste-preferences";
import { getSupabaseAuthUserId } from "../../../lib/supabase-auth-server";
import { lookupBarcode, upsertBarcodeFromComposition } from "../../../lib/scanner-barcode-lookup";
import { buildDppUpsertFields, mapExtractedDppFields, computeDppReady } from "../../../lib/dpp-fields";
import { getSmartAlternatives } from "../../../lib/scanner/get-smart-alternatives";
import { detectGarmentType, detectGarmentTypeFromComposition } from "../../../lib/scanner/detect-garment-type";
import { resolveGarmentType, resolveScanBrand } from "../../../lib/scanner/resolve-scan-metadata";
import {
  cleanOldSessions,
  getOrCreateScanSession,
  mergeScanContext,
  resolveDisplayBrand,
  updateScanSession,
} from "../../../lib/scanner/scan-session-store";
import { buildBarcodeScanResponse, buildUnifiedScanResponse, enrichBrandContext, pickCatalogImageUrl } from "../../../lib/scanner-response";
import { getVerdictMessage } from "../../../lib/scanner-copy";
import { queueScanFollowUp } from "../../../lib/scan-follow-up-queue";
import { buildScanHistoryRow } from "../../../lib/scan-history";
import { recordFunnelEvent, resolveFunnelSessionId } from "../../../lib/scanner-funnel";
import {
  extractWithSelectors,
  fetchPageHTML,
  fetchProductImageFromURL,
  getRetailerPattern,
} from "../../../lib/scanner/retailer-extraction";
import {
  cacheURLComposition,
  lookupURLComposition,
  normalizeScanURL,
  urlCompositionToExtracted,
} from "../../../lib/url-composition-cache";
import { FIBER_SYNONYMS, normalizeFiberToken } from "../../../lib/scanner/fiber-synonyms";
import { parseMultilingualComposition } from "../../../lib/scanner/parse-multilingual-composition";
import {
  detectCurrencyFromText,
  parseEuropeanPrice,
  parseRealWorldPrice,
  toPriceUSD,
} from "../../../lib/scanner/european-price";
import { preprocessLabel, splitShellAndLining } from "../../../lib/scanner/label-preprocessing";
import { isNonApparelProduct, NON_APPAREL_MESSAGE } from "../../../lib/scanner/non-apparel";
import { incrementScanCount } from "../../../lib/rewards";

const NATURAL_FIBERS = new Set([
  "cotton", "linen", "silk", "wool", "cashmere", "mohair", "alpaca", "hemp",
  "jute", "ramie", "bamboo", "merino", "merino wool", "angora", "camel", "vicuna", "yak",
  "flax", "kapok", "coir",
]);

const SEMI_SYNTHETIC_FIBERS = new Set([
  "viscose", "rayon", "modal", "lyocell", "tencel", "cupro", "acetate",
]);

const SYNTHETIC_FIBERS = new Set([
  "polyester", "nylon", "acrylic", "spandex", "elastane", "lycra", "polyamide",
  "polypropylene", "polyurethane", "pvc", "vinyl", "modacrylic", "olefin",
]);

function normalizeFiber(raw: string): string {
  return normalizeFiberToken(raw);
}

function classifyFiber(name: string): "natural" | "semi-synthetic" | "synthetic" {
  if (NATURAL_FIBERS.has(name)) return "natural";
  if (SEMI_SYNTHETIC_FIBERS.has(name)) return "semi-synthetic";
  return "synthetic";
}

type FiberEntry = { fiber: string; percent: number; isNatural: boolean; classification: string };

function parseComposition(raw: string): FiberEntry[] {
  if (!raw) return [];
  const multilingual = parseMultilingualComposition(raw);
  if (multilingual.length) {
    return multilingual.map(({ fiber, percent }) => {
      const cls = classifyFiber(fiber);
      return {
        fiber: fiber.charAt(0).toUpperCase() + fiber.slice(1),
        percent,
        isNatural: cls === "natural",
        classification: cls,
      };
    });
  }
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
  const dppExtractionPrompt = `Analyze this clothing label image and extract all visible information.

Return ONLY a valid JSON object with these exact fields. Do not include any text outside the JSON:

{
  "inputType": "tag|price_tag|barcode|garment|mixed",
  "brandName": "exact brand name if visible or null",
  "productName": "product name or description or null",
  "price": "price with currency if visible or null",
  "composition": "exact composition text as written on label or null",
  "fibers": [
    {
      "name": "fiber name e.g. Cotton, Silk, Wool, Polyester",
      "percentage": 0,
      "isRecycled": false
    }
  ],
  "naturalFiberPercent": 0,
  "hasRecycledContent": false,
  "recycledContentPercent": null,
  "countryOfOrigin": "country name or null if not visible",
  "careInstructions": "full care instructions text or null if not visible",
  "labelLanguage": "language the label is written in e.g. English, Spanish, French",
  "barcode": "barcode/GTIN number if visible or null",
  "additionalText": "any other text visible on the label or null",
  "confidence": "high|medium|low"
}

Rules:
- naturalFiberPercent must be a number between 0 and 100
- For countryOfOrigin look for Made in, Fabricado en, Fabriqué en, Hergestellt in, or similar
- For careInstructions capture all washing drying ironing and care text
- For recycled content look for the word recycled or regenerated before any fiber name
- If a field is not visible on the label return null for that field
- Never guess or infer information not visible on the label
- Translate foreign fiber names to English: ramio=ramie, algodón=cotton, seda=silk, lana=wool, lino=linen
- Return only the JSON object with no markdown formatting`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: dppExtractionPrompt },
        { type: "image_url", image_url: { url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}` } },
      ],
    }],
    max_tokens: 900,
  });
  const raw = res.choices[0]?.message?.content?.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim() || "{}";
  return JSON.parse(raw);
}

function normalizeExtractedFibers(fibers: any[]): any[] {
  if (!fibers?.length) return [];
  return fibers
    .map((f) => {
      const name = String(f.fiber || f.name || "").trim();
      const pct = parseFloat(String(f.percent ?? f.percentage ?? 0).replace(/%/g, "")) || 0;
      if (!name || pct <= 0) return null;
      const normalized = normalizeFiber(name);
      const cls = classifyFiber(normalized);
      return {
        fiber: normalized.charAt(0).toUpperCase() + normalized.slice(1),
        percent: pct,
        isNatural: cls === "natural",
        classification: cls,
        isRecycled: f.isRecycled === true || /recycled|regenerated/i.test(name),
      };
    })
    .filter(Boolean);
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

  let html = "";
  try {
    html = await fetchPageHTML(url);
    if (html) {
      const retailerPattern = getRetailerPattern(url);
      if (retailerPattern) {
        const targeted = extractWithSelectors(html, retailerPattern);
        if (targeted?.composition) {
          if (!imageUrl) {
            imageUrl = (await fetchProductImageFromURL(url)) || "";
          }
          const parsed = new URL(url);
          const hostname = parsed.hostname.replace("www.", "");
          const hostParts = hostname.split(".");
          const baseDomain = hostParts.length > 2 ? hostParts.slice(-2).join(".") : hostname;
          return {
            ...targeted,
            brandName: targeted.brandName || hostname.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            imageUrl,
            inputType: "url",
          };
        }
      }

      if (!imageUrl) {
        imageUrl = (await fetchProductImageFromURL(url)) || "";
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
  const brandFromUrl =
    extractBrandFromURL(url) ||
    hostname.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const skipSlugs = new Set(["products", "s", "p", "shop", "collections", "en", "us", "en-us", "es-es", "fr-fr", "de-de", "it-it", "womens", "women", "clothing", "mujer", "femme", "donna", "ropa"]);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const productSlug = pathParts.filter(p => !skipSlugs.has(p.toLowerCase())).pop() || "";
  const productFromUrl = humanizeProductSlug(productSlug);

  const pathLower = parsed.pathname.toLowerCase();
  const fiberHints: string[] = [];
  for (const [foreign, english] of Object.entries(FIBER_SYNONYMS)) {
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

function validateAINaturalPercent(
  aiPercent: number,
  parsedFibers: FiberEntry[]
): number {
  if (!parsedFibers?.length) return Math.min(aiPercent, 100);
  const parsedNaturalPercent = parsedFibers
    .filter((f) => f.isNatural)
    .reduce((sum, f) => sum + f.percent, 0);
  if (parsedNaturalPercent > 0) return Math.min(parsedNaturalPercent, 100);
  return Math.min(aiPercent, 100);
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
    fibers = normalizeExtractedFibers(extracted.fibers);
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

  const aiOrParsed =
    typeof extracted.naturalFiberPercent === 'number' && extracted.naturalFiberPercent > 0
      ? Math.min(100, Math.round(extracted.naturalFiberPercent))
      : computeNaturalPercent(fibers);
  const naturalPercent = validateAINaturalPercent(aiOrParsed, fibers);
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

  let funnelSessionId = "";
  let userId: string | null = null;
  let resolvedDevice: string | null = null;

  try {
    const body = await request.json();
    const {
      image,
      url,
      barcode,
      confirmation,
      composition_text: compositionText,
      session_id: sessionId,
      device_type: deviceType,
      detected_price: detectedPriceRaw,
      detected_currency: detectedCurrency,
      device,
      app_version: appVersion,
      user_email: userEmailBody,
      email: emailBody,
      user_id: bodyUserId,
      scan_source: scanSourceBody,
      garment_type: garmentTypeBody,
      garmentType: garmentTypeCamel,
      product_name: productNameBody,
    } = body;

    const compositionTextRaw =
      compositionText ??
      (typeof body.composition === 'string' ? body.composition : null);

    const resolvedGarmentType =
      (typeof garmentTypeBody === 'string' && garmentTypeBody.trim()) ||
      (typeof garmentTypeCamel === 'string' && garmentTypeCamel.trim()) ||
      null;

    const resolvedProductName =
      typeof productNameBody === 'string' ? productNameBody.trim() : '';

    const resolvedScanSource =
      typeof scanSourceBody === "string" && scanSourceBody.trim()
        ? scanSourceBody.trim()
        : null;

    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (accessToken) {
      userId = await getSupabaseAuthUserId(accessToken);
    }
    if (!userId && bodyUserId) {
      userId = String(bodyUserId);
    }

    const scanSessionId =
      (typeof sessionId === "string" && sessionId.trim()) ||
      crypto.randomUUID();

    funnelSessionId = resolveFunnelSessionId(scanSessionId);
    resolvedDevice = deviceType || device || null;

    const initialScanSource = resolvedScanSource
      ?? (compositionTextRaw && String(compositionTextRaw).trim()
        ? "label"
        : barcode
          ? "barcode"
          : image
            ? "image"
            : url
              ? "url"
              : "manual");

    await recordFunnelEvent(supabase, {
      session_id: funnelSessionId,
      event_type: "scan_started",
      user_id: userId,
      device_type: resolvedDevice,
      scan_source: initialScanSource,
    });

    const guestEmail =
      !userId && (userEmailBody || emailBody)
        ? String(userEmailBody || emailBody)
            .trim()
            .toLowerCase()
        : "";

    const resolvedCurrency =
      (typeof detectedCurrency === "string" && detectedCurrency.trim()) ||
      (typeof body.currency === "string" && body.currency.trim()) ||
      detectCurrencyFromText(String(detectedPriceRaw ?? body.price ?? "")) ||
      null;

    const scanRegion = String(body.region || "us").trim().toLowerCase() || "us";

    const parsedPrice = (() => {
      const priceInput = detectedPriceRaw ?? body.price ?? null;
      if (priceInput == null || priceInput === "") return null;
      const currency = resolvedCurrency || detectCurrencyFromText(String(priceInput));
      const realWorld = parseRealWorldPrice(priceInput, currency, scanRegion);
      if (realWorld?.originalPrice != null && realWorld.originalPrice > 0) {
        return realWorld.originalPrice;
      }
      const european = parseEuropeanPrice(priceInput, currency);
      if (european != null && european > 0) return european;
      const raw = String(priceInput).trim();
      if (!raw) return null;
      return parsePriceNumber(raw);
    })();

    void cleanOldSessions(supabase);
    const existingSession = await getOrCreateScanSession(supabase, scanSessionId);
    const mergedContext = mergeScanContext(existingSession, body, parsedPrice);

    const effectivePrice = mergedContext.detectedPrice ?? parsedPrice;
    const effectiveCurrency = mergedContext.detectedCurrency || resolvedCurrency || "USD";
    const resolvedRegion = mergedContext.region;

    console.log(
      "Scanner price received:",
      effectivePrice,
      effectiveCurrency,
      "raw=",
      detectedPriceRaw ?? body.price ?? null
    );

    await updateScanSession(supabase, scanSessionId, {
      barcode: mergedContext.barcode,
      brandName: mergedContext.brandName,
      brandSlug: mergedContext.brandSlug,
      productName: mergedContext.productName,
      garmentType: mergedContext.garmentType,
      detectedPrice: effectivePrice,
      detectedCurrency: effectiveCurrency,
      composition: mergedContext.composition,
      imageUrl: mergedContext.imageUrl,
      region: resolvedRegion,
    });

    const resolvedNaturalPercent =
      typeof body.naturalFiberPercent === "number"
        ? Math.min(100, Math.max(0, Math.round(body.naturalFiberPercent)))
        : null;

    async function recordScanHistory(payload: Record<string, unknown>) {
      try {
        await supabase.from("scan_history").insert(payload);
      } catch (e: any) {
        console.error("scan_history insert:", e.message);
      }
    }

    if (compositionTextRaw && String(compositionTextRaw).trim()) {
      const rawComposition = String(compositionTextRaw).trim();
      const { shell, lining } = splitShellAndLining(rawComposition);

      if (!shell.trim() && lining) {
        const liningResponse = buildUnifiedScanResponse({
          supabase,
          brandName: mergedContext.brandName || "",
          brandSlug: mergedContext.brandSlug || "",
          productName: mergedContext.productName || resolvedProductName || "",
          price: effectivePrice != null ? `$${effectivePrice}` : "",
          priceNum: effectivePrice,
          category: body.category || "",
          color: "",
          garmentType: resolvedGarmentType || mergedContext.garmentType || "",
          compositionText: "",
          fibers: [],
          naturalPercent: 0,
          qualityScore: 0,
          verdict: "Scan the outer fabric label for the main composition.",
          alternatives: [],
          brandProducts: [],
          designerInfo: null,
          brandStats: null,
          confirmPrompt: null,
          inputType: "composition",
          barcode: mergedContext.barcode || "",
          lookupSource: "lining_label",
          needsCompositionLabel: true,
          needsCompositionMessage:
            "Scan the outer fabric label for the main composition.",
          isLiningOnly: true,
          preprocessingWarnings: ["lining_label"],
          success: true,
        });
        await incrementScanCount(supabase, userId);
        return NextResponse.json(liningResponse);
      }

      const labelPrep = preprocessLabel(shell.trim() || rawComposition);

      if (labelPrep.isLiningOnly) {
        const liningResponse = buildUnifiedScanResponse({
          supabase,
          brandName: mergedContext.brandName || "",
          brandSlug: mergedContext.brandSlug || "",
          productName: mergedContext.productName || resolvedProductName || "",
          price: effectivePrice != null ? `$${effectivePrice}` : "",
          priceNum: effectivePrice,
          category: body.category || "",
          color: "",
          garmentType: resolvedGarmentType || mergedContext.garmentType || "",
          compositionText: "",
          fibers: [],
          naturalPercent: 0,
          qualityScore: 0,
          verdict: "Scan the outer fabric label for the main composition.",
          alternatives: [],
          brandProducts: [],
          designerInfo: null,
          brandStats: null,
          confirmPrompt: null,
          inputType: "composition",
          barcode: mergedContext.barcode || "",
          lookupSource: "lining_label",
          needsCompositionLabel: true,
          needsCompositionMessage:
            "Scan the outer fabric label for the main composition.",
          isLiningOnly: true,
          preprocessingWarnings: labelPrep.warnings,
          success: true,
        });
        await incrementScanCount(supabase, userId);
        return NextResponse.json(liningResponse);
      }

      const composition = labelPrep.processedText.trim() || shell.trim() || rawComposition;
      const liningPrep = lining ? preprocessLabel(lining) : null;
      const liningCompositionText = liningPrep?.processedText?.trim()
        ? (() => {
            const liningFibers = parseComposition(liningPrep.processedText.trim());
            return liningFibers.length
              ? liningFibers.map((f) => `${f.percent}% ${f.fiber}`).join(", ")
              : null;
          })()
        : null;

      const supplementaryURL = normalizeProductUrl(String(body.url || "").trim());
      const shouldFetchImage =
        body.fetch_image === true || body.fetch_image === "true";
      let supplementaryImageUrl =
        mergedContext.imageUrl ||
        String(body.image_url || body.imageUrl || "").trim() ||
        "";
      if (shouldFetchImage && supplementaryURL && !supplementaryImageUrl) {
        supplementaryImageUrl =
          (await fetchProductImageFromURL(supplementaryURL)) || "";
      }

      const extracted = {
        composition,
        inputType: "composition",
        confidence: "high",
        brandName: mergedContext.brandName || body.brand || "",
        productName:
          resolvedProductName ||
          mergedContext.productName ||
          body.product_name ||
          "",
        fibers: [],
      };
      const analysis = identifyProduct(extracted);
      const dppFields = mapExtractedDppFields(extracted, analysis.fibers);
      const upc =
        (barcode ? String(barcode).replace(/\D/g, "") : "") ||
        mergedContext.barcode ||
        "";
      let isNewToDatabase = false;
      if (upc && analysis.naturalPercent > 0) {
        isNewToDatabase = await upsertBarcodeFromComposition(supabase, upc, {
          brand: extracted.brandName || null,
          brandSlug: slugifyBrand(extracted.brandName || ""),
          productName: extracted.productName || null,
          composition: analysis.compositionText || composition,
          naturalFiberPercent: analysis.naturalPercent,
          fiberPrimary: analysis.fibers[0]?.fiber?.toLowerCase() || null,
          fiberBreakdown: analysis.fibers,
          price: effectivePrice,
          currency: effectiveCurrency,
          dpp: dppFields,
        });
      }

      const brandName = resolveDisplayBrand(extracted.brandName);
      const brandSlug = brandName ? slugifyBrand(brandName) : mergedContext.brandSlug || "";
      const garmentType =
        detectGarmentTypeFromComposition(
          composition,
          extracted.productName || resolvedProductName || "",
          body.category || ""
        ) ||
        resolvedGarmentType ||
        mergedContext.garmentType ||
        detectGarmentType(
          extracted.productName || resolvedProductName,
          body.category
        );
      const alternatives = await getSmartAlternatives(supabase, {
        composition: analysis.compositionText || composition,
        detectedPrice: effectivePrice,
        currency: effectiveCurrency,
        category: body.category || null,
        garmentType,
        primaryFiber: analysis.fibers[0]?.fiber,
        naturalFiberPercent: resolvedNaturalPercent ?? analysis.naturalPercent,
        brandSlug,
        region: resolvedRegion,
        userId,
        excludeBrandSlug: brandSlug || undefined,
      });

      await updateScanSession(supabase, scanSessionId, {
        barcode: upc || undefined,
        brandName: brandName || undefined,
        brandSlug: brandSlug || undefined,
        productName: extracted.productName || undefined,
        garmentType: garmentType || undefined,
        composition: analysis.compositionText || composition,
        naturalPercent: analysis.naturalPercent,
        detectedPrice: effectivePrice,
        detectedCurrency: effectiveCurrency,
        region: resolvedRegion,
      });

      const { designerInfo, brandProducts, avgFiber, brandRating } = await enrichBrandContext(
        supabase,
        brandName || mergedContext.brandName || "",
        brandSlug,
        extracted.productName || "",
        "",
        ""
      );

      const brandStats =
        brandProducts.length && avgFiber !== null
          ? { avgFiber, rating: brandRating, productCount: brandProducts.length }
          : null;

      const compositionImageUrl =
        supplementaryImageUrl ||
        pickCatalogImageUrl(brandProducts) ||
        pickCatalogImageUrl(alternatives);

      const productNameForResponse = extracted.productName || resolvedProductName || "";
      const nonApparel = isNonApparelProduct(productNameForResponse);

      const response = buildUnifiedScanResponse({
        supabase,
        brandName,
        brandSlug,
        productName: productNameForResponse,
        price: effectivePrice != null ? `$${effectivePrice}` : "",
        priceNum: effectivePrice,
        category: body.category || "",
        color: "",
        garmentType: garmentType || "",
        imageUrl: compositionImageUrl,
        compositionText: analysis.compositionText || composition,
        fibers: analysis.fibers,
        naturalPercent: analysis.naturalPercent,
        qualityScore: analysis.qualityScore,
        verdict: getVerdictMessage(analysis.naturalPercent),
        alternatives: nonApparel ? [] : alternatives,
        brandProducts,
        designerInfo,
        brandStats,
        confirmPrompt: null,
        inputType: "composition",
        barcode: upc,
        lookupSource: upc ? "composition_label" : "composition",
        needsCompositionLabel: false,
        isNewToDatabase,
        isNonApparel: nonApparel,
        nonApparelMessage: nonApparel ? NON_APPAREL_MESSAGE : null,
        preprocessingWarnings: labelPrep.warnings,
        liningComposition: liningCompositionText,
        success: true,
        countryOfOrigin: dppFields.countryOfOrigin ?? null,
        careInstructions: dppFields.careInstructions ?? null,
        hasRecycledContent: dppFields.hasRecycledContent ?? false,
        recycledContentPercent: dppFields.recycledContentPercent ?? null,
        labelLanguage: dppFields.labelLanguage ?? null,
        dppReady: computeDppReady({
          countryOfOrigin: dppFields.countryOfOrigin,
          careInstructions: dppFields.careInstructions,
          composition: analysis.compositionText || composition,
        }),
      });

      await recordFunnelEvent(supabase, {
        session_id: funnelSessionId,
        event_type: "composition_detected",
        user_id: userId,
        device_type: resolvedDevice,
        scan_source: "label",
        natural_fiber_percent: analysis.naturalPercent,
      });
      await recordFunnelEvent(supabase, {
        session_id: funnelSessionId,
        event_type: "result_shown",
        user_id: userId,
        device_type: resolvedDevice,
        scan_source: "label",
        natural_fiber_percent: analysis.naturalPercent,
        has_result: true,
      });

      await recordScanHistory(
        buildScanHistoryRow({
          userId,
          sessionId: funnelSessionId,
          brand: brandName,
          productName: extracted.productName || "",
          composition: analysis.compositionText || composition,
          naturalPercent: analysis.naturalPercent,
          verdict: String(response.verdict || ""),
          scanSource: resolvedScanSource ?? (upc ? "barcode" : "label"),
          imageUrl: supplementaryImageUrl || body.image_url || body.imageUrl || null,
          productUrl: body.product_url || body.url || null,
          upcCode: upc || null,
          countryOfOrigin: dppFields.countryOfOrigin ?? null,
          careInstructions: dppFields.careInstructions ?? null,
          hasRecycledContent: dppFields.hasRecycledContent ?? false,
          deviceType: deviceType || device || null,
          appVersion: appVersion || null,
          labelType: "composition",
          rawOcrText: composition,
          lookupSource: "composition_text",
          helpedBuildDatabase: isNewToDatabase,
          fiberPrimary: analysis.fibers[0]?.fiber?.toLowerCase() || null,
          alternativesShown: alternatives.slice(0, 12).map((p: any) => p.id).filter(Boolean),
        })
      );

      if (guestEmail) {
        await queueScanFollowUp(supabase, {
          email: guestEmail,
          composition: analysis.compositionText || composition,
          naturalFiberPercent: analysis.naturalPercent,
          verdict: String(response.verdict || getVerdictMessage(analysis.naturalPercent)),
        });
      }

      await incrementScanCount(supabase, userId);
      return NextResponse.json(response);
    }

    if (barcode && !image && !url) {
      const upc = String(barcode).replace(/\D/g, "") || mergedContext.barcode || "";
      const barcodeResult = await lookupBarcode(
        supabase,
        upc,
        effectivePrice,
        effectiveCurrency || detectedCurrency
      );

      await updateScanSession(supabase, scanSessionId, {
        barcode: upc,
        brandName: barcodeResult.brand || mergedContext.brandName,
        brandSlug: barcodeResult.brandSlug || mergedContext.brandSlug,
        productName: barcodeResult.productName || mergedContext.productName,
        garmentType:
          detectGarmentType(barcodeResult.productName, "") ||
          mergedContext.garmentType,
        detectedPrice: barcodeResult.price ?? effectivePrice,
        detectedCurrency: barcodeResult.currency || effectiveCurrency,
        composition: barcodeResult.composition || mergedContext.composition,
        naturalPercent: barcodeResult.naturalFiberPercent,
        region: resolvedRegion,
      });

      const resolvedBrand = resolveScanBrand({
        sessionBrand: mergedContext.brandName,
        barcodeBrand: barcodeResult.brand,
        barcodeBrandSlug: barcodeResult.brandSlug,
        extractedBrand: String(body.brand_name || body.brand || "").trim(),
        productName: barcodeResult.productName || mergedContext.productName,
      });

      const response = await buildBarcodeScanResponse(
        supabase,
        barcodeResult,
        upc,
        userId,
        scanSessionId,
        deviceType || device,
        resolvedRegion,
        resolvedBrand
      );

      await recordFunnelEvent(supabase, {
        session_id: funnelSessionId,
        event_type: "barcode_detected",
        user_id: userId,
        device_type: resolvedDevice,
        scan_source: "barcode",
      });
      await recordFunnelEvent(supabase, {
        session_id: funnelSessionId,
        event_type: "result_shown",
        user_id: userId,
        device_type: resolvedDevice,
        scan_source: "barcode",
        natural_fiber_percent: barcodeResult.naturalFiberPercent ?? null,
        has_result: true,
      });

      await recordScanHistory(
        buildScanHistoryRow({
          userId,
          sessionId: funnelSessionId,
          upcCode: upc,
          detectedBrand: barcodeResult.brand,
          brand: barcodeResult.brand,
          productName: barcodeResult.productName,
          composition: barcodeResult.composition,
          naturalPercent: barcodeResult.naturalFiberPercent,
          fiberPrimary: barcodeResult.fiberPrimary,
          priceDetected: barcodeResult.price,
          currencyDetected: barcodeResult.currency,
          lookupSource: barcodeResult.source,
          alternativesShown: response.alternatives?.slice(0, 12).map((p: any) => p.id).filter(Boolean),
          labelType: "barcode_only",
          scanSource: "barcode",
          deviceType: resolvedDevice,
          appVersion: appVersion || null,
          verdict: String(response.verdict || ""),
          helpedBuildDatabase: barcodeResult.isNewToDatabase,
          countryOfOrigin: barcodeResult.countryOfOrigin ?? null,
          careInstructions: barcodeResult.careInstructions ?? null,
          hasRecycledContent: barcodeResult.hasRecycledContent ?? false,
          imageUrl: response.imageUrl || null,
        })
      );

      await incrementScanCount(supabase, userId);
      return NextResponse.json(response);
    }

    let sourceHost = "";

    let extracted: any = {};

    if (image) {
      if (!openai) return NextResponse.json({ error: "AI service not available" }, { status: 500 });
      extracted = await extractFromImage(openai, image);
    } else if (url) {
      const cleanedUrl = normalizeScanURL(normalizeProductUrl(url));
      let parsedUrl: URL;
      try { parsedUrl = new URL(cleanedUrl); } catch { return NextResponse.json({ error: "Please paste a full product URL." }, { status: 400 }); }
      const cleanUrl = cleanedUrl;
      sourceHost = parsedUrl.hostname;
      try {
        const cachedUrl = await lookupURLComposition(supabase, cleanUrl);
        if (cachedUrl) {
          extracted = urlCompositionToExtracted(cachedUrl);
        } else {
          extracted = await extractFromUrl(openai, cleanUrl);
        }
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
    } else {
      return NextResponse.json({ error: "Provide an image, URL, or barcode" }, { status: 400 });
    }

    if (confirmation) {
      if (confirmation.category) extracted.category = confirmation.category;
      if (confirmation.color) extracted.color = confirmation.color;
      if (confirmation.garmentType) extracted.garmentType = confirmation.garmentType;
      extracted.confidence = "confirmed";
    }

    const brandName = resolveDisplayBrand(
      mergedContext.brandName || extracted.brandName || ""
    );
    const brandSlug = brandName ? slugifyBrand(brandName) : mergedContext.brandSlug || "";
    const productName = extracted.productName || mergedContext.productName || "";
    const price = extracted.price || "";
    const imageUrl = extracted.imageUrl || "";
    let category = extracted.category || resolveCategory(`${productName} ${extracted.garmentType || ""}`);
    const color = extracted.color || "";

    const analysis = identifyProduct(extracted);

    if (url && extracted.confidence !== "database") {
      const cacheUrl = normalizeScanURL(normalizeProductUrl(String(url)));
      const cacheComposition = analysis.compositionText || extracted.composition || "";
      if (cacheUrl && cacheComposition) {
        void cacheURLComposition(supabase, cacheUrl, {
          brandName: brandName || extracted.brandName || null,
          brandSlug: brandSlug || null,
          productName: productName || extracted.productName || null,
          composition: cacheComposition,
          naturalPercent: analysis.naturalPercent,
          priceUsd: parsePriceNumber(price) ?? effectivePrice,
          garmentType: extracted.garmentType || null,
          imageUrl: imageUrl || extracted.imageUrl || null,
          fiberBreakdown: analysis.fibers,
          region: resolvedRegion,
        });
      }
    }

    const garmentType =
      detectGarmentTypeFromComposition(
        analysis.compositionText || extracted.composition || "",
        productName,
        category
      ) ||
      extracted.garmentType ||
      mergedContext.garmentType ||
      detectGarmentType(productName, category) ||
      "";

    let designerInfo = null;
    let brandProducts: any[] = [];
    try {
      const [dr, fdr] = await Promise.all([
        supabase.from("designers").select("*").eq("slug", brandSlug).limit(1),
        supabase.from("designers").select("*").ilike("name", `%${brandName}%`).limit(1),
      ]);
      designerInfo = dr.data?.[0] || fdr.data?.[0] || null;
      if (brandSlug) {
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

    const priceNum = parsePriceNumber(price) ?? effectivePrice;
    const primaryNaturalFiber = analysis.fibers.find(f => f.isNatural)?.fiber?.toLowerCase() || "";
    const alternativeFiber =
      primaryNaturalFiber.split(/\s+/)[0] ||
      analysis.fibers[0]?.fiber?.toLowerCase().split(/\s+/)[0] ||
      "";

    let alternatives: any[] = [];
    try {
      alternatives = await getSmartAlternatives(supabase, {
        composition: analysis.compositionText || extracted.composition || "",
        detectedPrice: priceNum,
        currency: effectiveCurrency || detectedCurrency || null,
        category: category || null,
        garmentType: garmentType || detectGarmentType(productName, category),
        primaryFiber: alternativeFiber,
        naturalFiberPercent: usedBrandAvg ? 0 : effectivePercent,
        brandSlug,
        region: resolvedRegion,
        userId,
        excludeBrandSlug: brandSlug || undefined,
      });
    } catch (e: any) {
      console.error("Alternatives search failed:", e.message);
    }

    const primaryFiber =
      analysis.fibers[0]?.fiber?.toLowerCase() ||
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
    const dppFields = mapExtractedDppFields(extracted, analysis.fibers);
    const scanUpc = extracted.barcode
      ? String(extracted.barcode).replace(/\D/g, "")
      : barcode
        ? String(barcode).replace(/\D/g, "")
        : "";
    let isNewToDatabase = false;
    if (scanUpc && analysis.naturalPercent > 0 && (analysis.compositionText || extracted.composition)) {
      isNewToDatabase = await upsertBarcodeFromComposition(supabase, scanUpc, {
        brand: brandName || null,
        brandSlug: brandSlug || null,
        productName: productName || null,
        composition: analysis.compositionText || extracted.composition || "",
        naturalFiberPercent: analysis.naturalPercent,
        fiberPrimary: analysis.fibers[0]?.fiber?.toLowerCase() || null,
        fiberBreakdown: analysis.fibers,
        price: priceNum,
        currency: detectedCurrency || null,
        dpp: dppFields,
      });
    }

    const productUrlForHistory = url ? normalizeProductUrl(String(url)) : "";

    const finalScanSource = resolvedScanSource ?? extracted.inputType ?? (image ? "image" : url ? "url" : "manual");

    await recordFunnelEvent(supabase, {
      session_id: funnelSessionId,
      event_type: "result_shown",
      user_id: userId,
      device_type: resolvedDevice,
      scan_source: finalScanSource,
      natural_fiber_percent: effectivePercent,
      has_result: true,
    });

    await recordScanHistory(
      buildScanHistoryRow({
        userId,
        sessionId: funnelSessionId,
        brand: brandName,
        productName,
        composition: analysis.compositionText || extracted.composition || "",
        naturalPercent: effectivePercent,
        verdict,
        scanSource: finalScanSource,
        imageUrl: imageUrl || null,
        productUrl: productUrlForHistory || null,
        upcCode: scanUpc || null,
        countryOfOrigin: dppFields.countryOfOrigin ?? null,
        careInstructions: dppFields.careInstructions ?? null,
        hasRecycledContent: dppFields.hasRecycledContent ?? false,
        deviceType: resolvedDevice,
        appVersion: appVersion || null,
        fiberPrimary: primaryFiber || null,
        priceDetected: priceNum,
        currencyDetected: detectedCurrency || null,
        lookupSource: extracted.inputType || null,
        helpedBuildDatabase: isNewToDatabase,
        alternativesShown: alternatives.slice(0, 12).map((p: any) => p.id).filter(Boolean),
        rawAnalysis: {
          detected_fiber: primaryFiber,
          is_natural: effectivePercent >= 80,
          alternatives_shown: alternatives.slice(0, 12).map((p: any) => p.id).filter(Boolean),
        },
      })
    );

    const prefs = userId ? await fetchTastePreferences(supabase, userId) : null;
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

    await updateScanSession(supabase, scanSessionId, {
      barcode: scanUpc || mergedContext.barcode,
      brandName: brandName || undefined,
      brandSlug: brandSlug || undefined,
      productName: productName || undefined,
      garmentType: garmentType || undefined,
      composition: analysis.compositionText || extracted.composition,
      naturalPercent: usedBrandAvg ? null : effectivePercent,
      detectedPrice: priceNum,
      detectedCurrency: effectiveCurrency,
      imageUrl: imageUrl || mergedContext.imageUrl,
      region: resolvedRegion,
    });

    const legacyResponse = buildUnifiedScanResponse({
      supabase,
      brandName,
      brandSlug,
      productName,
      price,
      priceNum,
      imageUrl: imageUrl || mergedContext.imageUrl || "",
      category,
      color,
      garmentType,
      compositionText: analysis.compositionText,
      fibers: analysis.fibers,
      naturalPercent: usedBrandAvg ? 0 : effectivePercent,
      qualityScore: analysis.qualityScore,
      verdict: usedBrandAvg
        ? "Scan the care label for exact fiber content"
        : verdict || getVerdictMessage(effectivePercent),
      alternatives,
      brandProducts,
      designerInfo,
      brandStats: brandProducts.length && avgFiber !== null ? { avgFiber, rating: brandRating, productCount: brandProducts.length } : null,
      confirmPrompt,
      inputType: extracted.inputType || (image ? "image" : url ? "url" : "manual"),
      sourceHost,
      barcode: extracted.barcode || mergedContext.barcode || "",
      success: true,
      isNewToDatabase,
      needsCompositionLabel: usedBrandAvg,
      usedBrandAvg,
      countryOfOrigin: dppFields.countryOfOrigin ?? null,
      careInstructions: dppFields.careInstructions ?? null,
      hasRecycledContent: dppFields.hasRecycledContent ?? false,
      recycledContentPercent: dppFields.recycledContentPercent ?? null,
      labelLanguage: dppFields.labelLanguage ?? null,
      dppReady: computeDppReady({
        countryOfOrigin: dppFields.countryOfOrigin,
        careInstructions: dppFields.careInstructions,
        composition: analysis.compositionText || extracted.composition,
      }),
    });

    if (guestEmail) {
      await queueScanFollowUp(supabase, {
        email: guestEmail,
        composition: analysis.compositionText || extracted.composition || "",
        naturalFiberPercent: effectivePercent,
        verdict: String(verdict || getVerdictMessage(effectivePercent)),
      });
    }

    await incrementScanCount(supabase, userId);
    return NextResponse.json(legacyResponse);
  } catch (err: any) {
    console.error("Scan error:", err.message);
    await recordFunnelEvent(supabase, {
      session_id: funnelSessionId || resolveFunnelSessionId(null),
      event_type: "scan_failed",
      user_id: userId,
      device_type: resolvedDevice,
      error: err?.message || "Scan failed",
      has_result: false,
    });
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
        verdict: "For the full fiber breakdown scan the care label inside the garment.",
        verdictMessage: "For the full fiber breakdown scan the care label inside the garment.",
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
