import type { Product } from "./supabase-server";

export const HOMEPAGE_SALE_MIN_PRICE = 150;

const PRIORITY_BRAND_SLUGS = [
  "a-l-c",
  "alc",
  "isabel-marant",
  "faithfull",
  "faithfull-the-brand",
  "lafayette-148",
  "re-done",
  "reformation",
  "zimmermann",
  "vince",
  "theory",
  "frame",
  "veronica-beard",
];

function parsePrice(price: string | null | undefined): number {
  if (!price) return 0;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function isPriorityBrand(product: Product): boolean {
  const slug = (product.brandSlug || "").toLowerCase();
  const name = (product.brandName || "").toLowerCase();
  return PRIORITY_BRAND_SLUGS.some(
    (b) => slug.includes(b) || name.includes(b.replace(/-/g, " "))
  );
}

/** Homepage sale rail — luxury floor price + preferred brand ordering. */
export function filterHomepageSaleProducts(products: Product[], limit = 8): Product[] {
  const priced = products.filter((p) => parsePrice(p.price) >= HOMEPAGE_SALE_MIN_PRICE);
  const priority = priced.filter(isPriorityBrand);
  const rest = priced.filter((p) => !priority.includes(p));
  return [...priority, ...rest].slice(0, limit);
}
