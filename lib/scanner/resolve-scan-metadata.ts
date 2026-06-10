import { resolveDisplayBrand } from './scan-session-store';

export function deriveBrandSlug(brandName: string): string {
  return brandName
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Pull a leading brand token from noisy UPC / marketplace titles. */
export function extractBrandFromProductName(productName?: string | null): string | null {
  const name = String(productName || '').trim();
  if (!name) return null;

  const firstSegment = name.split(/[|\-–—]/)[0]?.trim() || name;
  const words = firstSegment.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const twoWord = words.slice(0, 2).join(' ');
  const oneWord = words[0];
  const candidate = words.length >= 2 && oneWord.length <= 3 ? twoWord : oneWord;
  const cleaned = candidate.replace(/[^a-zA-ZÀ-ÿ&'.]/g, '').trim();
  if (!cleaned || cleaned.length < 2) return null;
  if (/^(the|a|an|new|women|men|womens|mens)$/i.test(cleaned)) return null;
  return cleaned;
}

export function resolveScanBrand(input: {
  sessionBrand?: string | null;
  barcodeBrand?: string | null;
  barcodeBrandSlug?: string | null;
  extractedBrand?: string | null;
  productName?: string | null;
}): { brandName: string; brandSlug: string } {
  const sessionBrand = resolveDisplayBrand(input.sessionBrand);
  if (sessionBrand) {
    return { brandName: sessionBrand, brandSlug: deriveBrandSlug(sessionBrand) };
  }

  const barcodeBrand = resolveDisplayBrand(input.barcodeBrand);
  if (barcodeBrand) {
    return {
      brandName: barcodeBrand,
      brandSlug: input.barcodeBrandSlug || deriveBrandSlug(barcodeBrand),
    };
  }

  const extractedBrand = resolveDisplayBrand(input.extractedBrand);
  if (extractedBrand) {
    return { brandName: extractedBrand, brandSlug: deriveBrandSlug(extractedBrand) };
  }

  const fromName = extractBrandFromProductName(input.productName);
  if (fromName) {
    return { brandName: fromName, brandSlug: deriveBrandSlug(fromName) };
  }

  return { brandName: '', brandSlug: '' };
}

export function resolveGarmentType(input: {
  bodyGarmentType?: string | null;
  productName?: string | null;
  composition?: string | null;
  category?: string | null;
}): string | null {
  const bodyType = String(input.bodyGarmentType || '').trim().toLowerCase();
  if (bodyType && bodyType !== 'unknown') return bodyType;

  const allText = `${input.productName || ''} ${input.composition || ''} ${input.category || ''}`.toLowerCase();

  if (/\bdress\b|gown|midi dress|maxi dress|mini dress/.test(allText)) return 'dress';
  if (/\bskirt\b/.test(allText)) return 'skirt';
  if (/\btrouser\b|\bpant\b|\bjean\b|\bslack\b/.test(allText)) return 'trouser';
  if (/\bknit\b|sweater|cardigan|pullover|jumper/.test(allText)) return 'knitwear';
  if (/\bjacket\b|\bcoat\b|\bblazer\b/.test(allText)) return 'outerwear';
  if (/\bjumpsuit\b|playsuit|romper/.test(allText)) return 'jumpsuit';
  if (/\btop\b|\bblouse\b|\bshirt\b|\btee\b/.test(allText)) return 'top';

  return null;
}
