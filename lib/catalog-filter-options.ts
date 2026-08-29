/** Shared shop filter options — parity with iOS UnifiedFilterSheet. */

export const SHOP_COLOR_OPTIONS = [
  { label: "Black", value: "black" },
  { label: "White", value: "white" },
  { label: "Ivory", value: "ivory" },
  { label: "Cream", value: "cream" },
  { label: "Ecru", value: "ecru" },
  { label: "Off-White", value: "off-white" },
  { label: "Neutrals", value: "neutrals" },
  { label: "Beige", value: "beige" },
  { label: "Grey", value: "grey" },
  { label: "Navy", value: "navy" },
  { label: "Blue", value: "blue" },
  { label: "Red", value: "red" },
  { label: "Burgundy", value: "burgundy" },
  { label: "Pink", value: "pink" },
  { label: "Green", value: "green" },
  { label: "Brown", value: "brown" },
  { label: "Orange", value: "orange" },
  { label: "Yellow", value: "yellow" },
  { label: "Gold", value: "gold" },
  { label: "Silver", value: "silver" },
  { label: "Rose Gold", value: "rose gold" },
  { label: "Metallic", value: "metallic" },
  { label: "Purple", value: "purple" },
  { label: "Print", value: "print" },
  { label: "Animal Print", value: "animal print" },
  { label: "Multi", value: "multi" },
] as const;

export type ShopCategoryKey =
  | "shoes"
  | "dresses"
  | "tops"
  | "knitwear"
  | "trousers"
  | "skirts"
  | "outerwear"
  | "jumpsuits"
  | "lingerie"
  | "sleepwear"
  | "swimwear";

export const SHOP_CATEGORY_OPTIONS: { key: ShopCategoryKey; label: string }[] = [
  { key: "shoes", label: "Shoes" },
  { key: "dresses", label: "Dresses" },
  { key: "tops", label: "Tops" },
  { key: "knitwear", label: "Knitwear" },
  { key: "trousers", label: "Trousers" },
  { key: "skirts", label: "Skirts" },
  { key: "outerwear", label: "Outerwear" },
  { key: "jumpsuits", label: "Jumpsuits" },
  { key: "lingerie", label: "Lingerie" },
  { key: "sleepwear", label: "Sleepwear" },
  { key: "swimwear", label: "Swimwear" },
];

export const SHOP_SHOE_TYPES = [
  "Boots",
  "Sandals",
  "Heels",
  "Sneakers",
  "Loafers",
  "Flats",
  "Mules",
  "Espadrilles",
] as const;

export type ShopApparelFiberKey = "silk" | "linen" | "cashmere" | "cotton" | "wool" | "leather";
export type ShopShoeFiberKey = "leather" | "suede" | "nubuck" | "canvas";
export type ShopFiberKey = "all" | ShopApparelFiberKey | ShopShoeFiberKey;

export const SHOP_APPAREL_FIBER_OPTIONS: { key: ShopApparelFiberKey; label: string }[] = [
  { key: "silk", label: "Silk" },
  { key: "cashmere", label: "Cashmere" },
  { key: "wool", label: "Wool" },
  { key: "linen", label: "Linen" },
  { key: "cotton", label: "Cotton" },
  { key: "leather", label: "Leather" },
];

/** Shown when category is Shoes — not silk/cashmere apparel fibers. */
export const SHOP_SHOE_FIBER_OPTIONS: { key: ShopShoeFiberKey; label: string }[] = [
  { key: "leather", label: "Leather" },
  { key: "suede", label: "Suede" },
  { key: "nubuck", label: "Nubuck" },
  { key: "canvas", label: "Canvas" },
];

/**
 * Canonical filter sheet order for web + iOS UnifiedFilterSheet.
 * Color is above Price. After Shoes, show shoe type, then shoe fibers.
 */
export const SHOP_FILTER_SECTION_ORDER = [
  "category",
  "shoeType",
  "fiber",
  "color",
  "price",
] as const;

export type ShopMaterialQuery = {
  fiber?: string;
  materialSubtype?: string;
  fabricConstruction?: string;
};

export function isShoesCategory(category?: string | null): boolean {
  const key = String(category || "").toLowerCase();
  return key === "shoes" || key === "footwear";
}

export function fiberOptionsForCategory(
  category?: string | null
): { key: ShopFiberKey; label: string }[] {
  const all = { key: "all" as const, label: "All" };
  if (isShoesCategory(category)) {
    return [all, ...SHOP_SHOE_FIBER_OPTIONS];
  }
  return [all, ...SHOP_APPAREL_FIBER_OPTIONS];
}

export function isFiberAllowedForCategory(fiber: string, category?: string | null): boolean {
  return fiberOptionsForCategory(category).some((opt) => opt.key === fiber);
}

/** Map UI fiber chips to catalog_browse_page_v2 params. */
export function resolveShopMaterialQuery(fiber: string | null | undefined): ShopMaterialQuery {
  const key = String(fiber || "all").toLowerCase();
  if (!key || key === "all") return {};
  if (key === "suede") return { fiber: "leather", materialSubtype: "suede" };
  if (key === "nubuck") return { fiber: "leather", materialSubtype: "nubuck" };
  if (key === "canvas") return { fabricConstruction: "canvas" };
  if (key === "leather_suede" || key === "leather-suede") return { fiber: "leather" };
  return { fiber: key };
}

export type ShopPriceTierId = "any" | "200" | "500" | "1000" | "2500" | "2500plus";

export const SHOP_PRICE_TIERS: {
  id: ShopPriceTierId;
  label: string;
  min?: number;
  max?: number;
  plus?: boolean;
}[] = [
  { id: "any", label: "Any Price" },
  { id: "200", label: "Under $200", max: 200 },
  { id: "500", label: "$200 – $500", min: 200, max: 500 },
  { id: "1000", label: "$500 – $1,000", min: 500, max: 1000 },
  { id: "2500", label: "$1,000 – $2,500", min: 1000, max: 2500 },
  { id: "2500plus", label: "$2,500+", min: 2500, plus: true },
];

export function priceBoundsFromTier(tier: ShopPriceTierId): { minPrice?: number; maxPrice?: number } {
  const t = SHOP_PRICE_TIERS.find((p) => p.id === tier);
  if (!t || tier === "any") return {};
  if (t.plus) return { minPrice: t.min };
  return { minPrice: t.min, maxPrice: t.max };
}
