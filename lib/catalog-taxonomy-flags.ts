/**
 * Catalog taxonomy navigation gate — routes/API may deploy while nav stays off.
 * Set NEXT_PUBLIC_CATALOG_TAXONOMY_NAV=1 (or CATALOG_TAXONOMY_NAV=1 server-side) to enable Shop hub links.
 */
export function isCatalogTaxonomyNavEnabled(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_CATALOG_TAXONOMY_NAV ??
    process.env.CATALOG_TAXONOMY_NAV ??
    "0";
  const v = String(raw).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
