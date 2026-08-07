/**
 * Find Better — ranked INTERTEXE catalog alternatives for an enriched capture.
 * Reads verified catalog via catalog_browse_page_v2 / getSmartAlternatives.
 * Never writes to products / live_products.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSmartAlternatives } from "./scanner/get-smart-alternatives";
import type { CaptureEnrichment, MatchBrief } from "./capture-enrichment";
import { buildCatalogBrowseV2Params } from "./catalog-browse-v2";
import { productMatchesHardCategory } from "./catalog-shop-mappings";
import {
  filterProductsForIntegrity,
  integritySpecFromBrowseOpts,
  type FilterIntegrityProduct,
} from "./catalog-filter-integrity";

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
};

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

function isPantsInspiration(input: FindBetterInput): boolean {
  const cat = `${input.category || ""} ${input.subcategory || ""} ${input.garmentType || ""}`.toLowerCase();
  const must = (input.matchBrief?.mustMatch || []).join(" ").toLowerCase();
  const title = (input.title || "").toLowerCase();
  return (
    /\b(pant|pants|trouser|trousers)\b/.test(cat) ||
    /\b(pant|pants|trouser|trousers)\b/.test(must) ||
    /\b(pant|pants|trouser|trousers)\b/.test(title) ||
    input.garmentType === "trouser"
  );
}

function browseCategoryFor(input: FindBetterInput): string | null {
  if (isPantsInspiration(input)) return "trousers";
  const candidates = [
    input.garmentType,
    input.subcategory,
    input.category,
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
  if (nfp >= 90) parts.push(`${Math.round(nfp)}% natural fiber`);
  else if (nfp > scannedNfp) parts.push("Higher natural fiber than original");
  else if (nfp >= 80) parts.push("Verified natural fiber");

  if (isPantsInspiration(input)) parts.push("Same garment type (trousers/pants)");
  else if (browseCategoryFor(input)) parts.push(`Same category (${browseCategoryFor(input)})`);

  const sil = input.silhouette || input.subcategory;
  if (
    sil &&
    String(product.name || "")
      .toLowerCase()
      .includes(String(sil).toLowerCase().split(" ")[0])
  ) {
    parts.push("Similar silhouette");
  }

  const price = parsePrice(product.price);
  const target = input.price;
  if (price != null && target != null && target > 0) {
    const diff = Math.abs(price - target) / target;
    if (diff <= 0.4) parts.push("Similar price band");
  }

  if (parts.length === 0) parts.push("Catalog match for your inspiration");
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
    composition: (product.composition as string) || null,
    natural_fiber_percent:
      product.natural_fiber_percent != null ? Number(product.natural_fiber_percent) : null,
    category: (product.category as string) || null,
    why: whyFor(product, input, scannedNfp),
  };
}

function rankAlternatives(
  products: Record<string, unknown>[],
  input: FindBetterInput
): FindBetterAlternative[] {
  const scannedNfp = input.naturalFiberPercent ?? 0;
  const targetPrice =
    input.price ??
    (input.matchBrief?.targetPriceRange
      ? (input.matchBrief.targetPriceRange.min + input.matchBrief.targetPriceRange.max) / 2
      : null);

  const filtered = products.filter((p) => matchesHardCategory(p, input));

  const scored = filtered.map((p) => {
    let score = 0;
    const nfp = Number(p.natural_fiber_percent) || 0;
    score += nfp;
    const price = parsePrice(p.price);
    if (targetPrice != null && price != null && targetPrice > 0) {
      const diff = Math.abs(price - targetPrice) / targetPrice;
      if (diff <= 0.4) score += 25;
      else if (diff <= 0.7) score += 10;
      else score -= 15;
    }
    const hay = `${p.name || ""} ${p.category || ""}`.toLowerCase();
    // Preferences — never hard-require
    for (const pref of input.matchBrief?.preferred || []) {
      if (pref && hay.includes(pref.toLowerCase())) score += 8;
    }
    for (const must of input.matchBrief?.mustMatch || []) {
      if (must && hay.includes(must.toLowerCase())) score += 15;
    }
    for (const d of input.distinctiveDetails || []) {
      if (d && hay.includes(d.toLowerCase())) score += 12;
    }
    return { p, score };
  });

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (Number(b.p.natural_fiber_percent) || 0) - (Number(a.p.natural_fiber_percent) || 0)
  );

  const seen = new Set<string>();
  const out: FindBetterAlternative[] = [];
  for (const { p } of scored) {
    const id = String(p.id);
    if (seen.has(id)) continue;
    seen.add(id);
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
    color: enrichment.color,
    silhouette: enrichment.silhouette,
    fit: enrichment.fit,
    length: enrichment.length,
    region: enrichment.matchBrief.region || "us",
  };
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
  const garmentType =
    input.garmentType || (isPantsInspiration(input) ? "trouser" : null);

  const region = (input.region || input.matchBrief?.region || "us").toLowerCase();
  const price = input.price ?? null;
  const browseCat = browseCategoryFor(input);

  let rows: Record<string, unknown>[] = [];

  // Primary: authoritative catalog_browse_page_v2 via caller client (never products writes)
  if (browseCat) {
    const minPrice = price != null && price > 0 ? Math.round(price * 0.5) : null;
    const maxPrice = price != null && price > 0 ? Math.round(price * 1.6) : null;
    const rpcParams = buildCatalogBrowseV2Params({
      region,
      category: browseCat,
      limit: 48,
      offset: 0,
      sort: "most_natural",
      minPrice: minPrice ?? undefined,
      maxPrice: maxPrice ?? undefined,
      color: input.color || undefined,
      includeUnverified: false,
      apparelOnly: browseCat !== "shoes",
    });

    const browse = await withTimeout(
      (async () => {
        const { data, error } = await supabase.rpc("catalog_browse_page_v2", rpcParams);
        if (error) throw error;
        return data as { products?: Record<string, unknown>[] } | null;
      })(),
      20000
    );

    const products = Array.isArray(browse?.products) ? browse!.products! : [];
    if (products.length) {
      const integritySpec = integritySpecFromBrowseOpts({
        category: browseCat,
        minPrice,
        maxPrice,
        color: input.color,
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
        }));
    }
  }

  // Fallback: getSmartAlternatives (uses same supabase client)
  if (rows.length < 4) {
    const smart = await withTimeout(
      getSmartAlternatives(supabase, {
        composition: input.compositionText,
        detectedPrice: price,
        price,
        currency: input.currency,
        category: browseCat || input.category,
        garmentType,
        primaryFiber: null,
        naturalFiberPercent: input.naturalFiberPercent,
        region,
        excludeBrandSlug: input.brand?.toLowerCase().replace(/\s+/g, "-") || null,
      }),
      15000
    );
    if (smart?.length) {
      const asRows = smart.map((p: Record<string, unknown>) => p);
      rows = [...rows, ...asRows];
    }
  }

  return rankAlternatives(rows, input);
}
