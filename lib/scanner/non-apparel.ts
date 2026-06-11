export const NON_APPAREL_INDICATORS = [
  'handbag', 'bag', 'purse', 'wallet', 'belt',
  'shoes', 'boots', 'sneakers', 'heels', 'sandals',
  'throw', 'blanket', 'pillow', 'cushion', 'towel',
];

export const NON_APPAREL_MESSAGE =
  'We focus on clothing. Scan a garment care label for best results.';

export function isNonApparelProduct(name?: string | null): boolean {
  if (!name?.trim()) return false;
  const lower = name.toLowerCase();
  return NON_APPAREL_INDICATORS.some((term) => lower.includes(term));
}
