/**
 * Product / grid imagery — category-aware cover crops (shop, collection grids, cards).
 */

import { editorialFocalClass, type EditorialFocalHints } from "./editorial-image";

export type CatalogImageVariant = "product-card" | "editorial-hero" | "brand-thumb" | "collection-grid";

const VARIANT_BASE: Record<CatalogImageVariant, string> = {
  "product-card": "object-cover",
  "editorial-hero": "object-cover",
  "brand-thumb": "object-cover object-[center_30%]",
  "collection-grid": "object-cover",
};

/** Pick object-position from product category when helpful. */
export function catalogImageObjectClass(
  variant: CatalogImageVariant,
  opts?: EditorialFocalHints & { uncropped?: boolean }
): string {
  if (opts?.uncropped) {
    return "object-contain object-center p-2";
  }

  if (variant === "collection-grid" || variant === "product-card") {
    return `${VARIANT_BASE[variant]} ${editorialFocalClass(opts)}`;
  }

  if (variant === "editorial-hero") {
    return `${VARIANT_BASE[variant]} ${editorialFocalClass(opts)} md:object-[center_35%]`;
  }

  return VARIANT_BASE[variant];
}

export function catalogImageSizes(variant: CatalogImageVariant): { width: number; aspect: string } {
  switch (variant) {
    case "editorial-hero":
      return { width: 1600, aspect: "aspect-[5/6] md:aspect-[21/9]" };
    case "brand-thumb":
      return { width: 400, aspect: "aspect-[3/4]" };
    case "collection-grid":
      return { width: 480, aspect: "aspect-[3/4]" };
    default:
      return { width: 480, aspect: "aspect-[3/4]" };
  }
}
