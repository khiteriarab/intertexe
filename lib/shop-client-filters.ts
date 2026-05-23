import { garmentTypesForShopCategory } from "./catalog-shop-mappings";

export type ShopPriceCap = 100 | 300 | 600 | null;

export function parseProductPrice(price: unknown): number {
  const n = parseFloat(String(price ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function productMatchesPriceCap(price: unknown, cap: ShopPriceCap): boolean {
  if (cap == null) return true;
  const p = parseProductPrice(price);
  if (p <= 0) return false;
  return p <= cap;
}

export function productMatchesShopPrice(
  price: unknown,
  cap: ShopPriceCap,
  sixHundredPlus: boolean
): boolean {
  const p = parseProductPrice(price);
  if (p <= 0) return false;
  if (sixHundredPlus) return p > 600;
  return productMatchesPriceCap(price, cap);
}

export function productMatchesAnyShopCategory(
  row: { garment_type?: string | null; category?: string | null },
  categories: string[]
): boolean {
  if (!categories.length) return true;
  for (const cat of categories) {
    const types = garmentTypesForShopCategory(cat);
    const gt = String(row.garment_type || "").toLowerCase();
    if (types?.length && types.includes(gt)) return true;
    const catField = String(row.category || "").toLowerCase();
    if (catField.includes(cat.toLowerCase())) return true;
  }
  return false;
}
