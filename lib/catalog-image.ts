/**
 * Luxury product imagery — focal centering, safe aspect ratios, optional uncropped fallback.
 */

export type CatalogImageVariant = "product-card" | "editorial-hero" | "brand-thumb";

const VARIANT_CLASS: Record<CatalogImageVariant, string> = {
  "product-card": "object-cover object-[center_22%]",
  "editorial-hero": "object-contain object-center",
  "brand-thumb": "object-cover object-[center_30%]",
};

/** Pick object-position from product category when helpful. */
export function catalogImageObjectClass(
  variant: CatalogImageVariant,
  opts?: { category?: string; name?: string; uncropped?: boolean }
): string {
  if (opts?.uncropped) return "object-contain object-center p-2";
  const base = VARIANT_CLASS[variant];
  const text = `${opts?.category || ""} ${opts?.name || ""}`.toLowerCase();
  if (variant === "product-card") {
    if (/\b(dress|gown|maxi|midi)\b/.test(text)) return "object-cover object-[center_15%]";
    if (/\b(pant|trouser|jean|skirt)\b/.test(text)) return "object-cover object-[center_40%]";
    if (/\b(shoe|boot|sandal|bag)\b/.test(text)) return "object-contain object-center p-3";
  }
  return base;
}

export function catalogImageSizes(variant: CatalogImageVariant): { width: number; aspect: string } {
  switch (variant) {
    case "editorial-hero":
      return { width: 1600, aspect: "aspect-[3/4]" };
    case "brand-thumb":
      return { width: 400, aspect: "aspect-[3/4]" };
    default:
      return { width: 480, aspect: "aspect-[3/4]" };
  }
}
