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
  | "dresses"
  | "tops"
  | "knitwear"
  | "trousers"
  | "skirts"
  | "outerwear"
  | "jumpsuits"
  | "lingerie"
  | "swimwear";

export const SHOP_CATEGORY_OPTIONS: { key: ShopCategoryKey; label: string }[] = [
  { key: "dresses", label: "Dresses" },
  { key: "tops", label: "Tops" },
  { key: "knitwear", label: "Knitwear" },
  { key: "trousers", label: "Trousers" },
  { key: "skirts", label: "Skirts" },
  { key: "outerwear", label: "Outerwear" },
  { key: "jumpsuits", label: "Jumpsuits" },
  { key: "lingerie", label: "Lingerie" },
  { key: "swimwear", label: "Swimwear" },
];

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
