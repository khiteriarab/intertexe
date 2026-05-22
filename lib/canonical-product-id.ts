/** Stable save key for wishlist sync (web + iOS). Prefer merchant product_id when present. */
export function canonicalProductId(product: {
  id?: string | number | null;
  productId?: string | null;
  product_id?: string | null;
}): string {
  const pid = product.productId ?? product.product_id ?? product.id;
  return String(pid ?? "").trim();
}
