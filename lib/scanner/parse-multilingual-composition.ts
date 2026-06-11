import { mapFiberSynonym, normalizeFiberToken } from './fiber-synonyms';

export type ParsedFiberBlock = { fiber: string; percent: number };

/** Parse labels like `85% poliamida - polyamide - nylon` / `15% elastano`. */
export function parseMultilingualComposition(text: string): ParsedFiberBlock[] {
  if (!text?.trim()) return [];

  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const blocks = normalized.match(/\d+\s*%[^0-9]*/g) || [];
  const results: ParsedFiberBlock[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const percentMatch = block.match(/(\d+)\s*%/);
    if (!percentMatch) continue;

    const percent = parseInt(percentMatch[1], 10);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) continue;

    const fiberText = block.slice(percentMatch[0].length);
    const words = fiberText
      .split(/[\s\-\/,•·|]+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 2);

    let canonical: string | null = null;
    for (const word of words) {
      const mapped = mapFiberSynonym(word);
      if (mapped) {
        canonical = mapped;
        break;
      }
    }

    if (!canonical) {
      canonical = normalizeFiberToken(fiberText);
    }

    if (!canonical || canonical.length < 2) continue;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    results.push({ fiber: canonical, percent });
  }

  return results;
}
