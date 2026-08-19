/** Infer garment type from product name or category text. */
export function detectGarmentType(
  productName?: string | null,
  category?: string | null
): string | null {
  const text = `${productName || ''} ${category || ''}`.toLowerCase();

  if (/dress|gown/.test(text) && /\bdress\b|\bgown\b|\bkaftan\b|\bcaftan\b/.test(text)) return "dress";
  if (/\bskirt\b/.test(text)) return "skirt";
  if (/\b(trouser|pant|jean|legging|culotte)s?\b/.test(text)) return "trouser";
  if (/\b(knit|sweater|pullover|cardigan|jumper)\b/.test(text)) return "knitwear";
  if (/\b(coat|jacket|blazer|outerwear|cape)\b/.test(text)) return "outerwear";
  if (/\b(jumpsuit|playsuit|romper|overall)\b/.test(text)) return "jumpsuit";
  if (/\b(blouse|t-?shirt|tee|tank|camisole|top|shirt)\b/.test(text) && !/\bdress\b/.test(text)) return "top";

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
