const RATES: Record<string, number> = {
  EUR: 1.08,
  GBP: 1.27,
  CHF: 1.12,
  AUD: 0.65,
  CAD: 0.73,
  JPY: 0.0067,
  KRW: 0.00073,
  HKD: 0.13,
  SGD: 0.74,
  RMB: 0.14,
  NOK: 0.093,
  SEK: 0.095,
  USD: 1.0,
};

const NO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'IDR', 'VND']);
const DISCOUNT_PERCENTS = new Set([10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80]);

const REGION_CURRENCY_TOKENS: Record<string, string[]> = {
  us: ['USD', 'US$', '$'],
  uk: ['GBP', '£'],
  eu: ['EUR', '€'],
  ca: ['CAD', 'CA$'],
  au: ['AUD', 'A$'],
  jp: ['JPY', '¥'],
  kr: ['KRW', '₩'],
  sg: ['SGD'],
  hk: ['HKD'],
  cn: ['RMB', 'CNY'],
  ch: ['CHF'],
  no: ['NOK'],
  se: ['SEK'],
  all: ['USD', 'EUR', 'GBP'],
};

const SYMBOL_PRICE_PATTERNS: Array<[RegExp, string]> = [
  [/\$\s*([0-9]{1,6}(?:[.,][0-9]{2})?)/, 'USD'],
  [/€\s*([0-9]{1,6}(?:[.,][0-9]{2})?)/, 'EUR'],
  [/£\s*([0-9]{1,6}(?:[.,][0-9]{2})?)/, 'GBP'],
  [/¥\s*([0-9]{1,6}(?:[.,][0-9]{2})?)/, 'JPY'],
  [/USD\s*([0-9]{1,6}(?:[.,][0-9]{2})?)/i, 'USD'],
  [/EUR\s*([0-9]{1,6}(?:[.,][0-9]{2})?)/i, 'EUR'],
  [/GBP\s*([0-9]{1,6}(?:[.,][0-9]{2})?)/i, 'GBP'],
];

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
  if (upper.includes('HKD')) return 'HKD';
  if (upper.includes('SGD')) return 'SGD';
  if (upper.includes('RMB') || upper.includes('CNY')) return 'RMB';
  if (upper.includes('NOK')) return 'NOK';
  if (upper.includes('SEK')) return 'SEK';
  if (rawText.includes('$') || upper.includes('USD')) return 'USD';
  return fallback;
}

function currencyCodeFromToken(token: string): string {
  switch (token.toUpperCase()) {
    case '$':
    case 'US$':
      return 'USD';
    case '£':
      return 'GBP';
    case '€':
      return 'EUR';
    case '¥':
      return 'JPY';
    case '₩':
      return 'KRW';
    case 'CA$':
      return 'CAD';
    case 'A$':
      return 'AUD';
    default:
      return token.toUpperCase();
  }
}

export function mergeSuperscriptPrices(text: string): string {
  let result = text;
  const patterns: Array<[RegExp, string]> = [
    [/([€£$¥])\s*(\d{1,4})\s+(\d{2})\b/g, '$1$2.$3'],
    [/(\d{1,4})\s+(\d{2})\s*€/g, '$1.$2€'],
    [/([€£$])\s*(\d{1,4})\^(\d{2})\b/gi, '$1$2.$3'],
    [/(\d{1,4})\^(\d{2})\s*€/g, '$1.$2€'],
    [/EUR\s+(\d{1,4})\s+(\d{2})/gi, 'EUR $1.$2'],
    [/GBP\s+(\d{1,4})\s+(\d{2})/gi, 'GBP $1.$2'],
    [/USD\s+(\d{1,4})\s+(\d{2})/gi, 'USD $1.$2'],
  ];
  for (const [pattern, replacement] of patterns) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** Remove fiber percentages before bare-number parsing — 97% must never become $97. */
export function stripFiberPercentages(text: string): string {
  return text.replace(/\d+\.?\d*\s*%/g, ' ');
}

/** Currency-symbol prices always win over bare numbers. */
export function extractCurrencyPrice(
  rawText: string
): { price: number; currency: string } | null {
  const text = mergeSuperscriptPrices(rawText);
  for (const [pattern, currency] of SYMBOL_PRICE_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const price = parseFloat(match[1].replace(',', '.'));
    if (Number.isFinite(price) && price > 0) {
      return { price, currency };
    }
  }
  const priceLabel = text.match(/price[:\s]*([0-9]{1,6}(?:[.,][0-9]{2})?)/i);
  if (priceLabel?.[1]) {
    const price = parseFloat(priceLabel[1].replace(',', '.'));
    const currency = detectCurrencyFromPriceText(text);
    if (Number.isFinite(price) && price > 0) {
      return { price, currency };
    }
  }
  return null;
}

export function selectBestPriceFromNumbers(numbers: number[], currency: string): number | null {
  const filtered = numbers.filter((n) => {
    const intValue = Math.trunc(n);
    const isInteger = n === intValue;
    if (isInteger && intValue >= 24 && intValue <= 44 && intValue % 2 === 0) return false;
    if (isInteger && n > 9 && n < 100 && DISCOUNT_PERCENTS.has(intValue)) return false;
    if (n > 1900 && n < 2100) return false;
    const minPrice = currency === 'JPY' ? 100 : 1;
    const maxPrice = currency === 'JPY' ? 500000 : 5000;
    return n >= minPrice && n <= maxPrice;
  });
  if (filtered.length === 0) return null;
  const sorted = [...filtered].sort((a, b) => a - b);
  if (sorted.length > 1 && sorted[0] < sorted[1] * 0.3) {
    return sorted[1];
  }
  return sorted[0];
}

export function selectRegionPrice(
  text: string,
  region: string
): { price: number; currency: string } | null {
  const preferred = REGION_CURRENCY_TOKENS[region.toLowerCase()] ?? REGION_CURRENCY_TOKENS.us;
  for (const token of preferred) {
    const code = currencyCodeFromToken(token);
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`${escaped}\\s*([0-9]+(?:[.,][0-9]{2})?)`, 'i'),
      new RegExp(`([0-9]+(?:[.,][0-9]{2})?)\\s*${escaped}`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match?.[1]) continue;
      const price = parseFloat(match[1].replace(',', '.'));
      if (Number.isFinite(price) && price > 0) {
        return { price, currency: code };
      }
    }
  }
  return null;
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

export function parseRealWorldPrice(
  rawText: string | number | null | undefined,
  currency?: string | null,
  region?: string | null
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

  const raw = mergeSuperscriptPrices(String(rawText));
  const resolvedRegion = (region || 'us').toLowerCase();

  // Step 1 — currency symbol prices always win
  if (typeof rawText === 'string') {
    const currencyPrice = extractCurrencyPrice(raw);
    if (currencyPrice) {
      const cur = currencyPrice.currency.toUpperCase();
      return {
        originalPrice: currencyPrice.price,
        priceUSD: currencyPrice.price * (RATES[cur] || 1),
        currency: cur,
      };
    }

    const regionPrice = selectRegionPrice(raw, resolvedRegion);
    if (regionPrice) {
      const cur = regionPrice.currency.toUpperCase();
      return {
        originalPrice: regionPrice.price,
        priceUSD: regionPrice.price * (RATES[cur] || 1),
        currency: cur,
      };
    }
  }

  const detectedCurrency = (currency || detectCurrencyFromPriceText(raw)).toUpperCase();

  // Step 2 — strip percentages before bare number parsing
  let working = raw
    .replace(/-\d+\s*%/gi, ' ')
    .replace(/\b\d{1,3}\s*%\s*(off)?/gi, ' ');
  working = stripFiberPercentages(working);

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

  const price = selectBestPriceFromNumbers(validPrices, detectedCurrency);
  if (price == null) return null;

  return {
    originalPrice: price,
    priceUSD: price * (RATES[detectedCurrency] || 1),
    currency: detectedCurrency,
  };
}

export function toPriceUSD(price: number, currency?: string | null): number {
  const cur = (currency || 'USD').toUpperCase();
  return price * (RATES[cur] || 1);
}
