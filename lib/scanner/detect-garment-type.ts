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
