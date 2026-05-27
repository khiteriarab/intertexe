export const CATALOG_CA_MIN_PRODUCTS = 48;

type CatalogProductKey = { productId: string; id?: string };

/** Merge primary region rows with US supplemental rows when CA inventory is sparse. */
export function mergeProductsWithRegionFallback<T extends CatalogProductKey>(
  primary: T[],
  supplemental: T[],
  minimum: number,
  pageLimit: number
): T[] {
  if (primary.length >= minimum) {
    return primary.slice(0, pageLimit);
  }

  const seen = new Set(primary.map((p) => p.productId || p.id));
  const merged = [...primary];

  for (const product of supplemental) {
    const key = product.productId || product.id;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(product);
    if (merged.length >= Math.max(minimum, pageLimit)) break;
  }

  return merged.slice(0, pageLimit);
}
