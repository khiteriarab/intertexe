/** Paginated catalog responses — first page renders before total count resolves. */
export type CatalogListResult<T = unknown> = {
  products: T[];
  /** null while count loads asynchronously */
  total: number | null;
  hasMore: boolean;
};

export function catalogHasMore(productsLength: number, limit: number, total: number | null): boolean {
  if (total != null && total >= 0) {
    return productsLength < total;
  }
  return productsLength >= limit;
}
