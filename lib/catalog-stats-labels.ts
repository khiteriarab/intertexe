/**
 * Canonical copy for product/brand counts — web + iOS should use the same RPC sources;
 * these helpers only format numbers for display (no hardcoded marketing totals).
 */

export function formatStatCount(n: number, plusThreshold = 1000): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  return n >= plusThreshold ? `${n.toLocaleString()}+` : n.toLocaleString();
}

export function formatProductCountLabel(n: number): string {
  return formatStatCount(n, 1000);
}

export function formatBrandCountLabel(n: number): string {
  return formatStatCount(n, 20);
}

/** Prefer fast count RPC; fall back to listed directory length when RPC unavailable. */
export function resolveShoppableBrandCount(
  platformBrandCount: number,
  listedBrandCount: number
): number {
  if (platformBrandCount > 0) return platformBrandCount;
  return listedBrandCount;
}

export function directoryHeadline(productCount: number, brandCount: number): string {
  return `${formatProductCountLabel(productCount)} verified products across ${formatBrandCountLabel(brandCount)} brands in natural silk, linen, cotton, wool, and cashmere.`;
}

export function searchBrandsPlaceholder(brandCount: number): string {
  return `Search ${formatBrandCountLabel(brandCount)} brands...`;
}

/** SEO / layout fallback when counts are not loaded server-side */
export const GENERIC_SITE_DESCRIPTION =
  "INTERTEXE is the luxury fashion search engine for natural fabrics. Shop verified silk, cashmere, linen, wool, and cotton from brands ranked by natural fiber quality.";
