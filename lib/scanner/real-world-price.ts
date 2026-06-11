const RATES: Record<string, number> = {
  EUR: 1.08,
  GBP: 1.27,
  CHF: 1.12,
  AUD: 0.65,
  CAD: 0.73,
  JPY: 0.0067,
  KRW: 0.00073,
  USD: 1.0,
};

const NO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'IDR', 'VND']);

export type ParsedRealWorldPrice = {
  priceUSD: number;
  originalPrice: number;
  currency: string;
};

export function detectCurrencyFromPriceText(rawText: string, fallback = 'USD'): string {
  const upper = rawText.toUpperCase();
  if (rawText.includes('€') || upper.includes('EUR')) return 'EUR';
  if (rawText.includes('£') || upper.includes('GBP')) return 'GBP';
  if (upper.includes('CHF')) return 'CHF';
  if (rawText.includes('¥') || upper.includes('JPY')) return 'JPY';
  if (rawText.includes('A$') || upper.includes('AUD')) return 'AUD';
  if (rawText.includes('CA$') || upper.includes('CAD')) return 'CAD';
  if (rawText.includes('₩') || upper.includes('KRW')) return 'KRW';
  if (rawText.includes('$') || upper.includes('USD')) return 'USD';
  return fallback;
}

export function parseRealWorldPrice(
  rawText: string | number | null | undefined,
  currency?: string | null
): ParsedRealWorldPrice | null {
  if (rawText == null || rawText === '') return null;

  if (typeof rawText === 'number' && rawText > 0) {
    const cur = (currency || 'USD').toUpperCase();
    const original = normalizeMissingDecimal(
      rawText,
      cur,
      String(rawText).includes('.') || String(rawText).includes(',')
    );
    return {
      originalPrice: original,
      priceUSD: original * (RATES[cur] || 1),
      currency: cur,
    };
  }

  const raw = String(rawText);
  let detectedCurrency = (currency || detectCurrencyFromPriceText(raw)).toUpperCase();

  let working = raw
    .replace(/-\d+\s*%/gi, ' ')
    .replace(/\b\d{1,3}\s*%\s*(off)?/gi, ' ');

  const allNumbers = working.match(/[\d]+[,.]?[\d]*/g) || [];
  const validPrices = allNumbers
    .map((token) => {
      const n = parseFloat(token.replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0 || n >= 100_000) return null;
      const parts = String(n).split('.');
      if (parts.length > 1 && parts[1].length > 2) return null;
      const tokenHasDecimal = token.includes('.') || token.includes(',');
      return normalizeMissingDecimal(n, detectedCurrency, tokenHasDecimal);
    })
    .filter((n): n is number => n != null);

  if (validPrices.length === 0) return null;

  const price = Math.min(...validPrices);

  return {
    originalPrice: price,
    priceUSD: price * (RATES[detectedCurrency] || 1),
    currency: detectedCurrency,
  };
}

function normalizeMissingDecimal(
  value: number,
  currency: string,
  hasDecimal: boolean
): number {
  if (
    !NO_DECIMAL_CURRENCIES.has(currency) &&
    !hasDecimal &&
    value > 999
  ) {
    return Math.round((value / 100) * 100) / 100;
  }
  return value;
}

export function toPriceUSD(price: number, currency?: string | null): number {
  const cur = (currency || 'USD').toUpperCase();
  return price * (RATES[cur] || 1);
}
