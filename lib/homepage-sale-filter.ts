import type { Product } from "./supabase-server";

function parsePrice(price: string | null | undefined): number {
  if (!price) return 0;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function discountPct(product: Product): number {
  const original = parsePrice(product.originalPrice);
  const current = parsePrice(product.price);
  if (original <= 0 || current <= 0) return 0;
  return Math.round((1 - current / original) * 100);
}

/** Homepage sale rail — same catalog as /sale, ranked by discount for the horizontal scroll. */
export function filterHomepageSaleProducts(products: Product[], limit = 28): Product[] {
  const seen = new Set<string>();
  return products
    .filter((p) => parsePrice(p.price) > 0)
    .sort(
      (a, b) =>
        discountPct(b) - discountPct(a) ||
        parsePrice(b.price) - parsePrice(a.price)
    )
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .slice(0, limit);
}
