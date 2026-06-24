/**
 * Single source for shop slugs, collection rails, and garment_type enums.
 * Use in catalog_list fallbacks, sale filters, and collection pages.
 */
import { SHOP_CATEGORY_GARMENT_TYPES, garmentTypesForShopCategory } from "./catalog-shop-mappings";
import { classifyGarment } from "./catalog-rules";

/** Editorial collection slugs → garment_type filters (subset of shop categories). */
export const COLLECTION_GARMENT_TYPES: Record<string, string[]> = {
  dresses: ["dresses"],
  tops: ["tops_blouses", "shirts"],
  knitwear: ["knitwear", "sweaters_cardigans"],
  trousers: ["pants_trousers"],
  outerwear: ["jackets_blazers", "coats"],
  skirts: ["skirts"],
  "linen-clothing": ["dresses", "tops_blouses", "pants_trousers", "skirts", "jackets_blazers"],
  "silk-clothing": ["dresses", "tops_blouses", "skirts", "jackets_blazers"],
  "cashmere-clothing": ["knitwear", "sweaters_cardigans", "jackets_blazers", "coats"],
  "cotton-clothing": ["dresses", "tops_blouses", "pants_trousers"],
};

export function garmentTypesForTaxonomy(input: {
  shopCategory?: string | null;
  collectionSlug?: string | null;
  legacyCategory?: string | null;
  productName?: string | null;
}): string[] | null {
  const shop = garmentTypesForShopCategory(input.shopCategory);
  if (shop?.length) return shop;

  const slug = String(input.collectionSlug || "").toLowerCase().trim();
  if (slug && COLLECTION_GARMENT_TYPES[slug]?.length) {
    return COLLECTION_GARMENT_TYPES[slug];
  }

  const legacy = String(input.legacyCategory || "").trim();
  const name = String(input.productName || "").trim();
  if (legacy || name) {
    const gt = classifyGarment(legacy, name);
    if (gt && gt !== "needs_review" && gt !== "other_apparel") return [gt];
  }
  return null;
}

export function rowMatchesTaxonomy(
  row: { garment_type?: string | null; category?: string | null; name?: string | null },
  opts: { shopCategory?: string | null; collectionSlug?: string | null }
): boolean {
  const types = garmentTypesForTaxonomy({
    shopCategory: opts.shopCategory,
    collectionSlug: opts.collectionSlug,
    legacyCategory: row.category,
    productName: row.name,
  });
  if (!types?.length) return true;
  const gt = String(row.garment_type || "").toLowerCase();
  if (gt && types.includes(gt)) return true;
  const inferred = classifyGarment(String(row.category || ""), String(row.name || ""));
  return types.includes(inferred);
}

export { SHOP_CATEGORY_GARMENT_TYPES };
