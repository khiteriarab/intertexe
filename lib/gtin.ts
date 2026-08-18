/**
 * GTIN-8 / GTIN-12 (UPC-A) / GTIN-13 (EAN) / GTIN-14 validation.
 * Identifiers are strings so leading zeroes are preserved.
 */

export const GTIN_LENGTHS = [8, 12, 13, 14] as const;
export type GtinLength = (typeof GTIN_LENGTHS)[number];

export type GtinParseResult =
  | { ok: true; gtin: string; length: GtinLength }
  | { ok: false; error: "empty" | "not_numeric" | "bad_length" | "bad_check_digit" };

const PRESENTATION = /[\s\-.]/g;

export function stripGtinPresentation(raw: string | null | undefined): string {
  return String(raw || "").trim().replace(PRESENTATION, "");
}

/** GS1 check digit: from the right of the payload, odd positions ×3. */
export function gtinCheckDigit(bodyWithoutCheck: string): number {
  const digits = bodyWithoutCheck.split("");
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const n = Number(digits[digits.length - 1 - i]);
    sum += i % 2 === 0 ? n * 3 : n;
  }
  return (10 - (sum % 10)) % 10;
}

export function appendGtinCheckDigit(bodyWithoutCheck: string): string {
  return `${bodyWithoutCheck}${gtinCheckDigit(bodyWithoutCheck)}`;
}

export function isValidGtinCheckDigit(gtin: string): boolean {
  if (!/^\d+$/.test(gtin) || !GTIN_LENGTHS.includes(gtin.length as GtinLength)) return false;
  const body = gtin.slice(0, -1);
  const check = Number(gtin.slice(-1));
  return gtinCheckDigit(body) === check;
}

export function parseGtin(raw: string | null | undefined): GtinParseResult {
  const stripped = stripGtinPresentation(raw);
  if (!stripped) return { ok: false, error: "empty" };
  if (!/^\d+$/.test(stripped)) return { ok: false, error: "not_numeric" };
  if (!GTIN_LENGTHS.includes(stripped.length as GtinLength)) {
    return { ok: false, error: "bad_length" };
  }
  if (!isValidGtinCheckDigit(stripped)) return { ok: false, error: "bad_check_digit" };
  return { ok: true, gtin: stripped, length: stripped.length as GtinLength };
}

/** Lookup keys that preserve the submitted GTIN plus common zero-padded siblings. */
export function gtinLookupCandidates(gtin: string): string[] {
  const digits = gtin.replace(/\D/g, "");
  const out = new Set<string>([digits]);
  for (const len of GTIN_LENGTHS) {
    if (digits.length <= len) out.add(digits.padStart(len, "0"));
  }
  return [...out];
}
