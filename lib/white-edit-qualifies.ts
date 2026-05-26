/**
 * White Edit membership — color field first; never match brand-name "white" tokens.
 */
import type { Product } from "./supabase-server";

export const WHITE_COLOR_TERMS = [
  "white",
  "cream",
  "ivory",
  "ecru",
  "chalk",
  "off-white",
  "off white",
  "snow",
  "pearl",
  "bone",
  "nude",
  "vanilla",
  "oat",
  "milk",
  "porcelain",
  "alabaster",
  "optical white",
  "optic white",
];

const WHITE_EDIT_DARK_TERMS = [
  "black",
  "noir",
  "dark",
  "navy",
  "midnight",
  "charcoal",
  "forest",
  "burgundy",
  "grey",
  "gray",
  "brown",
  "khaki",
  "olive",
  "red",
  "blue",
  "green",
  "pink",
  "yellow",
  "orange",
  "purple",
  "multi",
  "print",
  "stripe",
];

const EXCLUDED_BRAND_SLUGS = new Set(["off-white", "offwhite", "off_white"]);

function stripBrandFromName(name: string, brandName?: string | null, brandSlug?: string | null): string {
  let out = name;
  if (brandName?.trim()) {
    const escaped = brandName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), " ");
  }
  if (brandSlug) {
    const slugSpaced = brandSlug.replace(/-/g, " ");
    out = out.replace(new RegExp(slugSpaced.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }
  return out
    .replace(/\bwhite\s+label\b/gi, " ")
    .replace(/\bproenza\s+schouler\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function qualifiesForWhiteEditProduct(
  product: Pick<
    Product,
    "name" | "brandSlug" | "brandName" | "color" | "naturalFiberPercent"
  >
): boolean {
  if ((product.naturalFiberPercent ?? 0) < 80) return false;

  const brandSlug = (product.brandSlug || "").toLowerCase();
  if (EXCLUDED_BRAND_SLUGS.has(brandSlug) || brandSlug.includes("off-white")) {
    return false;
  }

  const nameLower = (product.name || "").toLowerCase();
  if (/\b(dog|dogs|pet|pets|couture\s+dog)\b/i.test(nameLower)) {
    return false;
  }

  const colorField = (product.color || "").toLowerCase();
  const colorFieldIsWhite = WHITE_COLOR_TERMS.some((t) => colorField.includes(t));

  const nameWithoutBrand = stripBrandFromName(
    product.name || "",
    product.brandName,
    product.brandSlug
  );

  if (WHITE_EDIT_DARK_TERMS.some((term) => nameWithoutBrand.includes(term))) {
    return false;
  }

  const nameIsWhite = WHITE_COLOR_TERMS.some((t) => nameWithoutBrand.includes(t));

  return colorFieldIsWhite || nameIsWhite;
}
