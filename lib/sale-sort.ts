/** Normalize sale sort query params from web, iOS, and legacy clients. */
export function normalizeSaleSort(raw?: string | null): string {
  const sort = (raw || "discount").toLowerCase().trim();
  switch (sort) {
    case "price-low":
    case "price_asc":
    case "price-low-high":
    case "pricelowhigh":
      return "price-low";
    case "price-high":
    case "price_desc":
    case "price-high-low":
    case "pricehighlow":
      return "price-high";
    case "new":
    case "newest":
    case "new_in":
      return "new";
    case "natural":
    case "natural-high":
    case "natural_high":
    case "most_natural":
      return "natural-high";
    case "discount":
    default:
      return "discount";
  }
}

export type SaleSortKey = ReturnType<typeof normalizeSaleSort>;

function parseSalePrice(price: string | null | undefined): number {
  if (!price) return 0;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function saleDiscountPercent(originalPrice: string | null | undefined, price: string | null | undefined): number {
  const orig = parseSalePrice(originalPrice);
  const curr = parseSalePrice(price);
  if (!orig || !curr || orig <= curr) return 0;
  return ((orig - curr) / orig) * 100;
}

/** Client-side sale sort — instant reorder without refetching page 1. */
export function sortSaleProducts<T extends {
  price?: string | null;
  originalPrice?: string | null;
  original_price?: string | null;
  naturalFiberPercent?: number | null;
  natural_fiber_percent?: number | null;
  createdAt?: string | null;
  created_at?: string | null;
}>(products: T[], sort: SaleSortKey | string): T[] {
  const key = normalizeSaleSort(sort);
  const copy = [...products];
  switch (key) {
    case "price-low":
      return copy.sort((a, b) => parseSalePrice(a.price) - parseSalePrice(b.price));
    case "price-high":
      return copy.sort((a, b) => parseSalePrice(b.price) - parseSalePrice(a.price));
    case "new":
      return copy.sort((a, b) => {
        const aDate = a.createdAt ?? a.created_at ?? "";
        const bDate = b.createdAt ?? b.created_at ?? "";
        return bDate.localeCompare(aDate);
      });
    case "natural-high":
      return copy.sort((a, b) => {
        const aN = a.naturalFiberPercent ?? a.natural_fiber_percent ?? 0;
        const bN = b.naturalFiberPercent ?? b.natural_fiber_percent ?? 0;
        return bN - aN;
      });
    case "discount":
    default:
      return copy.sort((a, b) => {
        const aDisc = saleDiscountPercent(a.originalPrice ?? a.original_price, a.price);
        const bDisc = saleDiscountPercent(b.originalPrice ?? b.original_price, b.price);
        return bDisc - aDisc;
      });
  }
}
