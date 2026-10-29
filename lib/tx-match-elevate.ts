/**
 * TX Match elevation helpers — persona/designers, wardrobe pairing,
 * editorial / Khiteri badges, size soft-filters.
 */

import { getKhiterisEditConfig } from "./khiteris-edit";
import { FABRIC_PERSONAS } from "../shared/personas";

export type WardrobeHint = {
  title?: string | null;
  category?: string | null;
  subcategory?: string | null;
  color?: string | null;
  brand?: string | null;
};

export type PairingHit = {
  label: string;
  score: number;
};

/** Complementary shop categories for "pairs with what you already saved". */
const PAIR_WITH: Record<string, string[]> = {
  tops: ["trousers", "skirts", "jeans"],
  knitwear: ["trousers", "skirts", "jeans"],
  trousers: ["tops", "knitwear", "outerwear", "shoes"],
  jeans: ["tops", "knitwear", "outerwear", "shoes"],
  skirts: ["tops", "knitwear", "shoes"],
  dresses: ["shoes", "outerwear"],
  outerwear: ["dresses", "trousers", "jeans", "skirts"],
  shoes: ["dresses", "trousers", "jeans", "skirts"],
  jumpsuits: ["shoes", "outerwear"],
};

function normalizeCat(raw: string | null | undefined): string | null {
  const t = String(raw || "")
    .toLowerCase()
    .trim();
  if (!t) return null;
  if (/\b(pant|trouser|jean)\b/.test(t)) return "trousers";
  if (/\b(top|blouse|shirt|tee)\b/.test(t)) return "tops";
  if (/\b(knit|sweater|cardigan)\b/.test(t)) return "knitwear";
  if (/\b(skirt)\b/.test(t)) return "skirts";
  if (/\b(dress)\b/.test(t)) return "dresses";
  if (/\b(coat|jacket|outer)\b/.test(t)) return "outerwear";
  if (/\b(shoe|boot|sandal|heel|sneaker)\b/.test(t)) return "shoes";
  if (/\b(jumpsuit|romper)\b/.test(t)) return "jumpsuits";
  return t.split(/[\s/]+/)[0] || null;
}

export function wardrobePairingHit(
  product: { category?: unknown; name?: unknown; color?: unknown; brand_name?: unknown },
  wardrobe: WardrobeHint[]
): PairingHit | null {
  if (!wardrobe.length) return null;
  const productCat = normalizeCat(String(product.category || product.name || ""));
  const productColor = String(product.color || "").toLowerCase();
  const productBrand = String(product.brand_name || "").toLowerCase();
  let best: PairingHit | null = null;

  for (const piece of wardrobe) {
    const savedCat = normalizeCat(piece.subcategory || piece.category || piece.title);
    const savedTitle = String(piece.title || piece.brand || "saved piece").trim();
    const short = savedTitle.length > 42 ? `${savedTitle.slice(0, 40)}…` : savedTitle;
    let score = 0;
    if (productCat && savedCat && PAIR_WITH[productCat]?.includes(savedCat)) score += 28;
    if (productCat && savedCat && productCat === savedCat) score += 8;
    const savedColor = String(piece.color || "").toLowerCase();
    if (savedColor.length >= 3 && productColor.includes(savedColor)) score += 12;
    const savedBrand = String(piece.brand || "").toLowerCase();
    if (savedBrand && productBrand && productBrand.includes(savedBrand)) score += 6;
    if (score <= 0) continue;
    const label = `Pairs with your ${short}`;
    if (!best || score > best.score) best = { label, score };
  }
  return best;
}

export function preferredDesignerBoost(
  brandName: string | null | undefined,
  preferredDesigners: string[] | null | undefined
): number {
  if (!brandName || !preferredDesigners?.length) return 0;
  const brand = brandName.toLowerCase();
  for (const d of preferredDesigners) {
    const needle = String(d || "")
      .toLowerCase()
      .trim();
    if (needle.length >= 2 && (brand.includes(needle) || needle.includes(brand))) return 32;
  }
  return 0;
}

export function silhouetteBoost(
  productName: string | null | undefined,
  preferredSilhouettes: string[] | null | undefined
): number {
  if (!productName || !preferredSilhouettes?.length) return 0;
  const hay = productName.toLowerCase();
  for (const s of preferredSilhouettes) {
    const token = String(s || "")
      .toLowerCase()
      .trim()
      .split(/\s+/)[0];
    if (token.length >= 3 && hay.includes(token)) return 16;
  }
  return 0;
}

export function personaFiberBoost(
  product: Record<string, unknown>,
  profileType: string | null | undefined,
  productMatchesFiber: (p: Record<string, unknown>, fiber: string) => boolean
): number {
  if (!profileType) return 0;
  const persona =
    FABRIC_PERSONAS.find((p) => p.id === profileType) ||
    FABRIC_PERSONAS.find((p) => p.name.toLowerCase() === profileType.toLowerCase());
  if (!persona) return 0;
  for (const mat of persona.recommendedMaterials) {
    if (productMatchesFiber(product, mat.toLowerCase())) return 14;
  }
  return 0;
}

export type EditorialIndex = {
  skus: Set<string>;
  brandNames: Set<string>;
};

let cachedEditorial: EditorialIndex | null = null;

export function khiteriEditorialIndex(): EditorialIndex {
  if (cachedEditorial) return cachedEditorial;
  const skus = new Set<string>();
  const brandNames = new Set<string>();
  try {
    const edit = getKhiterisEditConfig();
    for (const p of edit.products) {
      if (p.catalogSku) skus.add(String(p.catalogSku).toLowerCase());
      const key = `${String(p.brand || "")
        .toLowerCase()
        .trim()}::${String(p.name || "")
        .toLowerCase()
        .trim()}`;
      if (key !== "::") brandNames.add(key);
    }
  } catch {
    /* config optional at build time */
  }
  cachedEditorial = { skus, brandNames };
  return cachedEditorial;
}

export function isKhiteriEditProduct(product: Record<string, unknown>): boolean {
  const idx = khiteriEditorialIndex();
  const id = String(product.id || product.product_id || "").toLowerCase();
  const url = String(product.url || product.image_url || "").toLowerCase();
  for (const sku of idx.skus) {
    if (sku && (id.includes(sku) || url.includes(sku.toLowerCase()))) return true;
  }
  const brand = String(product.brand_name || "")
    .toLowerCase()
    .trim();
  const name = String(product.name || "")
    .toLowerCase()
    .trim();
  if (brand && name && idx.brandNames.has(`${brand}::${name}`)) return true;
  // Soft: brand + first two name tokens
  if (brand && name) {
    const tokens = name.split(/\s+/).slice(0, 3).join(" ");
    for (const key of idx.brandNames) {
      if (key.startsWith(`${brand}::`) && key.includes(tokens.slice(0, 12))) return true;
    }
  }
  return false;
}

export function sizeSoftMatch(
  sizeOptions: unknown,
  preferredSizes: string[] | null | undefined
): boolean | null {
  if (!preferredSizes?.length) return null;
  const raw = Array.isArray(sizeOptions)
    ? sizeOptions.map(String)
    : typeof sizeOptions === "string"
      ? sizeOptions.split(/[,|/]/).map((s) => s.trim())
      : [];
  if (!raw.length) return null;
  const opts = raw.map((s) => s.toLowerCase());
  return preferredSizes.some((sz) => {
    const n = String(sz || "")
      .toLowerCase()
      .trim();
    return n && opts.some((o) => o === n || o.includes(n) || n.includes(o));
  });
}

export function parsePreferredSizes(prefs: unknown): string[] {
  if (!prefs || typeof prefs !== "object") return [];
  const row = prefs as Record<string, unknown>;
  const candidates = [row.sizes, row.preferredSizes, row.size, row.apparelSizes];
  for (const c of candidates) {
    if (Array.isArray(c)) return c.map(String).filter(Boolean).slice(0, 12);
    if (typeof c === "string" && c.trim()) {
      return c
        .split(/[,|/]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
    }
  }
  return [];
}

export function catalogRegionFromShopMarket(
  shopMarket: string | null | undefined,
  countryCode?: string | null
): string | null {
  const market = String(shopMarket || "").toLowerCase();
  const cc = String(countryCode || "").toUpperCase();
  if (cc === "CA") return "ca";
  if (cc === "GB" || cc === "UK") return "uk";
  if (market === "eu-uk-me") return cc === "GB" || cc === "UK" ? "uk" : "eu";
  if (market === "us-ca") return cc === "CA" ? "ca" : "us";
  return null;
}
