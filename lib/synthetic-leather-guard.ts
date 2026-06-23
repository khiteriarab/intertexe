/**
 * Faux / vegan / PU leather — not natural fiber; exclude from consumer catalog.
 * Parity with iOS WomensCatalogGuard + Supabase catalog_is_synthetic_leather_text.
 */

const SYNTHETIC_LEATHER =
  /(vegan\s+leather|faux[\s-]?leather|pu\s+leather|polyurethane\s+leather|pleather|synthetic\s+leather|leatherette|imitation\s+leather|bonded\s+leather|eco[\s-]?leather|vegan\s+suede|faux\s+suede|artificial\s+leather|vinyl\s+leather|pvc\s+leather)/i;

export function isSyntheticLeatherText(text?: string | null): boolean {
  const blob = String(text || "").trim();
  if (!blob) return false;
  return SYNTHETIC_LEATHER.test(blob);
}

export function isSyntheticLeatherProduct(row: {
  name?: string | null;
  title?: string | null;
  composition?: string | null;
}): boolean {
  const name = String(row.name || row.title || "");
  const composition = String(row.composition || "");
  return isSyntheticLeatherText(name) || isSyntheticLeatherText(composition);
}
