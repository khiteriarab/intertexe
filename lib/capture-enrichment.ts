/**
 * Standalone URL enrichment for external captures.
 * Never writes to products / live_products — extraction only.
 */

import {
  fetchPageHTML,
  extractProductImageFromHTML,
  getRetailerPattern,
  extractWithSelectors,
} from "./scanner/retailer-extraction";
import { detectGarmentType } from "./scanner/detect-garment-type";
import {
  countryFromPage,
  extractLabeledMaterial,
  extractVisibleOffer,
  looksLikeListedMaterial,
  looksLikePercentageComposition,
  normalizeListedMaterial,
  preferRetailerFacingOffer,
} from "./capture-page-signals";

export type ProvenanceEntry = {
  source:
    | "json_ld"
    | "open_graph"
    | "meta"
    | "heuristics"
    | "retailer"
    | "url"
    | "catalog"
    | "openai_inferred";
  confidence: number;
  model?: string;
  at?: string;
};

export type MatchBrief = {
  mustMatch: string[];
  preferred: string[];
  flexible: string[];
  targetNaturalFiberImprovement: true;
  targetPriceRange: { min: number; max: number } | null;
  region: "us";
};

export type CaptureEnrichment = {
  title: string | null;
  brand: string | null;
  retailer: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  description: string | null;
  compositionText: string | null;
  /** ISO 3166-1 alpha-2 when the page locale or TLD is unambiguous. */
  country: string | null;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  pattern: string | null;
  silhouette: string | null;
  fit: string | null;
  length: string | null;
  distinctiveDetails: string[];
  provenance: Record<string, ProvenanceEntry>;
  matchBrief: MatchBrief;
  /** Internal: garment type key for getSmartAlternatives */
  garmentType: string | null;
};

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "") || null;
  } catch {
    return null;
  }
}

function setProv(
  provenance: Record<string, ProvenanceEntry>,
  key: string,
  source: ProvenanceEntry["source"],
  confidence: number,
  onlyIfMissing = true
) {
  if (onlyIfMissing && provenance[key]) return;
  provenance[key] = { source, confidence };
}

function metaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]*(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]?.trim()) return decodeEntities(m[1].trim());
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parsePriceValue(raw: unknown): { price: number | null; currency: string | null } {
  if (typeof raw === "number" && raw > 0) return { price: raw, currency: null };
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const amount = o.price ?? o.value ?? o.amount ?? o.lowPrice ?? o.highPrice;
    const cur = o.priceCurrency ?? o.currency;
    const parsed = parsePriceValue(amount);
    return {
      price: parsed.price,
      currency: typeof cur === "string" ? cur.toUpperCase() : parsed.currency,
    };
  }
  const s = String(raw || "").trim();
  if (!s) return { price: null, currency: null };
  let currency: string | null = null;
  if (/€/.test(s) || /\bEUR\b/i.test(s)) currency = "EUR";
  else if (/£/.test(s) || /\bGBP\b/i.test(s)) currency = "GBP";
  else if (/\$/.test(s) || /\bUSD\b/i.test(s)) currency = "USD";
  const cleaned = s.replace(/[^0-9.,]/g, "").replace(/,(?=\d{3}\b)/g, "");
  const normalized = cleaned.includes(",") && !cleaned.includes(".")
    ? cleaned.replace(",", ".")
    : cleaned.replace(/,/g, "");
  const num = parseFloat(normalized);
  return {
    price: Number.isFinite(num) && num > 0 ? num : null,
    currency,
  };
}

function extractJsonLdProducts(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const stack = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of stack) {
        if (!node || typeof node !== "object") continue;
        const n = node as Record<string, unknown>;
        const graph = n["@graph"];
        if (Array.isArray(graph)) {
          for (const g of graph) {
            if (g && typeof g === "object") stack.push(g);
          }
        }
        const type = String(n["@type"] || "").toLowerCase();
        if (type.includes("product") || n.offers) out.push(n);
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return out;
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return decodeEntities(v.trim());
    if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim()) {
      return decodeEntities(v[0].trim());
    }
    if (v && typeof v === "object" && "name" in (v as object)) {
      const name = (v as { name?: unknown }).name;
      if (typeof name === "string" && name.trim()) return decodeEntities(name.trim());
    }
  }
  return null;
}

function imageFromJsonLd(node: Record<string, unknown>): string | null {
  const img = node.image;
  if (typeof img === "string" && img.startsWith("http")) return img;
  if (Array.isArray(img)) {
    for (const i of img) {
      if (typeof i === "string" && i.startsWith("http")) return i;
      if (i && typeof i === "object" && typeof (i as { url?: string }).url === "string") {
        const u = (i as { url: string }).url;
        if (u.startsWith("http")) return u;
      }
    }
  }
  if (img && typeof img === "object" && typeof (img as { url?: string }).url === "string") {
    const u = (img as { url: string }).url;
    if (u.startsWith("http")) return u;
  }
  return null;
}

function offersOf(node: Record<string, unknown>): Record<string, unknown> | null {
  const offers = node.offers;
  if (!offers) return null;
  if (Array.isArray(offers)) return (offers[0] as Record<string, unknown>) || null;
  if (typeof offers === "object") return offers as Record<string, unknown>;
  return null;
}

const COLOR_WORDS = [
  "indigo",
  "denim",
  "black",
  "white",
  "ivory",
  "cream",
  "beige",
  "navy",
  "blue",
  "red",
  "green",
  "brown",
  "grey",
  "gray",
  "pink",
  "purple",
  "orange",
  "yellow",
  "camel",
  "tan",
  "olive",
  "burgundy",
  "rust",
  "khaki",
  "charcoal",
  "silver",
  "gold",
];

const PATTERN_WORDS = [
  "stripe",
  "striped",
  "plaid",
  "check",
  "checked",
  "floral",
  "print",
  "printed",
  "solid",
  "herringbone",
  "houndstooth",
  "polka",
  "dot",
  "animal",
  "leopard",
];

/**
 * Category correctness: stirrup pant → pants/trousers; never shoes.
 */
export function inferApparelAttributes(input: {
  title?: string | null;
  description?: string | null;
  categoryHint?: string | null;
}): {
  category: string | null;
  subcategory: string | null;
  color: string | null;
  pattern: string | null;
  silhouette: string | null;
  fit: string | null;
  length: string | null;
  distinctiveDetails: string[];
  garmentType: string | null;
} {
  const title = String(input.title || "");
  const description = String(input.description || "");
  const categoryHint = String(input.categoryHint || "");
  const text = `${title} ${description} ${categoryHint}`.toLowerCase();

  const distinctiveDetails: string[] = [];
  let category: string | null = null;
  let subcategory: string | null = null;
  let silhouette: string | null = null;
  let fit: string | null = null;
  let length: string | null = null;

  const mentionsPant =
    /\b(pant|pants|trouser|trousers|legging|leggings|culotte|culottes|jean|jeans|slack|slacks)\b/.test(
      text
    );
  const mentionsShoe =
    /\b(shoe|shoes|boot|boots|sneaker|sneakers|heel|heels|sandal|sandals|loafer|loafers|mule|mules)\b/.test(
      text
    );
  const isStirrupPant = /\bstirrup\b/.test(text) && mentionsPant;

  // Hard rule: stirrup pant / pants language wins over footwear false positives
  if (isStirrupPant || (mentionsPant && !mentionsShoe)) {
    category = "pants";
    subcategory = isStirrupPant
      ? "stirrup pant"
      : /\bjean/.test(text)
        ? "jeans"
        : /\blegging/.test(text)
          ? "leggings"
          : "trousers";
    if (isStirrupPant) {
      distinctiveDetails.push("stirrup");
      silhouette = "stirrup";
    }
  } else if (mentionsShoe && !mentionsPant) {
    // Do not treat as apparel pants; leave category null so Find Better won't shoe-match pants inspiration
    category = null;
  } else {
    const gt = detectGarmentType(title, categoryHint || description);
    if (gt === "trouser") {
      category = "pants";
      subcategory = "trousers";
    } else if (gt === "dress") {
      category = "dresses";
    } else if (gt === "skirt") {
      category = "skirts";
    } else if (gt === "top") {
      category = "tops";
    } else if (gt === "knitwear") {
      category = "knitwear";
    } else if (gt === "outerwear") {
      category = "outerwear";
    } else if (gt === "jumpsuit") {
      category = "jumpsuits";
    }
  }

  if (/\b(wide.?leg|flare|flared|straight|skinny|cigarette|bootcut|tapered|barrel|slip|boy(?:friend)?)\b/.test(text)) {
    const sil = text.match(
      /\b(wide.?leg|flare|flared|straight|skinny|cigarette|bootcut|tapered|barrel|slip|boy(?:friend)?)\b/
    );
    if (sil) silhouette = silhouette || sil[1].replace(/\s+/g, " ");
  }
  if (/\b(high\s*boy|boy(?:friend)?\s*fit)\b/.test(text)) {
    distinctiveDetails.push("boy fit");
    fit = fit || "boy fit";
  }
  if (/\b(slim|relaxed|oversized|tailored|regular|fitted|loose)\s*fit\b/.test(text)) {
    const f = text.match(/\b(slim|relaxed|oversized|tailored|regular|fitted|loose)\s*fit\b/);
    if (f) fit = f[0];
  } else if (/\b(high.?rise|mid.?rise|low.?rise)\b/.test(text)) {
    const f = text.match(/\b(high.?rise|mid.?rise|low.?rise)\b/);
    if (f) fit = f[1].replace(/\s+/g, " ");
  }
  if (/\b(full.?length|ankle|cropped|crop|petite|maxi|midi|mini)\b/.test(text)) {
    const l = text.match(/\b(full.?length|ankle|cropped|crop|petite|maxi|midi|mini)\b/);
    if (l) length = l[1].replace(/\s+/g, " ");
  }

  let color: string | null = null;
  for (const c of COLOR_WORDS) {
    if (new RegExp(`\\b${c}\\b`, "i").test(text)) {
      color = c === "indigo" || c === "denim" ? "blue" : c;
      break;
    }
  }
  let pattern: string | null = null;
  for (const p of PATTERN_WORDS) {
    if (new RegExp(`\\b${p}\\b`, "i").test(text)) {
      pattern = p;
      break;
    }
  }

  if (/\bribs?\b|\bribbed\b/.test(text)) distinctiveDetails.push("ribbed");
  if (/\bstretch\b/.test(text)) distinctiveDetails.push("stretch");
  if (/\belastic\b/.test(text)) distinctiveDetails.push("elastic");

  const garmentType =
    category === "pants" || category === "trousers"
      ? "trouser"
      : detectGarmentType(title, category || categoryHint);

  return {
    category,
    subcategory,
    color,
    pattern,
    silhouette,
    fit,
    length,
    distinctiveDetails: [...new Set(distinctiveDetails)],
    garmentType,
  };
}

export function buildMatchBrief(input: {
  category: string | null;
  subcategory: string | null;
  color: string | null;
  pattern: string | null;
  silhouette: string | null;
  fit: string | null;
  length: string | null;
  distinctiveDetails: string[];
  brand: string | null;
  price: number | null;
}): MatchBrief {
  const mustMatch: string[] = [];
  if (input.category === "pants" || input.category === "trousers" || input.subcategory?.includes("pant")) {
    mustMatch.push("trousers", "pants");
  } else if (input.category) {
    mustMatch.push(input.category);
  }
  if (input.subcategory && !mustMatch.includes(input.subcategory)) {
    // subcategory is preferred shape cue, not hard AND (except pants already covered)
  }

  const preferred: string[] = [];
  for (const v of [
    input.silhouette,
    input.fit,
    input.length,
    input.color,
    input.subcategory,
    ...input.distinctiveDetails,
  ]) {
    if (v && !preferred.includes(v) && !mustMatch.includes(v)) preferred.push(v);
  }

  const flexible: string[] = [];
  if (input.pattern) flexible.push(input.pattern);
  if (input.brand) flexible.push(input.brand);

  const targetPriceRange =
    input.price != null && input.price > 0
      ? { min: Math.round(input.price * 0.6 * 100) / 100, max: Math.round(input.price * 1.4 * 100) / 100 }
      : null;

  return {
    mustMatch,
    preferred,
    flexible,
    // Soft catalog preference — not the product definition of TX Match.
    // Price, silhouette, color, and details can rank a match even when NFP is already high.
    targetNaturalFiberImprovement: true,
    targetPriceRange,
    region: "us",
  };
}

function looksLikeComposition(text: string): boolean {
  return looksLikePercentageComposition(text) || looksLikeListedMaterial(text);
}

function cleanComposition(text: string): string {
  return normalizeListedMaterial(text)
    .replace(/\s*(hand wash|machine wash|dry clean|do not|wash cold|wash warm|straight cut|flowing hem|washable)[\s\S]*$/i, "")
    .trim();
}

function extractCompositionHeuristics(html: string): string | null {
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 40000);
  const re =
    /(\d+(?:\.\d+)?%\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s/-]*(?:,\s*\d+(?:\.\d+)?%\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s/-]*){0,6})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain))) {
    const candidate = cleanComposition(m[1]?.trim() || "");
    if (candidate && looksLikePercentageComposition(candidate)) return candidate;
  }
  const labeled = extractLabeledMaterial(html);
  return labeled ? cleanComposition(labeled) : null;
}

/**
 * Fetch product URL HTML and extract enrichment attributes.
 */
export async function enrichFromUrl(url: string): Promise<CaptureEnrichment> {
  const retailer = hostnameOf(url);
  const provenance: Record<string, ProvenanceEntry> = {};

  let html = "";
  try {
    html = await fetchPageHTML(url);
  } catch {
    html = "";
  }
  // fetchPageHTML already uses browser UA + 12s timeout; retry once with explicit headers if empty
  if (!html) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(12000),
        redirect: "follow",
      });
      if (res.ok) html = await res.text();
    } catch {
      html = "";
    }
  }

  let title: string | null = null;
  let brand: string | null = null;
  let price: number | null = null;
  let currency: string | null = null;
  let imageUrl: string | null = null;
  let description: string | null = null;
  let compositionText: string | null = null;
  let categoryHint: string | null = null;
  let country: string | null = null;

  // 1) Product JSON-LD
  const products = html ? extractJsonLdProducts(html) : [];
  for (const node of products) {
    if (!title) {
      title = firstString(node.name);
      if (title) setProv(provenance, "title", "json_ld", 0.95);
    }
    if (!brand) {
      brand = firstString(node.brand, (node.brand as { name?: string })?.name);
      // Leset (and similar) put fabric-group names like "Core" in JSON-LD brand
      if (brand && /^(core|essentials?|basics?|collection|studio|archive)$/i.test(brand)) {
        brand = null;
      }
      if (brand) setProv(provenance, "brand", "json_ld", 0.9);
    }
    if (!description) {
      description = firstString(node.description);
      if (description) setProv(provenance, "description", "json_ld", 0.85);
    }
    if (!imageUrl) {
      imageUrl = imageFromJsonLd(node);
      if (imageUrl) setProv(provenance, "imageUrl", "json_ld", 0.9);
    }
    if (!categoryHint) {
      categoryHint = firstString(node.category, node.productType);
    }
    const material = firstString(node.material, node.composition);
    if (material && looksLikeComposition(material)) {
      compositionText = cleanComposition(material);
      setProv(provenance, "compositionText", "json_ld", 0.9);
    }
    const offers = offersOf(node);
    if (offers && price == null) {
      const parsed = parsePriceValue(offers.price ?? offers.lowPrice);
      const cur =
        typeof offers.priceCurrency === "string"
          ? offers.priceCurrency.toUpperCase()
          : parsed.currency;
      if (parsed.price != null) {
        price = parsed.price;
        currency = cur || currency;
        setProv(provenance, "price", "json_ld", 0.95);
        if (currency) setProv(provenance, "currency", "json_ld", 0.9);
      }
    }
  }

  // 2) Open Graph
  if (html) {
    const siteName = metaContent(html, "og:site_name");
    if (!brand && siteName && siteName.length >= 2 && siteName.length < 40) {
      brand = siteName;
      setProv(provenance, "brand", "open_graph", 0.85);
    }
    const ogTitle = metaContent(html, "og:title");
    if (!title && ogTitle) {
      title = ogTitle;
      setProv(provenance, "title", "open_graph", 0.85);
    }
    const ogDesc = metaContent(html, "og:description");
    if (!description && ogDesc) {
      description = ogDesc;
      setProv(provenance, "description", "open_graph", 0.75);
    }
    const ogImage = metaContent(html, "og:image");
    if (!imageUrl && ogImage?.startsWith("http")) {
      imageUrl = ogImage;
      setProv(provenance, "imageUrl", "open_graph", 0.85);
    }
    const ogPrice =
      metaContent(html, "og:price:amount") ||
      metaContent(html, "product:price:amount");
    if (price == null && ogPrice) {
      const parsed = parsePriceValue(ogPrice);
      if (parsed.price != null) {
        price = parsed.price;
        setProv(provenance, "price", "open_graph", 0.8);
      }
    }
    const ogCur =
      metaContent(html, "og:price:currency") ||
      metaContent(html, "product:price:currency");
    if (!currency && ogCur) {
      currency = ogCur.toUpperCase();
      setProv(provenance, "currency", "open_graph", 0.8);
    }
  }

  // 3) Meta tags
  if (html) {
    const metaTitle = metaContent(html, "twitter:title") || metaContent(html, "title");
    if (!title && metaTitle) {
      title = metaTitle;
      setProv(provenance, "title", "meta", 0.7);
    }
    const metaDesc = metaContent(html, "description") || metaContent(html, "twitter:description");
    if (!description && metaDesc) {
      description = metaDesc;
      setProv(provenance, "description", "meta", 0.65);
    }
    if (!title) {
      const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (h1?.[1]) {
        title = decodeEntities(h1[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
        if (title) setProv(provenance, "title", "heuristics", 0.6);
      }
    }
    if (!title) {
      const docTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (docTitle?.[1]) {
        title = decodeEntities(docTitle[1].replace(/\s*[|\-–—].*$/, "").trim());
        if (title) setProv(provenance, "title", "meta", 0.55);
      }
    }
  }

  // 4) Retailer page heuristics
  if (html) {
    if (!imageUrl) {
      imageUrl = extractProductImageFromHTML(html);
      if (imageUrl) setProv(provenance, "imageUrl", "heuristics", 0.7);
    }
    const pattern = getRetailerPattern(url);
    if (pattern) {
      const extracted = extractWithSelectors(html, pattern);
      if (extracted) {
        if (!title && extracted.productName) {
          title = extracted.productName;
          setProv(provenance, "title", "retailer", 0.75);
        }
        if (!compositionText && extracted.composition && looksLikeComposition(extracted.composition)) {
          compositionText = cleanComposition(extracted.composition);
          setProv(provenance, "compositionText", "retailer", 0.8);
        }
        if (price == null && extracted.price) {
          const parsed = parsePriceValue(extracted.price);
          if (parsed.price != null) {
            price = parsed.price;
            currency = parsed.currency || currency;
            setProv(provenance, "price", "retailer", 0.7);
          }
        }
        if (!imageUrl && extracted.imageUrl) {
          imageUrl = extracted.imageUrl;
          setProv(provenance, "imageUrl", "retailer", 0.7);
        }
      }
    }
    if (!compositionText) {
      const heur = extractCompositionHeuristics(html);
      if (heur) {
        compositionText = heur;
        setProv(
          provenance,
          "compositionText",
          looksLikePercentageComposition(heur) ? "heuristics" : "retailer",
          looksLikePercentageComposition(heur) ? 0.55 : 0.75
        );
      }
    }

    const visibleOffer = extractVisibleOffer(html);
    const preferred = preferRetailerFacingOffer(
      { price, currency },
      visibleOffer
    );
    if (preferred.price != null && preferred.currency && preferred.currency !== currency) {
      price = preferred.price;
      currency = preferred.currency;
      setProv(provenance, "price", "retailer", 0.85, false);
      setProv(provenance, "currency", "retailer", 0.85, false);
    } else if (price != null && !currency && preferred.currency) {
      currency = preferred.currency;
      setProv(provenance, "currency", "retailer", 0.7);
    } else if (price == null && preferred.price != null) {
      price = preferred.price;
      currency = preferred.currency;
      setProv(provenance, "price", "retailer", 0.65);
      if (currency) setProv(provenance, "currency", "retailer", 0.65);
    }
    // Leset / generic brand from hostname when missing
    if (!brand && retailer) {
      const hostBrand = retailer.split(".")[0];
      if (hostBrand && hostBrand.length > 2 && !/shop|www|store|cdn/.test(hostBrand)) {
        brand = hostBrand.charAt(0).toUpperCase() + hostBrand.slice(1);
        setProv(provenance, "brand", "heuristics", 0.4);
      }
    }
  }

  if (html) {
    country = countryFromPage(html, retailer);
    if (country) setProv(provenance, "country", "meta", 0.7);
  }

  if (retailer) setProv(provenance, "retailer", "url", 1);

  imageUrl = canonicalizeCaptureImageUrl(imageUrl, url);

  // Color from image filename heuristics (e.g. ...BLACK_ONMODEL...)
  let colorFromImage: string | null = null;
  if (imageUrl) {
    const lower = imageUrl.toLowerCase();
    for (const c of COLOR_WORDS) {
      if (new RegExp(`(?:^|[_/-])${c}(?:[_/-]|\\.|$)`, "i").test(lower) || lower.includes(`_${c}_`)) {
        colorFromImage = c;
        break;
      }
    }
  }

  const apparel = inferApparelAttributes({
    title,
    description: [description, colorFromImage].filter(Boolean).join(" "),
    categoryHint,
  });
  if (!apparel.color && colorFromImage) {
    apparel.color = colorFromImage;
    setProv(provenance, "color", "heuristics", 0.5);
  }
  if (apparel.category) setProv(provenance, "category", "heuristics", 0.85);
  if (apparel.subcategory) setProv(provenance, "subcategory", "heuristics", 0.8);
  if (apparel.color) setProv(provenance, "color", "heuristics", 0.55);
  if (apparel.silhouette) setProv(provenance, "silhouette", "heuristics", 0.7);

  const matchBrief = buildMatchBrief({
    category: apparel.category,
    subcategory: apparel.subcategory,
    color: apparel.color,
    pattern: apparel.pattern,
    silhouette: apparel.silhouette,
    fit: apparel.fit,
    length: apparel.length,
    distinctiveDetails: apparel.distinctiveDetails,
    brand,
    price,
  });

  return {
    title,
    brand,
    retailer,
    price,
    currency: currency || null,
    imageUrl,
    description,
    compositionText,
    country,
    category: apparel.category,
    subcategory: apparel.subcategory,
    color: apparel.color,
    pattern: apparel.pattern,
    silhouette: apparel.silhouette,
    fit: apparel.fit,
    length: apparel.length,
    distinctiveDetails: apparel.distinctiveDetails,
    provenance,
    matchBrief,
    garmentType: apparel.garmentType,
  };
}

/** Attributes blob persisted on external_captures.attributes */
export function enrichmentToAttributes(e: CaptureEnrichment): Record<string, unknown> {
  return {
    title: e.title,
    brand: e.brand,
    retailer: e.retailer,
    price: e.price,
    currency: e.currency,
    imageUrl: e.imageUrl,
    description: e.description,
    compositionText: e.compositionText,
    country: e.country,
    category: e.category,
    subcategory: e.subcategory,
    color: e.color,
    pattern: e.pattern,
    silhouette: e.silhouette,
    fit: e.fit,
    length: e.length,
    distinctiveDetails: e.distinctiveDetails,
    garmentType: e.garmentType,
  };
}

function isHostnameLikeTitle(title: string | null | undefined, retailer: string | null | undefined): boolean {
  const t = String(title || "").trim().toLowerCase();
  if (!t) return true;
  const host = String(retailer || "").trim().toLowerCase().replace(/^www\./, "");
  if (host && (t === host || t === `www.${host}`)) return true;
  return /^[a-z0-9.-]+\.(com|co|net|org|io|shop)(\.[a-z]{2})?$/i.test(t);
}

/**
 * Enough structured signal for TX Match without OpenAI.
 * Composition is optional — never block matching on missing composition.
 */
export function enrichmentIsSufficient(e: CaptureEnrichment): boolean {
  if (isHostnameLikeTitle(e.title, e.retailer)) return false;
  if (!e.title || !e.imageUrl) return false;
  if (!e.brand && !e.retailer) return false;
  if (e.price == null) return false;
  if (!e.category && !e.garmentType) return false;
  return true;
}

export function materialStatusFromCompositionProvenance(
  provenance: Record<string, ProvenanceEntry>,
  compositionText: string | null | undefined
): "verified" | "source_page" | "ai_estimated" | "unknown" {
  if (!compositionText || !String(compositionText).trim()) return "unknown";
  const entry = provenance.compositionText;
  if (!entry) return "ai_estimated";
  if (entry.source === "catalog") return "verified";
  if (
    entry.source === "json_ld" ||
    entry.source === "open_graph" ||
    entry.source === "retailer" ||
    entry.source === "meta"
  ) {
    return "source_page";
  }
  // heuristics + openai_inferred → inferred, never verified
  return "ai_estimated";
}

export function mergeEnrichment(
  base: CaptureEnrichment,
  patch: Partial<CaptureEnrichment>,
  patchProvenance: Record<string, ProvenanceEntry>
): CaptureEnrichment {
  const out: CaptureEnrichment = { ...base, provenance: { ...base.provenance } };
  const fill = <K extends keyof CaptureEnrichment>(key: K) => {
    const current = out[key];
    const next = patch[key];
    const empty =
      current == null ||
      current === "" ||
      (Array.isArray(current) && current.length === 0);
    if (empty && next != null && next !== "") {
      (out as any)[key] = next;
      if (patchProvenance[String(key)]) {
        out.provenance[String(key)] = patchProvenance[String(key)];
      }
    }
  };
  fill("title");
  fill("brand");
  fill("price");
  fill("currency");
  fill("imageUrl");
  fill("description");
  fill("compositionText");
  fill("country");
  fill("category");
  fill("subcategory");
  fill("color");
  fill("pattern");
  fill("silhouette");
  fill("fit");
  fill("length");
  fill("garmentType");
  if (
    (!(out.distinctiveDetails?.length > 0) &&
      Array.isArray(patch.distinctiveDetails) &&
      patch.distinctiveDetails.length > 0)
  ) {
    out.distinctiveDetails = patch.distinctiveDetails;
    if (patchProvenance.distinctiveDetails) {
      out.provenance.distinctiveDetails = patchProvenance.distinctiveDetails;
    }
  }
  if (patch.matchBrief) {
    out.matchBrief = patch.matchBrief;
    if (patchProvenance.matchBrief) out.provenance.matchBrief = patchProvenance.matchBrief;
  }
  return out;
}

/** Compact page text for AI fallback (optional). */
export function pageTextSnippetFromHtml(html: string): string {
  if (!html) return "";
  const og: string[] = [];
  const metaRegex =
    /<meta[^>]*(?:property|name)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRegex.exec(html)) !== null) {
    og.push(`${m[1]}=${m[2]}`);
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4500);
  return [`Title: ${title}`, og.length ? `Meta: ${og.slice(0, 40).join(", ")}` : "", body]
    .filter(Boolean)
    .join("\n\n");
}

/** True when a URL looks like a real product image (not an HTML PDP). */
export function isUsableCaptureImageUrl(
  raw: string | null | undefined,
  pageUrl?: string | null
): boolean {
  const value = String(raw || "").trim();
  if (!value || !/^https?:\/\//i.test(value)) return false;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return false;
  }
  if (pageUrl) {
    try {
      const page = new URL(pageUrl);
      if (u.href.split("#")[0] === page.href.split("#")[0]) return false;
      if (u.pathname === page.pathname && u.hostname === page.hostname) return false;
    } catch {
      /* ignore */
    }
  }
  const path = u.pathname.toLowerCase();
  if (/\.(html?|php|aspx?)(?:$|\?)/i.test(path)) return false;
  if (/\/(products?|shop|pdp|item)\//i.test(path) && !/\.(jpe?g|png|webp|gif|avif)(?:$|\?)/i.test(path)) {
    // Likely a product page path without an image extension
    if (!/\/(image|images|photos|media|cdn|static|dw\/image|variants\/images)\//i.test(path)) {
      return false;
    }
  }
  return true;
}

/**
 * Retailer-specific image URL rewrites for CDNs that hotlink-block common media hosts.
 */
export function canonicalizeCaptureImageUrl(
  raw: string | null | undefined,
  pageUrl?: string | null
): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;

  // Net-a-Porter / MR Porter media host often fails in-app; variants path works.
  const nap = value.match(
    /(?:media\.)?(?:www\.)?net-a-porter\.com\/photos\/(\d{10,})/i
  ) || value.match(/net-a-porter\.com\/(?:[^/]+\/)*photos\/(\d{10,})/i);
  if (nap?.[1]) {
    return `https://www.net-a-porter.com/variants/images/${nap[1]}/in/w800.jpg`;
  }
  const napIdFromPage = String(pageUrl || "").match(/\/(\d{14,})(?:\/|$|\?)/);
  if (/net-a-porter\.com/i.test(value) && napIdFromPage?.[1] && !/\/variants\/images\//i.test(value)) {
    return `https://www.net-a-porter.com/variants/images/${napIdFromPage[1]}/in/w800.jpg`;
  }

  if (!isUsableCaptureImageUrl(value, pageUrl)) return null;
  return value;
}

/** Prefer a newly extracted image over a bad/stale stored one. */
export function preferCaptureImageUrl(
  existing: string | null | undefined,
  next: string | null | undefined,
  pageUrl?: string | null
): string | null {
  const cleanedNext = canonicalizeCaptureImageUrl(next, pageUrl);
  const cleanedExisting = canonicalizeCaptureImageUrl(existing, pageUrl);
  if (cleanedExisting && isUsableCaptureImageUrl(cleanedExisting, pageUrl)) {
    // Upgrade NAP media → variants even when existing looked "usable"
    if (cleanedNext && cleanedNext !== existing) return cleanedNext;
    return cleanedExisting;
  }
  return cleanedNext;
}

