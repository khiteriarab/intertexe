/** Hard caps for catalog API + client pagination (prevents timeouts and runaway loads). */
export const CATALOG_API_MAX_LIMIT = 48;
export const CATALOG_MAX_OFFSET = 500;
export const DEFAULT_SHOP_FIBER = "silk";

export function safeCatalogLimit(limit: unknown, fallback = 24): number {
  const n = Number(limit);
  if (!Number.isFinite(n) || n < 1) return Math.min(fallback, CATALOG_API_MAX_LIMIT);
  return Math.min(Math.floor(n), CATALOG_API_MAX_LIMIT);
}

export function safeCatalogOffset(offset: unknown): number {
  const n = Number(offset);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), CATALOG_MAX_OFFSET);
}

export function catalogHasMore(
  pageLength: number,
  pageSize: number,
  offset: number,
  total: number | null | undefined
): boolean {
  if (offset >= CATALOG_MAX_OFFSET) return false;
  if (pageLength < pageSize) return false;
  if (total != null && offset + pageLength >= total) return false;
  if (total != null && offset + pageSize >= total) return false;
  return pageLength >= pageSize;
}

export function isCatalogTimeoutError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "57014") return true;
  const msg = String(error.message || "").toLowerCase();
  return msg.includes("statement timeout") || msg.includes("canceling statement");
}
