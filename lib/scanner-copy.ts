/** Approved scanner copy — do not use banned clinical terms in user-facing strings. */

export function getVerdictMessage(percent: number | null | undefined): string {
  const p = percent ?? 0;
  if (p === 100) return 'Exceptional. This piece is entirely natural fiber.';
  if (p >= 80) return 'Good quality. Natural fiber dominant.';
  if (p >= 50) return 'A blend. Here are better alternatives at a similar price.';
  if (p > 0) return 'Mostly synthetic. Here are natural fiber alternatives.';
  return 'Fully synthetic. Here is what it should have been.';
}

export function getVerdictLabel(percent: number | null | undefined): string {
  const p = percent ?? 0;
  if (p === 100) return 'EXCEPTIONAL';
  if (p >= 90) return 'EXCELLENT';
  if (p >= 80) return 'GOOD';
  if (p >= 50) return 'BLEND';
  return 'SYNTHETIC';
}

export function scoreColor(percent: number | null | undefined): string {
  const p = percent ?? 0;
  if (p === 100) return '#0D9488';
  if (p >= 90) return '#1C2B2A';
  if (p >= 80) return '#92400E';
  if (p >= 50) return '#B45309';
  return '#DC2626';
}

export const NEEDS_COMPOSITION_BRAND_KNOWN =
  'For the full fiber breakdown scan the care label inside the garment — usually inside the collar or side seam.';

export const NEEDS_COMPOSITION_GENERIC =
  'For the full fiber breakdown scan the care label inside the garment.';

export const FIRST_SCAN_FOOTNOTE =
  'First scan of this item. Added to the Intertexe edit.';

export function getAlternativesLabel(
  percent: number,
  scannedPrice: number | null | undefined,
  alternatives: { price?: string | number | null }[]
): string {
  if (percent >= 80) return 'MORE LIKE THIS';
  if (!scannedPrice || !alternatives.length) return 'BETTER QUALITY · SIMILAR PRICE';
  const prices = alternatives
    .map((p) => parsePriceNumber(String(p.price ?? '')))
    .filter((n): n is number => n !== null);
  if (!prices.length) return 'BETTER QUALITY · SIMILAR PRICE';
  const avgPrice = prices.reduce((s, n) => s + n, 0) / prices.length;
  if (avgPrice > scannedPrice * 1.15) return 'WORTH THE UPGRADE';
  return 'BETTER QUALITY · SIMILAR PRICE';
}

export function parsePriceNumber(priceStr: string | number | null | undefined): number | null {
  if (priceStr == null || priceStr === '') return null;
  if (typeof priceStr === 'number') return isNaN(priceStr) ? null : priceStr;
  const cleaned = String(priceStr).replace(/[^0-9.,]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function getBestNaturalFiberForPrice(price?: number | null): string {
  if (!price) return 'silk';
  if (price > 600) return 'cashmere';
  if (price > 300) return 'silk';
  if (price > 150) return 'linen';
  return 'cotton';
}
