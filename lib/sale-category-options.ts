/**
 * Sale category picker — mirrors shop taxonomy (blouses, lingerie, etc.), not coarse legacy buckets.
 */

export type SaleCategoryOption = { key: string; label: string };

/** Clothing sale filters — aligned with /shop/clothing taxonomy menu. */
export const SALE_CLOTHING_CATEGORY_OPTIONS: SaleCategoryOption[] = [
  { key: "all", label: "All" },
  { key: "dresses", label: "Dresses" },
  { key: "tops", label: "Tops" },
  { key: "shirts", label: "Shirts" },
  { key: "blouses", label: "Blouses" },
  { key: "tanks", label: "Tanks & Camisoles" },
  { key: "trousers", label: "Trousers" },
  { key: "jeans", label: "Jeans" },
  { key: "skirts", label: "Skirts" },
  { key: "shorts", label: "Shorts" },
  { key: "knitwear", label: "Knitwear" },
  { key: "coats", label: "Coats" },
  { key: "jackets", label: "Jackets" },
  { key: "jumpsuits", label: "Jumpsuits" },
  { key: "matching-sets", label: "Matching Sets" },
  { key: "swimwear", label: "Swimwear" },
  { key: "lingerie", label: "Lingerie" },
  { key: "sleepwear", label: "Sleepwear" },
];

/** Shoe sale style filters — aligned with /shop/shoes taxonomy (client keyword gate). */
export const SALE_SHOES_CATEGORY_OPTIONS: SaleCategoryOption[] = [
  { key: "all", label: "All" },
  { key: "flats", label: "Flat Shoes" },
  { key: "loafers", label: "Loafers" },
  { key: "sneakers", label: "Sneakers" },
  { key: "boots", label: "Boots" },
  { key: "ankle-boots", label: "Ankle Boots" },
  { key: "heels", label: "Heels" },
  { key: "pumps", label: "Pumps" },
  { key: "sandals", label: "Sandals" },
  { key: "mules", label: "Mules" },
];

export function saleCategoryOptionsForDepartment(department: "clothing" | "shoes"): SaleCategoryOption[] {
  return department === "shoes" ? SALE_SHOES_CATEGORY_OPTIONS : SALE_CLOTHING_CATEGORY_OPTIONS;
}

/** Keyword gate for shoe sale subcategories (footwear sale RPC returns all styles). */
export function productMatchesSaleShoeCategory(
  product: { name?: string | null; category?: string | null },
  categoryKey: string
): boolean {
  if (!categoryKey || categoryKey === "all") return true;
  const text = `${product.category || ""} ${product.name || ""}`.toLowerCase();
  switch (categoryKey) {
    case "flats":
      return /\b(flat|ballet flat|ballerina)\b/.test(text);
    case "loafers":
      return /\b(loafer|moccasin)\b/.test(text);
    case "sneakers":
      return /\b(sneaker|trainer)\b/.test(text);
    case "boots":
      return /\bboot\b/.test(text) && !/\bankle boot\b/.test(text);
    case "ankle-boots":
      return /\bankle boot\b/.test(text);
    case "heels":
      return /\b(heel|stiletto|wedge)\b/.test(text) && !/\bpump\b/.test(text);
    case "pumps":
      return /\bpump\b/.test(text);
    case "sandals":
      return /\b(sandal|slide|flip flop|thong)\b/.test(text);
    case "mules":
      return /\bmule\b/.test(text);
    default:
      return true;
  }
}
