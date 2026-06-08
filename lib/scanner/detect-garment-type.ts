/** Infer garment type from product name or category text. */
export function detectGarmentType(
  productName?: string | null,
  category?: string | null
): string | null {
  const text = `${productName || ''} ${category || ''}`.toLowerCase();

  if (/dress|gown|midi dress|maxi dress|mini dress/.test(text)) return 'dress';
  if (/skirt|midi skirt|maxi skirt|mini skirt/.test(text)) return 'skirt';
  if (/trouser|pant|jean|legging|culotte/.test(text)) return 'trouser';
  if (/knit|sweater|pullover|cardigan|jumper/.test(text)) return 'knitwear';
  if (/coat|jacket|blazer|outerwear|vest|cape/.test(text)) return 'outerwear';
  if (/jumpsuit|playsuit|romper|overall/.test(text)) return 'jumpsuit';
  if (/top|blouse|shirt|tee|tank|camisole/.test(text)) return 'top';

  return null;
}

/** Prefer composition keywords over barcode title when inferring garment type. */
export function detectGarmentTypeFromComposition(
  composition: string,
  productName: string,
  category: string
): string | null {
  const text = `${productName} ${category} ${composition}`.toLowerCase();

  if (/\bdress\b|gown|midi dress|maxi dress/.test(text)) return 'dress';
  if (/\bskirt\b/.test(text)) return 'skirt';
  if (/\btrouser\b|\bpant\b|\bjean\b/.test(text)) return 'trouser';
  if (/\bknit\b|sweater|cardigan|pullover/.test(text)) return 'knitwear';
  if (/\bjacket\b|\bcoat\b|\bblazer\b/.test(text)) return 'outerwear';
  if (/\bjumpsuit\b|playsuit\b/.test(text)) return 'jumpsuit';
  if (/\btop\b|blouse|\bshirt\b/.test(text)) return 'top';

  return null;
}
