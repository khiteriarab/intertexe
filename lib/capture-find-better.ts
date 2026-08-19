/**
 * Find Better / TX Match — ranked INTERTEXE catalog alternatives for an enriched capture.
 * Reads verified catalog via catalog_browse_page_v2.
 * Never writes to products / live_products.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaptureEnrichment, MatchBrief } from "./capture-enrichment";
import { buildCatalogBrowseV2Params } from "./catalog-browse-v2";
import { productMatchesHardCategory } from "./catalog-shop-mappings";
import {
  filterProductsForIntegrity,
  integritySpecFromBrowseOpts,
  type FilterIntegrityProduct,
} from "./catalog-filter-integrity";
import { compositionHasSyntheticLining, normalizeCompositionStorage } from "./composition-display";
import { fetchTastePreferences } from "./taste-preferences";

export type FindBetterAlternative = {
  id: string;
  name: string;
  brand_name: string | null;
  brand_slug: string | null;
  image_url: string | null;
  price: number | string | null;
  currency: string | null;
  composition: string | null;
  natural_fiber_percent: number | null;
  category: string | null;
  why: string;
};

export type FindBetterInput = {
  title?: string | null;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  compositionText?: string | null;
  category?: string | null;
  subcategory?: string | null;
  garmentType?: string | null;
  naturalFiberPercent?: number | null;
  matchBrief?: MatchBrief | null;
  distinctiveDetails?: string[];
  color?: string | null;
  silhouette?: string | null;
  fit?: string | null;
  length?: string | null;
  region?: string | null;
  userId?: string | null;
  preferredFibers?: string[];
  preferredDesigners?: string[];
  preferredSilhouettes?: string[];
  userPriceMin?: number | null;
  userPriceMax?: number | null;
};

export type LookFamily =
  | "jeans"
  | "sweat"
  | "leggings"
  | "shorts"
  | "trousers"
  | "dress"
  | "skirt"
  | "top"
  | "knitwear"
  | "outerwear"
  | "jumpsuit"
  | "shoes"
  | "other";

const SHOE_RE =
  /\b(shoe|shoes|boot|boots|sneaker|sneakers|heel|heels|sandal|sandals|loafer|footwear)\b/i;

/** Map enrichment garment/category tokens → shop browse category slug. */
const GARMENT_TO_BROWSE_CATEGORY: Record<string, string> = {
  trouser: "trousers",
  trousers: "trousers",
  pant: "trousers",
  pants: "trousers",
  bottom: "trousers",
  bottoms: "trousers",
  dress: "dresses",
  dresses: "dresses",
  skirt: "skirts",
  skirts: "skirts",
  top: "tops",
  tops: "tops",
  tee: "tops",
  tshirt: "tops",
  "t-shirt": "tops",
  blouse: "tops",
  shirt: "tops",
  shirts: "tops",
  knitwear: "knitwear",
  sweater: "knitwear",
  cardigan: "knitwear",
  outerwear: "outerwear",
  coat: "outerwear",
  jacket: "outerwear",
  jumpsuit: "jumpsuits",
  jumpsuits: "jumpsuits",
  romper: "jumpsuits",
  shoe: "shoes",
  shoes: "shoes",
  footwear: "shoes",
};

export function lookFamilyFromText(text: string | null | undefined): LookFamily | null {
  const t = String(text || "").toLowerCase();
  if (!t.trim()) return null;
  if (/\b(sweatpants?|sweat\s*pants?|joggers?|track\s*pants?)\b/.test(t)) return "sweat";
  if (/\bleggings?\b/.test(t)) return "leggings";
  if (/\bshorts?\b/.test(t) && !/\bjean/.test(t)) return "shorts";
  if (/\b(jeans?|denim|vaqueros?|tejanos?)\b/.test(t) || /\bfabric_construction:\s*denim\b/.test(t)) {
    return "jeans";
  }
  if (/\b(chino|slacks?|trousers?|\bpants?\b)\b/.test(t)) return "trousers";
  if (/\b(dress|gown)\b/.test(t)) return "dress";
  if (/\bskirt\b/.test(t)) return "skirt";
  if (/\b(coat|jacket|blazer|outerwear)\b/.test(t)) return "outerwear";
  if (/\b(sweater|cardigan|knitwear|pullover)\b/.test(t)) return "knitwear";
  if (/\b(jumpsuit|romper|playsuit)\b/.test(t)) return "jumpsuit";
  if (/\b(blouse|t-?shirt|tee|tank|camisole|top|shirt)\b/.test(t)) return "top";
  if (SHOE_RE.test(t)) return "shoes";
  return null;
}

export function lookFamilyFromInput(input: FindBetterInput): LookFamily | null {
  return (
    lookFamilyFromText(
      [
        input.subcategory,
        input.title,
        input.garmentType,
        input.category,
        ...(input.matchBrief?.mustMatch || []),
        ...(input.matchBrief?.preferred || []),
      ]
        .filter(Boolean)
        .join(" ")
    ) || (isPantsInspiration(input) ? "trousers" : null)
  );
}

export function lookFamilyFromProduct(product: Record<string, unknown>): LookFamily | null {
  const construction = String(product.fabric_construction || "").toLowerCase();
  if (construction === "denim") return "jeans";
  const named = lookFamilyFromText(
    `${product.name || ""} ${product.category || ""} ${product.garment_type || ""} ${construction}`
  );
  if (named) return named;
  const gt = `${product.garment_type || ""} ${product.category || ""}`.toLowerCase();
  if (/\b(jean|denim)\b/.test(gt) || /jean|denim/.test(gt)) return "jeans";
  if (/pant|trouser/.test(gt)) return "trousers";
  if (/dress/.test(gt)) return "dress";
  if (/skirt/.test(gt)) return "skirt";
  return null;
}

function isPantsInspiration(input: FindBetterInput): boolean {
  const cat = `${input.category || ""} ${input.subcategory || ""} ${input.garmentType || ""}`.toLowerCase();
  const must = (input.matchBrief?.mustMatch || []).join(" ").toLowerCase();
  const title = (input.title || "").toLowerCase();
  return (
    /\b(pant|pants|trouser|trousers|jean|jeans|denim)\b/.test(cat) ||
    /\b(pant|pants|trouser|trousers|jean|jeans|denim)\b/.test(must) ||
    /\b(pant|pants|trouser|trousers|jean|jeans)\b/.test(title) ||
    input.garmentType === "trouser"
  );
}

function browseCategoryFor(input: FindBetterInput): string | null {
  if (isPantsInspiration(input)) return "trousers";
  const candidates = [
    input.garmentType,
    input.subcategory,
    input.category,
    input.title,
    ...(input.matchBrief?.mustMatch || []),
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim());

  for (const key of candidates) {
    if (GARMENT_TO_BROWSE_CATEGORY[key]) return GARMENT_TO_BROWSE_CATEGORY[key];
    // Partial: "Women's Tops" → tops
    for (const [token, slug] of Object.entries(GARMENT_TO_BROWSE_CATEGORY)) {
      if (key.includes(token)) return slug;
    }
  }
  return null;
}

/**
 * Hard category gate only — matchBrief.mustMatch is preference/ranking, not a hard AND.
 * Rule: never return shoes for apparel inspiration; require garment-family match.
 */
function matchesHardCategory(product: Record<string, unknown>, input: FindBetterInput): boolean {
  const browseCat = browseCategoryFor(input);
  const row = {
    category: product.category != null ? String(product.category) : null,
    name: product.name != null ? String(product.name) : null,
    garment_type: product.garment_type != null ? String(product.garment_type) : null,
  };
  if (browseCat) {
    return productMatchesHardCategory(row, browseCat);
  }
  const hay = `${row.name || ""} ${row.category || ""}`.toLowerCase();
  return !SHOE_RE.test(hay);
}

function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number" && raw > 0) return raw;
  if (typeof raw === "string") {
    const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function whyFor(
  product: Record<string, unknown>,
  input: FindBetterInput,
  scannedNfp: number
): string {
  const parts: string[] = [];
  const nfp = Number(product.natural_fiber_percent) || 0;
  const price = parsePrice(product.price);
  const target = input.price;

  const fiber = preferredFiberFromInput(input);
  if (fiber && productMatchesFiber(product, fiber)) {
    parts.push(`Same fabric (${fiber})`);
  }

  const look = lookFamilyFromInput(input);
  const productLook = lookFamilyFromProduct(product);
  if (look && productLook === look) {
    parts.push(look === "jeans" ? "Same garment type (jeans)" : `Same garment type (${look})`);
  } else if (isPantsInspiration(input)) parts.push("Same garment type (trousers/pants)");
  else if (browseCategoryFor(input)) parts.push(`Same category (${browseCategoryFor(input)})`);

  if (productMatchesColor(product, input.color)) {
    parts.push(`Same color (${normalizeColorToken(input.color!)})`);
  }

  const sil = input.silhouette || input.subcategory;
  if (
    sil &&
    String(product.name || "")
      .toLowerCase()
      .includes(String(sil).toLowerCase().split(" ")[0])
  ) {
    parts.push("Similar silhouette");
  }

  if (price != null && target != null && target > 0) {
    const savings = target - price;
    if (savings >= 50) parts.push(`$${Math.round(savings)} less`);
    else {
      const diff = Math.abs(price - target) / target;
      if (diff <= 0.4) parts.push("Similar price band");
    }
  }

  if (nfp >= 90 && !compositionHasSyntheticLining(String(product.composition || ""))) {
    parts.push(`${Math.round(nfp)}% natural fiber`);
  } else if (compositionHasSyntheticLining(String(product.composition || ""))) {
    parts.push("Synthetic lining disclosed");
  } else if (scannedNfp > 0 && nfp > scannedNfp + 5) {
    parts.push("Higher natural fiber than original");
  } else if (nfp >= 80) parts.push("Verified natural fiber");

  if (parts.length === 0) parts.push("Strong INTERTEXE match for this look");
  return parts.slice(0, 3).join(" · ");
}

function toAlternative(
  product: Record<string, unknown>,
  input: FindBetterInput,
  scannedNfp: number
): FindBetterAlternative {
  return {
    id: String(product.id),
    name: String(product.name || ""),
    brand_name: (product.brand_name as string) || null,
    brand_slug: (product.brand_slug as string) || null,
    image_url: (product.image_url as string) || null,
    price: (product.price as number | string) ?? null,
    currency: (product.currency as string) || "USD",
    composition: normalizeCompositionStorage(String(product.composition || "")) || (product.composition as string) || null,
    natural_fiber_percent:
      product.natural_fiber_percent != null ? Number(product.natural_fiber_percent) : null,
    category: (product.category as string) || null,
    why: whyFor(product, input, scannedNfp),
  };
}

function normalizeColorToken(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/** True when catalog product color/name aligns with the inspiration color. */
function productMatchesColor(
  product: Record<string, unknown>,
  inputColor: string | null | undefined
): boolean {
  const color = normalizeColorToken(inputColor || "");
  if (color.length < 3) return false;
  const stop = new Set([
    "wash",
    "cali",
    "soft",
    "dark",
    "light",
    "medium",
    "bright",
    "pale",
    "deep",
    "vintage",
    "perfect",
    "heathered",
    "washed",
    "the",
    "and",
    "with",
  ]);
  const known = new Set([
    "black",
    "white",
    "ivory",
    "cream",
    "beige",
    "brown",
    "tan",
    "camel",
    "navy",
    "blue",
    "indigo",
    "denim",
    "green",
    "olive",
    "red",
    "burgundy",
    "pink",
    "rose",
    "purple",
    "lilac",
    "yellow",
    "gold",
    "orange",
    "grey",
    "gray",
    "silver",
    "metallic",
  ]);
  const tokens = color
    .split(" ")
    .filter((t) => t.length >= 3 && !stop.has(t))
    .map((t) => (t === "denim" || t === "indigo" ? "blue" : t));
  const primary = tokens.filter((t) => known.has(t));
  const hay = `${product.color || ""} ${product.name || ""}`.toLowerCase();
  // Prefer exact/full phrase, then known color tokens only (avoid "wash"/"cali" false hits).
  if (hay.includes(color)) return true;
  if (primary.length) return primary.some((t) => hay.includes(t));
  return tokens.some((t) => hay.includes(t));
}

const NATURAL_FIBERS = [
  "silk",
  "cashmere",
  "linen",
  "wool",
  "cotton",
  "leather",
  "merino",
] as const;

const SYNTHETIC_FIBERS = new Set([
  "viscose",
  "polyester",
  "polyamide",
  "nylon",
  "acrylic",
  "elastane",
  "spandex",
  "rayon",
  "acetate",
]);

const TITLE_FIBER_HINTS: Array<[RegExp, string]> = [
  [/\bsilk\b/, "silk"],
  [/\bcharmeuse\b/, "silk"],
  [/\bchiffon\b/, "silk"],
  [/\bsatin\b/, "silk"],
  [/\bcashmere\b/, "cashmere"],
  [/\blinen\b/, "linen"],
  [/\bwool\b/, "wool"],
  [/\bmerino\b/, "wool"],
  [/\bcotton\b/, "cotton"],
  [/\bdenim\b/, "cotton"],
  [/\bjeans?\b/, "cotton"],
  [/\bvaqueros?\b/, "cotton"],
  [/\balgod[oó]n\b/, "cotton"],
  [/\bleather\b/, "leather"],
  [/\bsuede\b/, "leather"],
];

export function extractFiberFromText(text: string | null | undefined): string | null {
  const lower = String(text || "").toLowerCase();
  if (!lower.trim()) return null;
  for (const f of NATURAL_FIBERS) {
    if (new RegExp(`\\b${f}\\b`).test(lower)) return f === "merino" ? "wool" : f;
  }
  for (const [re, fiber] of TITLE_FIBER_HINTS) {
    if (re.test(lower)) return fiber;
  }
  for (const f of SYNTHETIC_FIBERS) {
    if (new RegExp(`\\b${f}\\b`).test(lower)) return f;
  }
  return null;
}

/** Fabric the shopper is looking at — same-fiber matches must lead the list. */
export function preferredFiberFromInput(input: FindBetterInput): string | null {
  const fromComposition = extractFiberFromText(input.compositionText);
  if (fromComposition && !SYNTHETIC_FIBERS.has(fromComposition)) return fromComposition;
  for (const token of [...(input.matchBrief?.mustMatch || []), ...(input.matchBrief?.preferred || [])]) {
    const f = extractFiberFromText(token);
    if (f && !SYNTHETIC_FIBERS.has(f)) return f;
  }
  const fromTitle = extractFiberFromText(input.title);
  if (fromTitle && !SYNTHETIC_FIBERS.has(fromTitle)) return fromTitle;
  for (const d of input.distinctiveDetails || []) {
    const f = extractFiberFromText(d);
    if (f && !SYNTHETIC_FIBERS.has(f)) return f;
  }
  const userPref = (input.preferredFibers || [])
    .map((f) => extractFiberFromText(f))
    .find((f) => f && !SYNTHETIC_FIBERS.has(f));
  if (userPref) return userPref;
  if (fromComposition && SYNTHETIC_FIBERS.has(fromComposition)) return "silk";
  return null;
}

export function productMatchesFiber(
  product: Record<string, unknown>,
  fiber: string | null | undefined
): boolean {
  if (!fiber) return false;
  const f = fiber.toLowerCase();
  const hay = `${product.composition || ""} ${product.material_primary || ""} ${product.shop_material_family || ""} ${product.name || ""} ${product.fabric_construction || ""}`.toLowerCase();
  if (f === "wool") return /\b(wool|merino)\b/.test(hay);
  if (f === "cotton") return /\b(cotton|algod[oó]n|denim|jeans?|vaqueros?)\b/.test(hay);
  return new RegExp(`\\b${f}\\b`).test(hay);
}

export function preferredColorFromInput(input: FindBetterInput): string | null {
  const explicit = normalizeColorToken(input.color || "");
  if (explicit === "denim" || explicit === "indigo") return "blue";
  if (explicit.length >= 3 && productMatchesColor({ name: explicit, color: explicit }, explicit)) {
    return explicit;
  }
  const fromTitle = colorHintFromTitle(`${input.title || ""} ${(input.distinctiveDetails || []).join(" ")}`);
  if (fromTitle) return fromTitle;
  if (lookFamilyFromInput(input) === "jeans") return "blue";
  return null;
}

export function rankTxMatchAlternatives(
  products: Record<string, unknown>[],
  input: FindBetterInput
): FindBetterAlternative[] {
  return rankAlternatives(products, input);
}

function rankAlternatives(
  products: Record<string, unknown>[],
  input: FindBetterInput
): FindBetterAlternative[] {
  const scannedNfp = input.naturalFiberPercent ?? 0;
  const preferredFiber = preferredFiberFromInput(input);
  const preferredColor = preferredColorFromInput(input);
  const sourceLook = lookFamilyFromInput(input);
  const targetPrice =
    input.price ??
    (input.matchBrief?.targetPriceRange
      ? (input.matchBrief.targetPriceRange.min + input.matchBrief.targetPriceRange.max) / 2
      : null);

  const filtered = products.filter((p) => matchesHardCategory(p, input));

  const scored = filtered.map((p) => {
    let score = 0;
    const nfp = Number(p.natural_fiber_percent) || 0;
    const sameFiber = productMatchesFiber(p, preferredFiber);
    const productLook = lookFamilyFromProduct(p);
    const sameLook = Boolean(sourceLook && productLook === sourceLook);
    const sameColor = productMatchesColor(p, preferredColor);
    // Fabric of the saved piece leads. Do not let cheaper cotton outrank silk.
    if (sameFiber) score += 120;
    else if (preferredFiber) score -= 25;
    if (sameLook) score += 90;
    else if (sourceLook === "jeans" && (productLook === "sweat" || productLook === "leggings")) {
      score -= 80;
    } else if (sourceLook && productLook && productLook !== sourceLook) {
      score -= 12;
    }
    if (compositionHasSyntheticLining(String(p.composition || ""))) score -= 22;

    const userFibers = (input.preferredFibers || []).map((f) => extractFiberFromText(f)).filter(Boolean);
    if (userFibers.some((f) => productMatchesFiber(p, f))) score += 18;
    const brand = String(p.brand_name || "").toLowerCase();
    if (
      (input.preferredDesigners || []).some((d) => {
        const token = String(d || "").toLowerCase().trim();
        return token && (brand.includes(token) || token.includes(brand));
      })
    ) {
      score += 16;
    }

    score += Math.min(nfp, 100) * 0.2;
    const price = parsePrice(p.price);
    if (targetPrice != null && price != null && targetPrice > 0) {
      const diff = Math.abs(price - targetPrice) / targetPrice;
      if (diff <= 0.25) score += 36;
      else if (diff <= 0.45) score += 22;
      else if (diff <= 0.7) score += 8;
      else score -= 10;
      // Cheaper is a bonus only inside the same fabric — never a reason to switch fiber.
      if (sameFiber && targetPrice - price >= 50) score += 10;
    }
    if (input.userPriceMax != null && price != null && price > input.userPriceMax) score -= 20;
    if (sameColor) score += 50;
    const hay = `${p.name || ""} ${p.category || ""} ${p.color || ""}`.toLowerCase();
    if (input.silhouette) {
      const sil = String(input.silhouette).toLowerCase().split(/\s+/)[0];
      if (sil && hay.includes(sil)) score += 24;
    }
    for (const sil of input.preferredSilhouettes || []) {
      if (sil && hay.includes(String(sil).toLowerCase())) score += 14;
    }
    for (const pref of input.matchBrief?.preferred || []) {
      if (pref && hay.includes(pref.toLowerCase())) score += 8;
    }
    for (const must of input.matchBrief?.mustMatch || []) {
      if (must && hay.includes(must.toLowerCase())) score += 15;
    }
    for (const d of input.distinctiveDetails || []) {
      if (d && hay.includes(d.toLowerCase())) score += 12;
    }
    return { p, score, sameColor, sameFiber, sameLook, productLook };
  });

  scored.sort(
    (a, b) =>
      Number(b.sameLook) - Number(a.sameLook) ||
      Number(b.sameFiber) - Number(a.sameFiber) ||
      Number(b.sameColor) - Number(a.sameColor) ||
      b.score - a.score ||
      (Number(b.p.natural_fiber_percent) || 0) - (Number(a.p.natural_fiber_percent) || 0)
  );

  // First 5: what the shopper is looking at (same garment + fabric + color).
  // Remaining slots: other same-look pieces, then adjacent taste-aware picks.
  const used = new Set<string>();
  const lead: typeof scored = [];
  const take = (pred: (row: (typeof scored)[number]) => boolean, n: number) => {
    for (const row of scored) {
      if (lead.length >= n) break;
      const id = String(row.p.id);
      if (used.has(id) || !pred(row)) continue;
      used.add(id);
      lead.push(row);
    }
  };
  take((s) => s.sameLook && s.sameFiber && s.sameColor, 5);
  take((s) => s.sameLook && s.sameFiber, 5);
  take((s) => s.sameLook, 5);
  take((s) => s.sameFiber, 5);

  const rest = scored
    .filter((s) => !used.has(String(s.p.id)))
    .sort((a, b) => {
      const adj = (row: (typeof scored)[number]) => {
        if (row.sameLook) return 2;
        if (sourceLook === "jeans" && row.productLook === "trousers") return 1;
        if (sourceLook === "jeans" && (row.productLook === "sweat" || row.productLook === "leggings")) {
          return -1;
        }
        return 0;
      };
      return adj(b) - adj(a) || b.score - a.score;
    });

  const ordered = [...lead, ...rest];

  const seen = new Set<string>();
  const out: FindBetterAlternative[] = [];
  for (const { p } of ordered) {
    const id = String(p.id);
    const brandKey = String(p.brand_name || "")
      .toLowerCase()
      .trim();
    const nameKey = String(p.name || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const dedupeKey = `${brandKey}::${nameKey}`;
    if (seen.has(id) || (nameKey && seen.has(dedupeKey))) continue;
    seen.add(id);
    if (nameKey) seen.add(dedupeKey);
    out.push(toAlternative(p, input, scannedNfp));
    if (out.length >= 12) break;
  }
  return out;
}

export function findBetterInputFromEnrichment(
  enrichment: CaptureEnrichment,
  extras?: { naturalFiberPercent?: number | null }
): FindBetterInput {
  return {
    title: enrichment.title,
    brand: enrichment.brand,
    price: enrichment.price,
    currency: enrichment.currency,
    compositionText: enrichment.compositionText,
    category: enrichment.category,
    subcategory: enrichment.subcategory,
    garmentType: enrichment.garmentType,
    naturalFiberPercent: extras?.naturalFiberPercent ?? null,
    matchBrief: enrichment.matchBrief,
    distinctiveDetails: enrichment.distinctiveDetails,
    color: enrichment.color || colorHintFromTitle(enrichment.title) || (lookFamilyFromText(`${enrichment.subcategory || ""} ${enrichment.title || ""}`) === "jeans" ? "blue" : null),
    silhouette: enrichment.silhouette,
    fit: enrichment.fit,
    length: enrichment.length,
    region: enrichment.matchBrief.region || "us",
  };
}

const TITLE_COLORS = [
  "black",
  "white",
  "ivory",
  "cream",
  "beige",
  "brown",
  "tan",
  "camel",
  "navy",
  "blue",
  "indigo",
  "denim",
  "green",
  "olive",
  "red",
  "burgundy",
  "pink",
  "rose",
  "purple",
  "lilac",
  "yellow",
  "gold",
  "orange",
  "grey",
  "gray",
  "silver",
  "metallic",
];

function colorHintFromTitle(title?: string | null): string | null {
  const t = String(title || "").toLowerCase();
  if (!t) return null;
  for (const c of TITLE_COLORS) {
    if (new RegExp(`\\b${c}\\b`).test(t)) return c === "denim" || c === "indigo" ? "blue" : c;
  }
  return null;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Query verified catalog for better-material alternatives.
 * Hard-ANDs garment category; never loosens filters to fill results.
 */
export async function findBetterAlternatives(
  supabase: SupabaseClient,
  input: FindBetterInput
): Promise<FindBetterAlternative[]> {
  let resolved: FindBetterInput = { ...input };
  if (resolved.userId && !(resolved.preferredFibers && resolved.preferredFibers.length)) {
    try {
      const taste = await fetchTastePreferences(supabase, resolved.userId);
      if (taste) {
        resolved = {
          ...resolved,
          preferredFibers: taste.preferredFibers || [],
          preferredDesigners: taste.preferredDesigners || [],
          preferredSilhouettes: taste.preferredSilhouettes || [],
          userPriceMin: taste.priceMin ?? resolved.userPriceMin,
          userPriceMax: taste.priceMax ?? resolved.userPriceMax,
        };
      }
    } catch {
      /* taste is optional */
    }
  }

  const region = (resolved.region || resolved.matchBrief?.region || "us").toLowerCase();
  const price = resolved.price ?? null;
  const browseCat = browseCategoryFor(resolved);
  const preferredFiber = preferredFiberFromInput(resolved);
  const sourceLook = lookFamilyFromInput(resolved);
  const denimLead = sourceLook === "jeans";

  let rows: Record<string, unknown>[] = [];

  // Primary: authoritative catalog_browse_page_v2 via caller client (never products writes)
  if (browseCat) {
    const minPrice = price != null && price > 0 ? Math.round(price * 0.5) : resolved.userPriceMin ?? null;
    let maxPrice = price != null && price > 0 ? Math.round(price * 1.6) : resolved.userPriceMax ?? null;
    if (resolved.userPriceMax != null && resolved.userPriceMax > 0) {
      maxPrice = maxPrice == null ? resolved.userPriceMax : Math.min(maxPrice, resolved.userPriceMax);
    }
    // Prefer newest for the first pass — most_natural category browses can exceed
    // serverless budgets; rankAlternatives already elevates natural-fiber quality.
    const rpcParams = buildCatalogBrowseV2Params({
      region,
      category: browseCat,
      fiber: denimLead
        ? undefined
        : preferredFiber && !SYNTHETIC_FIBERS.has(preferredFiber)
          ? preferredFiber
          : undefined,
      fabricConstruction: denimLead ? "denim" : undefined,
      limit: 48,
      offset: 0,
      sort: "newest",
      minPrice: minPrice ?? undefined,
      maxPrice: maxPrice ?? undefined,
      // Color/silhouette are ranking preferences for TX Match — not hard browse filters.
      includeUnverified: false,
      apparelOnly: browseCat !== "shoes",
    });

    const browse = await withTimeout(
      (async () => {
        const { data, error } = await supabase.rpc("catalog_browse_page_v2", rpcParams);
        if (error) throw error;
        return data as { products?: Record<string, unknown>[] } | null;
      })(),
      35000
    );

    const products = Array.isArray(browse?.products) ? browse!.products! : [];
    if (products.length) {
      const integritySpec = integritySpecFromBrowseOpts({
        category: browseCat,
        minPrice,
        maxPrice,
        apparelOnly: browseCat !== "shoes",
      });
      const integrityRows: FilterIntegrityProduct[] = products.map((p) => ({
        id: String(p.id ?? ""),
        name: String(p.name ?? ""),
        category: p.category != null ? String(p.category) : null,
        garment_type: p.garment_type != null ? String(p.garment_type) : null,
        brand_slug: p.brand_slug != null ? String(p.brand_slug) : null,
        price: p.price as string | number | null,
        composition: p.composition != null ? String(p.composition) : "",
        color: p.color != null ? String(p.color) : null,
        shop_material_family:
          p.shop_material_family != null ? String(p.shop_material_family) : null,
        material_primary: p.material_primary != null ? String(p.material_primary) : null,
        fabric_construction: p.fabric_construction != null ? String(p.fabric_construction) : null,
      }));
      const keptIds = new Set(
        filterProductsForIntegrity(integrityRows, integritySpec).map((r) => String(r.id))
      );
      rows = products
        .filter((p) => keptIds.has(String(p.id)))
        .map((p) => ({
          id: p.id,
          name: p.name,
          brand_name: p.brand_name || p.brandName,
          brand_slug: p.brand_slug || p.brandSlug,
          image_url: p.image_url || p.imageUrl,
          price: p.price,
          currency: p.currency || "USD",
          composition: p.composition,
          natural_fiber_percent: p.natural_fiber_percent ?? p.naturalFiberPercent,
          category: p.category,
          garment_type: p.garment_type,
          color: p.color ?? null,
          shop_material_family: p.shop_material_family ?? null,
          material_primary: p.material_primary ?? null,
          fabric_construction: p.fabric_construction ?? null,
        }));
    }
  }

  // Retry without price band when the first pass is thin (still category-hard).
  if (rows.length < 4 && browseCat) {
    const wide = await withTimeout(
      (async () => {
        const { data, error } = await supabase.rpc(
          "catalog_browse_page_v2",
          buildCatalogBrowseV2Params({
            region,
            category: browseCat,
            limit: 48,
            offset: 0,
            sort: "newest",
            includeUnverified: false,
            apparelOnly: browseCat !== "shoes",
          })
        );
        if (error) throw error;
        return data as { products?: Record<string, unknown>[] } | null;
      })(),
      25000
    );
    const products = Array.isArray(wide?.products) ? wide!.products! : [];
    if (products.length) {
      const integritySpec = integritySpecFromBrowseOpts({
        category: browseCat,
        apparelOnly: browseCat !== "shoes",
      });
      const integrityRows: FilterIntegrityProduct[] = products.map((p) => ({
        id: String(p.id ?? ""),
        name: String(p.name ?? ""),
        category: p.category != null ? String(p.category) : null,
        garment_type: p.garment_type != null ? String(p.garment_type) : null,
        brand_slug: p.brand_slug != null ? String(p.brand_slug) : null,
        price: p.price as string | number | null,
        composition: p.composition != null ? String(p.composition) : "",
        color: p.color != null ? String(p.color) : null,
        shop_material_family:
          p.shop_material_family != null ? String(p.shop_material_family) : null,
        material_primary: p.material_primary != null ? String(p.material_primary) : null,
        fabric_construction: p.fabric_construction != null ? String(p.fabric_construction) : null,
      }));
      const keptIds = new Set(
        filterProductsForIntegrity(integrityRows, integritySpec).map((r) => String(r.id))
      );
      const extra = products
        .filter((p) => keptIds.has(String(p.id)))
        .map((p) => ({
          id: p.id,
          name: p.name,
          brand_name: p.brand_name || p.brandName,
          brand_slug: p.brand_slug || p.brandSlug,
          image_url: p.image_url || p.imageUrl,
          price: p.price,
          currency: p.currency || "USD",
          composition: p.composition,
          natural_fiber_percent: p.natural_fiber_percent ?? p.naturalFiberPercent,
          category: p.category,
          garment_type: p.garment_type,
          color: p.color ?? null,
          shop_material_family: p.shop_material_family ?? null,
          material_primary: p.material_primary ?? null,
          fabric_construction: p.fabric_construction ?? null,
        }));
      rows = [...rows, ...extra];
    }
  }

  // Optional smart fallback removed from the hot path — it can hang on cold catalog queries.
  // TX Match relies on catalog_browse_page_v2 (category-hard) + ranking preferences.

  return rankAlternatives(rows, resolved);
}
