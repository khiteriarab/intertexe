const EUR_TO_USD = 1.08;
const GBP_TO_USD = 1.27;
const CAD_TO_USD = 0.73;

export function detectCurrencyFromText(text: string): string {
  const upper = text.toUpperCase();
  if (text.includes('€') || upper.includes('EUR')) return 'EUR';
  if (text.includes('£') || upper.includes('GBP')) return 'GBP';
  if (text.includes('CA$') || upper.includes('CAD')) return 'CAD';
  if (text.includes('$') || upper.includes('USD')) return 'USD';
  return 'USD';
}

/** Parse European tag prices like €3995 → 39.95 when decimal is omitted. */
export function parseEuropeanPrice(
  rawPrice: string | number | null | undefined,
  currency = 'USD'
): number | null {
  if (rawPrice == null || rawPrice === '') return null;
  if (typeof rawPrice === 'number') {
    return normalizeEuropeanAmount(rawPrice, currency);
  }

  let cleaned = String(rawPrice).replace(/[€$£¥\s]/g, '').trim();
  if (!cleaned) return null;

  const cur = currency || detectCurrencyFromText(String(rawPrice));

  if (!cleaned.includes('.') && !cleaned.includes(',')) {
    const num = parseInt(cleaned.replace(/\D/g, ''), 10);
    if (!Number.isFinite(num) || num <= 0) return null;
    return normalizeEuropeanAmount(num, cur);
  }

  cleaned = cleaned.replace(',', '.');
  const parsed = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeEuropeanAmount(num: number, currency: string): number {
  const cur = currency.toUpperCase();
  if (num > 999 && (cur === 'EUR' || cur === 'GBP')) {
    return Math.round((num / 100) * 100) / 100;
  }
  return num;
}

export function toPriceUSD(price: number, currency?: string | null): number {
  switch ((currency || 'USD').toUpperCase()) {
    case 'EUR':
      return price * EUR_TO_USD;
    case 'GBP':
      return price * GBP_TO_USD;
    case 'CAD':
      return price * CAD_TO_USD;
    default:
      return price;
  }
}
