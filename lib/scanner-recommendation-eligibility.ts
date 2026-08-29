/**
 * Scanner recommendation guards — parity with iOS ScannerService eligibility.
 * Keeps server /api/recommend/products aligned with on-device filters without
 * changing the API contract.
 */
import { consumerExclusionForProduct } from "./catalog-consumer-guard";
import { parseCompositionParts } from "./catalog-product-filters";
import type { Product } from "./supabase-server";

const EXCLUDED_PHRASES = [
  "napkin",
  "table linen",
  "tablecloth",
  "placemat",
  "tea towel",
  "dish towel",
  "bath towel",
  "hand towel",
  "bedding",
  "bed linen",
  "duvet",
  "pillow",
  "blanket",
  "throw blanket",
  "curtain",
  "rug",
  "bath mat",
  "homeware",
  "home ware",
  "kitchen",
  "upholstery",
  "christmas stocking",
  "boho stocking",
  "ornament",
  "hosiery",
  "cushion",
  "sham",
  "decorative throw",
  "pet bed",
  "dog bed",
  "dog coat",
  "dog sweater",
  "pet sweater",
  "collar",
  "leash",
  "harness",
  "phone case",
  "watch strap",
  "keyring",
  "key ring",
  "stationery",
];

const BLOCKED_SCANNER_CATEGORY_TERMS = [
  "accessories",
  "accessory",
  "bag",
  "bags",
  "jewel",
  "jewelry",
  "jewellery",
  "gift",
  "gifts",
  "pet",
  "pets",
  "home",
  "homeware",
  "garden",
  "decor",
  "neckwear",
  "tie",
  "ties",
  "hosiery",
  "beauty",
  "fragrance",
  "tech",
  "watch",
  "watches",
  "phone",
  "stationery",
  "book",
  "toy",
  "toys",
  "furniture",
  "lighting",
  "kitchen",
  "bedding",
  "bath",
  "lifestyle",
  "candle",
  "candles",
  "wellness",
  "supplement",
];

const ALLOWED_GARMENT_CATEGORY_HINTS = [
  "dress",
  "top",
  "knit",
  "trouser",
  "pant",
  "jean",
  "skirt",
  "outerwear",
  "coat",
  "jacket",
  "blazer",
  "jumpsuit",
  "lingerie",
  "swim",
  "shoe",
  "footwear",
  "sneaker",
  "boot",
  "sandal",
  "short",
  "legging",
  "jogger",
  "activewear",
  "sportswear",
  "loungewear",
  "sleepwear",
  "nightwear",
  "bodysuit",
  "suit",
  "coord",
  "set",
  "shirt",
  "blouse",
  "tee",
  "tank",
  "cardigan",
  "sweater",
  "pullover",
  "hoodie",
  "gown",
  "romper",
  "playsuit",
  "bikini",
  "cover-up",
  "apparel",
  "clothing",
  "wear",
  "denim",
];

const FIBER_ALIASES: Record<string, string[]> = {
  polyamide: ["nylon"],
  nylon: ["polyamide"],
  elastane: ["spandex", "lycra"],
  spandex: ["elastane", "lycra"],
  lyocell: ["tencel"],
  tencel: ["lyocell"],
  viscose: ["rayon", "cupro", "modal"],
  rayon: ["viscose"],
};

function normFiber(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function primaryFiberFromComposition(composition: string): string {
  const parts = parseCompositionParts(composition);
  if (parts.length === 0) return "";
  const sorted = [...parts].sort((a, b) => b.percent - a.percent);
  return normFiber(sorted[0]?.fiber || "");
}

function isPetProduct(product: Product): boolean {
  const text = `${product.category || ""} ${product.name || ""} ${product.brandName || ""}`.toLowerCase();
  if (text.includes("petite")) return false;
  if (
    /\b(pet|pets|dog|dogs|puppy|puppies|canine|cat|cats|kitten|kittens|feline|pet coat|pet sweater|dog sweater|dog coat|for dogs|for pets|pet apparel|pet clothing|dog apparel)\b/.test(
      text
    )
  ) {
    return true;
  }
  const petBrands = ["chilly dogs", "pet life", "frisco", "gooby", "wild one", "maxbone"];
  return petBrands.some((brand) => text.includes(brand));
}

function isNonGarmentScannerProduct(product: Product): boolean {
  const cat = String(product.category || "").toLowerCase();
  const nameLower = String(product.name || "").toLowerCase();
  const brandLower = String(product.brandName || "").toLowerCase();
  const urlLower = String(product.url || "").toLowerCase();

  if (nameLower.includes("jamzez")) return true;
  if (urlLower.includes("/tie/") || urlLower.includes("/ties/") || urlLower.includes("/necktie")) {
    return true;
  }
  if (cat.includes("tie") || cat.includes("neckwear")) return true;
  if (/\b(tie|necktie|bow tie|bowtie|cravat|cufflink|cufflinks)\b/.test(nameLower)) return true;
  if (brandLower.includes("ted baker") && (cat.includes("accessories") || cat.includes("accessory"))) {
    return true;
  }
  if (BLOCKED_SCANNER_CATEGORY_TERMS.some((term) => cat.includes(term))) return true;

  const nonGarmentNameTerms = [
    "pillow",
    "cushion",
    "duvet",
    "tablecloth",
    "napkin",
    "ornament",
    "dog bed",
    "pet bed",
    "dog coat",
    "pet coat",
    " for dogs",
    " for pets",
    "phone case",
    "watch strap",
    "keyring",
    "key ring",
    "scented candle",
  ];
  return nonGarmentNameTerms.some((term) => nameLower.includes(term));
}

function isScannerGarmentCategory(category?: string | null, name?: string | null): boolean {
  const cat = String(category || "").trim().toLowerCase();
  const nameLower = String(name || "").toLowerCase();

  if (BLOCKED_SCANNER_CATEGORY_TERMS.some((term) => cat.includes(term))) return false;
  if (cat) return ALLOWED_GARMENT_CATEGORY_HINTS.some((hint) => cat.includes(hint));
  return ALLOWED_GARMENT_CATEGORY_HINTS.some((hint) => nameLower.includes(hint));
}

function looksLikeFootwear(text: string): boolean {
  return /\b(sneaker|sneakers|shoe|shoes|boot|boots|sandal|sandals|loafer|loafers)\b/.test(text);
}

/** Garment-only scanner rail — mirrors iOS isEligibleScannerRecommendation. */
export function isScannerEligibleRecommendation(product: Product): boolean {
  if (consumerExclusionForProduct(product)) return false;
  if (isPetProduct(product)) return false;
  if (isNonGarmentScannerProduct(product)) return false;
  if (!isScannerGarmentCategory(product.category, product.name)) return false;

  const category = String(product.category || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();
  const brand = String(product.brandName || "").toLowerCase();
  const text = `${category} ${name} ${brand}`;

  if (category.includes("home") || category.includes("garden") || category.includes("decor")) {
    return false;
  }
  if (EXCLUDED_PHRASES.some((phrase) => text.includes(phrase))) return false;

  if (!looksLikeFootwear(text) && /\b(socks?|stockings?|tights|pantyhose|anklets?)\b/.test(text)) {
    return false;
  }

  return true;
}

function fiberTokens(fiber: string): string[] {
  const normalized = normFiber(fiber);
  if (!normalized) return [];
  const tokens = new Set<string>([normalized]);
  for (const alias of FIBER_ALIASES[normalized] || []) {
    tokens.add(alias);
  }
  if (normalized.includes(" ")) {
    tokens.add(normalized.split(/\s+/)[0]!);
  }
  return [...tokens];
}

/** True when scanned fiber appears in composition — mirrors iOS matchesScanFiber. */
export function matchesScanFiber(product: Product, detectedFiber: string): boolean {
  const detected = normFiber(detectedFiber);
  if (!detected) return true;

  const composition = String(product.composition || "").toLowerCase();
  const tokens = fiberTokens(detected);
  if (tokens.some((token) => composition.includes(token))) return true;

  const primary = primaryFiberFromComposition(composition);
  if (primary && tokens.some((token) => primary === token || primary.includes(token))) {
    return true;
  }

  const haystack = `${product.category || ""} ${product.name || ""}`.toLowerCase();
  return tokens.some((token) => haystack.includes(token));
}

/** Catalog rows must share the scan fiber; favorites bypass this in rankMix. */
export function isScannerCatalogPick(product: Product, detectedFiber: string): boolean {
  return isScannerEligibleRecommendation(product) && matchesScanFiber(product, detectedFiber);
}

/** Back-compat alias used by older imports. */
export function isEligibleRecommendation(product: Product): boolean {
  return isScannerEligibleRecommendation(product);
}
