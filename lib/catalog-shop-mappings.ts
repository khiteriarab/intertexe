/** Shop/materials URL slugs → DB garment_type enums (see catalog_shop_category_garment_types). */
export const SHOP_CATEGORY_GARMENT_TYPES: Record<string, string[]> = {
  dresses: ["dresses"],
  tops: ["tops_blouses", "shirts"],
  knitwear: ["knitwear", "sweaters_cardigans"],
  bottoms: ["pants_trousers", "shorts"],
  outerwear: ["coats", "jackets_blazers"],
  skirts: ["skirts"],
  swimwear: ["swim_resortwear"],
  lingerie: ["other_apparel"],
};

export const SHOP_FIBER_TO_MATERIAL: Record<string, string> = {
  silk: "silk",
  linen: "linen",
  cotton: "cotton",
  wool: "wool",
  cashmere: "cashmere",
  "leather-suede": "leather_suede",
  leather_suede: "leather_suede",
};

export function garmentTypesForShopCategory(category?: string | null): string[] | null {
  if (!category || category === "all") return null;
  return SHOP_CATEGORY_GARMENT_TYPES[category.toLowerCase()] ?? null;
}

export function materialPrimaryForShopFiber(fiber?: string | null): string | null {
  if (!fiber || fiber === "all") return null;
  const f = fiber.toLowerCase();
  if (f === "denim" || f === "jeans" || f === "jean") return null;
  return SHOP_FIBER_TO_MATERIAL[f] ?? f;
}

export function rowMatchesGarmentFilter(row: { garment_type?: string | null }, category?: string | null): boolean {
  const types = garmentTypesForShopCategory(category);
  if (!types?.length) return true;
  const gt = (row.garment_type || "").toLowerCase();
  return types.includes(gt);
}
