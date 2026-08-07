/**
 * Universal hard-filter integrity gate for catalog results.
 * Zero invalid products may ship for any active filter combination.
 */
import { productMatchesHardCategory } from "./catalog-shop-mappings";
import {
  isFootwearListing,
  productBodyMatchesFiber,
} from "./catalog-product-filters";

export type FilterIntegritySpec = {
  category?: string | null;
  fiber?: string | null;
  maxPrice?: number | null;
  minPrice?: number | null;
  brandSlug?: string | null;
  color?: string | null;
  sale?: boolean | null;
  justIn?: boolean | null;
  materialSubtype?: string | null;
  fabricConstruction?: string | null;
  apparelOnly?: boolean | null;
};

/** Loose product shape — accepts camelCase browse rows and snake_case RPC/DB rows. */
export type FilterIntegrityProduct = {
  id?: string | null;
  name?: string | null;
  category?: string | null;
  garment_type?: string | null;
  garmentType?: string | null;
  brand_slug?: string | null;
  brandSlug?: string | null;
  price?: string | number | null;
  composition?: string | null;
  color?: string | null;
  is_sale?: boolean | null;
  isSale?: boolean | null;
  just_in?: boolean | null;
  justIn?: boolean | null;
  is_new_in?: boolean | null;
  shop_material_family?: string | null;
  shopMaterialFamily?: string | null;
  material_primary?: string | null;
  materialPrimary?: string | null;
  material_subtype?: string | null;
  materialSubtype?: string | null;
  fabric_construction?: string | null;
  fabricConstruction?: string | null;
};

export type FilterIntegrityViolation = {
  id: string;
  name: string;
  reason: string;
};

export type FilterIntegrityResult<T> = {
  kept: T[];
  dropped: T[];
  violations: FilterIntegrityViolation[];
};

const FIBER_FAMILIES = new Set([
  "silk",
  "linen",
  "cotton",
  "wool",
  "cashmere",
  "leather",
]);

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function lower(v: unknown): string {
  return str(v).toLowerCase();
}

function field(
  product: FilterIntegrityProduct,
  camel: keyof FilterIntegrityProduct,
  snake: keyof FilterIntegrityProduct
): string {
  return str(product[camel] ?? product[snake]);
}

/** Numeric price only — never lexicographic string compare. */
export function parseNumericPrice(price: unknown): number | null {
  if (price == null || price === "") return null;
  if (typeof price === "number") return Number.isFinite(price) ? price : null;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeFiberFamily(fiber?: string | null): string | null {
  if (!fiber || fiber === "all") return null;
  const f = fiber.toLowerCase().trim();
  if (f === "denim" || f === "jeans" || f === "jean") return null;
  if (f === "leather_suede" || f === "leather-suede" || f === "suede") return "leather";
  return f;
}

function normalizeFamilyToken(raw: string): string | null {
  const t = raw.toLowerCase().trim().replace(/-/g, "_");
  if (!t) return null;
  if (t === "leather_suede" || t === "suede" || t.includes("leather")) return "leather";
  for (const fam of FIBER_FAMILIES) {
    if (t === fam || t.startsWith(`${fam}_`) || t.includes(fam)) return fam;
  }
  return null;
}

function productFamilyHint(product: FilterIntegrityProduct): string | null {
  const family = field(product, "shopMaterialFamily", "shop_material_family");
  const primary = field(product, "materialPrimary", "material_primary");
  return normalizeFamilyToken(family) || normalizeFamilyToken(primary);
}

function fiberMatchesProduct(
  product: FilterIntegrityProduct,
  fiberFamily: string
): boolean {
  const hint = productFamilyHint(product);
  if (hint && hint !== fiberFamily) return false;

  const composition = field(product, "composition", "composition");
  if (composition) {
    // Never treat polyester (etc.) as silk / natural family when family columns disagree.
    if (fiberFamily === "silk") {
      const body = composition.toLowerCase();
      if (
        /\b(polyester|nylon|acrylic|elastane|spandex|polyamide|viscose|rayon)\b/.test(body) &&
        !/\b(silk|mulberry)\b/.test(body)
      ) {
        return false;
      }
    }
    if (!productBodyMatchesFiber(composition, fiberFamily)) return false;
    return true;
  }

  // No composition — require classified family/primary match.
  return hint === fiberFamily;
}

function colorMatches(product: FilterIntegrityProduct, color: string): boolean {
  const needle = color.toLowerCase().trim();
  if (!needle) return true;
  const colorField = lower(product.color);
  const name = lower(product.name);
  if (colorField) {
    return colorField === needle || colorField.includes(needle) || needle.includes(colorField);
  }
  // Loose name match when color column empty — still require a non-empty hit.
  return Boolean(name) && name.includes(needle);
}

function slugMatches(productValue: string, expected: string): boolean {
  const a = expected.toLowerCase().trim().replace(/\s+/g, "_");
  const b = productValue.toLowerCase().trim().replace(/\s+/g, "_");
  if (!a) return true;
  if (!b) return false;
  return a === b || b.includes(a) || a.includes(b);
}

function categoryKeyForSpec(spec: FilterIntegritySpec): string | null {
  const raw = spec.category?.toLowerCase().trim();
  if (raw && raw !== "all" && raw !== "apparel") return raw;
  if (spec.apparelOnly === false) return null;
  // Apparel PLP — still exclude footwear via productMatchesHardCategory("clothing").
  if (spec.apparelOnly !== false && (!raw || raw === "apparel" || raw === "clothing")) {
    return "clothing";
  }
  return raw || null;
}

/**
 * Returns a short violation reason, or null if the product satisfies all hard filters.
 */
export function productViolatesFilters(
  product: FilterIntegrityProduct,
  spec: FilterIntegritySpec
): string | null {
  const categoryKey = categoryKeyForSpec(spec);
  const garmentType = field(product, "garmentType", "garment_type");
  const name = str(product.name);
  const category = str(product.category);
  const isFootwear =
    isFootwearListing({ category, name }) ||
    lower(garmentType) === "shoes" ||
    lower(category) === "footwear";

  // Never return footwear when category is not shoes.
  if (isFootwear && categoryKey !== "shoes") {
    return "footwear_outside_shoes";
  }

  // Never return shoes on apparel-only PLPs (unless category is explicitly shoes).
  if (spec.apparelOnly !== false && isFootwear && categoryKey !== "shoes") {
    return "apparel_only_footwear";
  }

  if (categoryKey) {
    const ok = productMatchesHardCategory(
      { category, name, garment_type: garmentType || null },
      categoryKey
    );
    if (!ok) return `category_mismatch:${categoryKey}`;
  }

  const fiberFamily = normalizeFiberFamily(spec.fiber);
  if (fiberFamily && FIBER_FAMILIES.has(fiberFamily)) {
    if (!fiberMatchesProduct(product, fiberFamily)) {
      return `fiber_mismatch:${fiberFamily}`;
    }
  }

  const price = parseNumericPrice(product.price);
  if (spec.maxPrice != null && spec.maxPrice > 0) {
    if (price == null || price <= 0 || price > spec.maxPrice) {
      return `price_above_max:${spec.maxPrice}`;
    }
  }
  if (spec.minPrice != null && spec.minPrice > 0) {
    if (price == null || price < spec.minPrice) {
      return `price_below_min:${spec.minPrice}`;
    }
  }

  if (spec.brandSlug && spec.brandSlug.trim()) {
    const slug = field(product, "brandSlug", "brand_slug").toLowerCase();
    const want = spec.brandSlug.trim().toLowerCase();
    if (!slug || slug !== want) return `brand_mismatch:${want}`;
  }

  if (spec.color && spec.color.trim()) {
    if (!colorMatches(product, spec.color)) return `color_mismatch:${spec.color}`;
  }

  if (spec.sale === true) {
    const onSale = product.isSale === true || product.is_sale === true;
    if (!onSale) return "not_on_sale";
  }

  if (spec.justIn === true) {
    const justIn =
      product.justIn === true ||
      product.just_in === true ||
      product.is_new_in === true;
    if (!justIn) return "not_just_in";
  }

  if (spec.materialSubtype && spec.materialSubtype.trim()) {
    const sub = field(product, "materialSubtype", "material_subtype");
    const composition = field(product, "composition", "composition");
    const want = spec.materialSubtype.trim();
    if (sub) {
      if (!slugMatches(sub, want)) return `material_subtype_mismatch:${want}`;
    } else if (composition) {
      const needle = want.replace(/_/g, " ").toLowerCase();
      if (!composition.toLowerCase().includes(needle) && !composition.toLowerCase().includes(want.toLowerCase())) {
        return `material_subtype_mismatch:${want}`;
      }
    } else {
      return `material_subtype_mismatch:${want}`;
    }
  }

  if (spec.fabricConstruction && spec.fabricConstruction.trim()) {
    const fab = field(product, "fabricConstruction", "fabric_construction");
    const composition = field(product, "composition", "composition");
    const want = spec.fabricConstruction.trim();
    if (fab) {
      if (!slugMatches(fab, want)) return `fabric_construction_mismatch:${want}`;
    } else if (composition) {
      const needle = want.replace(/_/g, " ").toLowerCase();
      if (!composition.toLowerCase().includes(needle) && !composition.toLowerCase().includes(want.toLowerCase())) {
        return `fabric_construction_mismatch:${want}`;
      }
    } else {
      return `fabric_construction_mismatch:${want}`;
    }
  }

  return null;
}

export function assertCatalogIntegrity<T extends FilterIntegrityProduct>(
  products: T[],
  spec: FilterIntegritySpec
): FilterIntegrityResult<T> {
  const kept: T[] = [];
  const dropped: T[] = [];
  const violations: FilterIntegrityViolation[] = [];

  for (const product of products) {
    const reason = productViolatesFilters(product, spec);
    if (reason) {
      dropped.push(product);
      violations.push({
        id: str(product.id) || "unknown",
        name: str(product.name) || "unknown",
        reason,
      });
    } else {
      kept.push(product);
    }
  }

  return { kept, dropped, violations };
}

/** Returns only valid products, preserving input order. */
export function filterProductsForIntegrity<T extends FilterIntegrityProduct>(
  products: T[],
  spec: FilterIntegritySpec
): T[] {
  return assertCatalogIntegrity(products, spec).kept;
}

/** Build integrity spec from browse / direct-query opts. */
export function integritySpecFromBrowseOpts(opts: {
  category?: string | null;
  fiber?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  brand?: string | null;
  brandSlug?: string | null;
  color?: string | null;
  sale?: boolean | null;
  isSale?: boolean | null;
  justIn?: boolean | null;
  materialSubtype?: string | null;
  fabricConstruction?: string | null;
  apparelOnly?: boolean | null;
}): FilterIntegritySpec {
  const categoryRaw =
    opts.category && opts.category !== "all" && opts.category !== "apparel"
      ? opts.category.toLowerCase().trim()
      : null;
  return {
    category: categoryRaw,
    fiber: opts.fiber,
    minPrice: opts.minPrice,
    maxPrice: opts.maxPrice,
    brandSlug: opts.brandSlug || opts.brand || null,
    color: opts.color,
    sale: opts.sale ?? opts.isSale ?? null,
    justIn: opts.justIn ?? null,
    materialSubtype: opts.materialSubtype,
    fabricConstruction: opts.fabricConstruction,
    apparelOnly: opts.apparelOnly !== false,
  };
}
