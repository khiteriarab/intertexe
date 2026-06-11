/** Canonical fiber keys used after synonym normalization. */
export const FIBER_SYNONYMS: Record<string, string> = {
  // Polyamide / Nylon
  polyamide: 'polyamide',
  poliamida: 'polyamide',
  polyamid: 'polyamide',
  polamid: 'polyamide',
  poyanne: 'polyamide',
  poleng: 'polyamide',
  poiamidno: 'polyamide',
  nylon: 'polyamide',
  nailon: 'polyamide',
  'ナイロン': 'polyamide',
  '나일론': 'polyamide',
  '尼龙': 'polyamide',
  pa: 'polyamide',

  // Elastane
  elastane: 'elastane',
  elastano: 'elastane',
  elasthanne: 'elastane',
  elastaan: 'elastane',
  elastan: 'elastane',
  'elastà': 'elastane',
  elastanoa: 'elastane',
  spandex: 'elastane',
  lycra: 'elastane',
  'エラスタン': 'elastane',
  ea: 'elastane',

  // Linen
  linen: 'linen',
  lin: 'linen',
  lino: 'linen',
  leinen: 'linen',
  vlas: 'linen',
  flax: 'linen',

  // Cotton
  cotton: 'cotton',
  coton: 'cotton',
  algodon: 'cotton',
  algodón: 'cotton',
  algodao: 'cotton',
  algodão: 'cotton',
  cotone: 'cotton',
  baumwolle: 'cotton',
  katoen: 'cotton',
  '棉': 'cotton',
  'コットン': 'cotton',
  '綿': 'cotton',

  // Wool
  wool: 'wool',
  laine: 'wool',
  lana: 'wool',
  wolle: 'wool',
  wol: 'wool',
  'wełna': 'wool',
  welna: 'wool',
  '羊毛': 'wool',

  // Silk
  silk: 'silk',
  soie: 'silk',
  seda: 'silk',
  seta: 'silk',
  seide: 'silk',
  zijde: 'silk',
  '絹': 'silk',
  '丝': 'silk',

  // Viscose
  viscose: 'viscose',
  viscosa: 'viscose',
  viskose: 'viscose',
  rayon: 'viscose',
  vi: 'viscose',

  // Cashmere
  cashmere: 'cashmere',
  cachemire: 'cashmere',
  cachemira: 'cashmere',
  cachemir: 'cashmere',
  kaschmir: 'cashmere',
  kasjmier: 'cashmere',
  ca: 'cashmere',

  // Polyester
  polyester: 'polyester',
  poliester: 'polyester',
  poliéster: 'polyester',
  poliestere: 'polyester',
  pet: 'polyester',
  pl: 'polyester',

  // Other common
  acrylic: 'acrylic',
  acrylique: 'acrylic',
  ramie: 'ramie',
  ramio: 'ramie',
  hemp: 'hemp',
  chanvre: 'hemp',
  canapa: 'hemp',
  'cáñamo': 'hemp',
  cañamo: 'hemp',
};

export function mapFiberSynonym(raw: string): string | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[®™©.]/g, '');
  if (!cleaned || cleaned.length < 2) return null;
  return FIBER_SYNONYMS[cleaned] ?? null;
}

export function normalizeFiberToken(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(organic|european|egyptian|pima|supima|mongolian|scottish|virgin|baby|suri|mulberry|recycled|certified|bci|gots)\s+/gi, '')
    .replace(/[®™©]/g, '')
    .trim();

  const mapped = mapFiberSynonym(cleaned);
  if (mapped) return mapped;
  if (/flax/.test(cleaned)) return 'linen';
  if (/merino/.test(cleaned)) return 'merino';
  if (/lambswool|shetland/.test(cleaned)) return 'wool';
  if (/denim/.test(cleaned)) return 'cotton';
  if (/econyl/.test(cleaned)) return 'polyamide';
  if (/spandex/.test(cleaned)) return 'elastane';
  if (/rayon/.test(cleaned)) return 'viscose';

  const words = cleaned.split(/[\s\-\/,•·]+/).filter((w) => w.length > 2);
  for (const word of words) {
    const hit = mapFiberSynonym(word);
    if (hit) return hit;
  }

  return cleaned.split(/\s+/).pop() || cleaned;
}
