import { canonicalProductId } from "./canonical-product-id";

type Favoritable = {
  id?: string | null;
  productId?: string | null;
  isSale?: boolean | null;
};

/** Surface wishlist + sale pieces first while shopping (web — no app update required). */
export function prioritizeFavoritedProducts<T extends Favoritable>(
  products: T[],
  favoriteIds: Iterable<string>
): T[] {
  const fav = new Set(
    [...favoriteIds].map((id) => String(id || "").trim()).filter(Boolean)
  );
  if (fav.size === 0 && !products.some((p) => p.isSale)) return products;

  const rank = (p: T): number => {
    const keys = [
      canonicalProductId({ id: p.id, product_id: p.productId }),
      String(p.productId || ""),
      String(p.id || ""),
    ].filter(Boolean);
    const saved = keys.some((k) => fav.has(k));
    if (saved && p.isSale) return 0;
    if (saved) return 1;
    if (p.isSale) return 2;
    return 3;
  };

  return [...products].sort((a, b) => rank(a) - rank(b));
}
