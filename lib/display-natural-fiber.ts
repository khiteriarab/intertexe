import { parseCompositionText } from "./material-intelligence/composition";

/** Minimum body natural fiber % for consumer catalog surfaces (PDP parity). */
export const MIN_CATALOG_NATURAL_FIBER_PERCENT = 70;

/** Consumer-facing natural fiber % — capped 0–100 everywhere we render or tier-score. */
export function displayNaturalFiberPercent(
  nfp: number | null | undefined
): number | null {
  if (nfp == null || Number.isNaN(Number(nfp))) return null;
  return Math.min(100, Math.max(0, Math.round(Number(nfp))));
}

/** Parse composition first (PDP parity), else fall back to stored DB value. */
export function naturalFiberPercentFromComposition(
  composition: string | null | undefined,
  storedNfp?: number | null
): number | null {
  const parsed = parseCompositionText(composition);
  if (parsed.natural_fiber_percentage != null) {
    return displayNaturalFiberPercent(parsed.natural_fiber_percentage);
  }
  return displayNaturalFiberPercent(storedNfp);
}

export function isPrimarilySyntheticProduct(p: {
  composition?: string | null;
  naturalFiberPercent?: number | null;
  natural_fiber_percent?: number | null;
}): boolean {
  const stored = p.naturalFiberPercent ?? p.natural_fiber_percent ?? null;
  const nfp = naturalFiberPercentFromComposition(p.composition, stored);
  return nfp == null || nfp < MIN_CATALOG_NATURAL_FIBER_PERCENT;
}
