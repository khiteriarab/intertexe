/** Consumer-facing natural fiber % — capped 0–100 everywhere we render or tier-score. */
export function displayNaturalFiberPercent(
  nfp: number | null | undefined
): number | null {
  if (nfp == null || Number.isNaN(Number(nfp))) return null;
  return Math.min(100, Math.max(0, Math.round(Number(nfp))));
}
