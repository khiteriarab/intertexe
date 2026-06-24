/** Shop/materials URL slugs → DB garment_type enums (see catalog_shop_category_garment_types). */
export const SHOP_CATEGORY_GARMENT_TYPES: Record<string, string[]> = {
  dresses: ["dresses"],
  tops: ["tops_blouses"],
  knitwear: ["knitwear", "sweaters_cardigans"],
  trousers: ["pants_trousers"],
  bottoms: ["pants_trousers", "skirts", "shorts"],
  outerwear: ["jackets_blazers", "coats"],
  skirts: ["skirts"],
  jumpsuits: ["jumpsuits"],
  swimwear: ["swim_resortwear"],
  lingerie: ["lingerie"],
  shorts: ["shorts"],
};

/** Alias for direct-query layer. */
export const CATEGORY_TO_GARMENT_TYPE = SHOP_CATEGORY_GARMENT_TYPES;

/** Collection slugs used as shop-style category filters in sale/shop APIs. */
const COLLECTION_CATEGORY_GARMENT_TYPES: Record<string, string[]> = {
  "linen-clothing": ["dresses", "tops_blouses", "pants_trousers", "skirts", "jackets_blazers"],
  "silk-clothing": ["dresses", "tops_blouses", "skirts", "jackets_blazers"],
  "cashmere-clothing": ["knitwear", "sweaters_cardigans", "jackets_blazers", "coats"],
  "cotton-clothing": ["dresses", "tops_blouses", "pants_trousers"],
};

export function applyCategoryFilter(query: any, category: string): any {
  const key = category.toLowerCase();
  const garmentTypes =
    SHOP_CATEGORY_GARMENT_TYPES[key] ?? COLLECTION_CATEGORY_GARMENT_TYPES[key];
  if (garmentTypes?.length) {
    return query.in("garment_type", garmentTypes);
  }
  const needle = category.toLowerCase();
  return query.or(`name.ilike.%${needle}%,category.ilike.%${needle}%`);
}

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
