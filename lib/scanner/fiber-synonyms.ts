/** Canonical fiber keys used after synonym normalization. */
export const FIBER_SYNONYMS: Record<string, string> = {
  // Cotton
  cotton: 'cotton', coton: 'cotton', 'algodón': 'cotton',
  algodao: 'cotton', 'algodão': 'cotton', cotone: 'cotton',
  baumwolle: 'cotton', katoen: 'cotton', bomull: 'cotton',
  puuvilla: 'cotton', bomuld: 'cotton', pamuk: 'cotton',
  bavlna: 'cotton', 'cotó': 'cotton', co: 'cotton',
  '棉': 'cotton', 'コットン': 'cotton', '綿': 'cotton',
  '면': 'cotton', 'قطن': 'cotton', algodon: 'cotton',

  // Polyamide / Nylon
  polyamide: 'polyamide', nylon: 'polyamide',
  poliamida: 'polyamide', polyamid: 'polyamide',
  polamid: 'polyamide', poliammide: 'polyamide',
  nailon: 'polyamide', 'nilón': 'polyamide',
  poyanne: 'polyamide', poleng: 'polyamide', poiamidno: 'polyamide',
  'ナイロン': 'polyamide', '锦纶': 'polyamide', '尼龍': 'polyamide',
  '나일론': 'polyamide', '尼龙': 'polyamide', 'بوليامد': 'polyamide', pa: 'polyamide',

  // Elastane
  elastane: 'elastane', spandex: 'elastane', lycra: 'elastane',
  elastano: 'elastane', elasthanne: 'elastane',
  elastaan: 'elastane', elastan: 'elastane',
  'elastà': 'elastane', elastanoa: 'elastane',
  'エラスタン': 'elastane', '氨纶': 'elastane',
  'اليستانه': 'elastane', ea: 'elastane',
  elasthane: 'elastane', elasthan: 'elastane',

  // Silk
  silk: 'silk', soie: 'silk', seda: 'silk',
  seta: 'silk', seide: 'silk', zijde: 'silk',
  silke: 'silk', silkki: 'silk', jedwab: 'silk',
  ipek: 'silk', 'حرير': 'silk', '絹': 'silk',
  'シルク': 'silk', '蚕丝': 'silk', '真丝': 'silk', '丝': 'silk',
  '견': 'silk', se: 'silk',

  // Linen
  linen: 'linen', lin: 'linen', lino: 'linen',
  leinen: 'linen', linnen: 'linen', 'льон': 'linen',
  'hør': 'linen', pellava: 'linen', len: 'linen',
  li: 'linen', keten: 'linen', vlas: 'linen',
  'كتان': 'linen', '亚麻': 'linen', 'リネン': 'linen', '린넨': 'linen',
  flax: 'linen',

  // Wool
  wool: 'wool', laine: 'wool', lana: 'wool',
  wolle: 'wool', wol: 'wool', ull: 'wool',
  villa: 'wool', uld: 'wool', 'wełna': 'wool', welna: 'wool',
  'шерсть': 'wool', 'yün': 'wool', 'صوف': 'wool',
  '羊毛': 'wool', 'ウール': 'wool', '울': 'wool', wo: 'wool',

  // Cashmere
  cashmere: 'cashmere', cachemire: 'cashmere',
  cachemira: 'cashmere', kaschmir: 'cashmere',
  kasjmier: 'cashmere', 'кашемир': 'cashmere',
  'kaşmir': 'cashmere', 'كشمير': 'cashmere',
  'カシミヤ': 'cashmere', '开士米': 'cashmere', '캐시미어': 'cashmere',
  cachemir: 'cashmere', wm: 'cashmere',

  // Viscose / Rayon
  viscose: 'viscose', rayon: 'viscose',
  viscosa: 'viscose', viskose: 'viscose',
  vi: 'viscose', cv: 'viscose',
  'レーヨン': 'viscose', '粘胶': 'viscose',

  // Polyester
  polyester: 'polyester', 'poliéster': 'polyester',
  poliester: 'polyester', poliestere: 'polyester',
  'полиэстер': 'polyester', pe: 'polyester',
  'ポリエステル': 'polyester', '聚酯纤维': 'polyester', '폴리에스터': 'polyester',
  poly: 'polyester', pet: 'polyester', pl: 'polyester',

  // Acrylic
  acrylic: 'acrylic', acrylique: 'acrylic',
  'acrílico': 'acrylic', acryl: 'acrylic',
  'акрил': 'acrylic', ac: 'acrylic',
  'アクリル': 'acrylic', '腈纶': 'acrylic',

  // Modal
  modal: 'modal', mo: 'modal',
  'モーダル': 'modal', '莫代尔': 'modal',

  // Lyocell / Tencel
  lyocell: 'lyocell', tencel: 'lyocell', ly: 'lyocell',

  // Alpaca
  alpaca: 'alpaca', alpaga: 'alpaca', alpaka: 'alpaca',
  'альпака': 'alpaca', 'アルパカ': 'alpaca',

  // Mohair
  mohair: 'mohair', 'мохер': 'mohair', 'モヘア': 'mohair',

  // Merino
  merino: 'merino wool', 'mérinos': 'merino wool',
  'merino wool': 'merino wool', merinowolle: 'merino wool',

  // Hemp
  hemp: 'hemp', chanvre: 'hemp', 'cáñamo': 'hemp',
  hanf: 'hemp', hennep: 'hemp', canapa: 'hemp',
  'cânhamo': 'hemp', cañamo: 'hemp', canamo: 'hemp', ha: 'hemp',

  // Bamboo
  bamboo: 'bamboo', bambu: 'bamboo',
  bambus: 'bamboo', bambou: 'bamboo',

  // Cupro
  cupro: 'cupro', cupra: 'cupro', bemberg: 'cupro',

  // Ramie
  ramie: 'ramie', 'ramié': 'ramie', ramio: 'ramie', ra: 'ramie',

  // Angora
  angora: 'angora', an: 'angora',

  // Triacetate
  triacetate: 'triacetate', 'triacétate': 'triacetate',
  tricel: 'triacetate',

  // Acetate
  acetate: 'acetate', 'acétate': 'acetate',
  acetat: 'acetate', acetaat: 'acetate',
  dicel: 'acetate', ta: 'acetate',

  // Vintage brand names
  terylene: 'polyester',
  dacron: 'polyester',
  courtelle: 'acrylic',
  orlon: 'acrylic',
  acrilan: 'acrylic',
  crimplene: 'polyester',
  'bri-nylon': 'polyamide',
  econyl: 'polyamide',
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
    .replace(/[®™©]/g, '')
    .trim();

  const mapped = mapFiberSynonym(cleaned);
  if (mapped) return mapped;

  if (/flax/.test(cleaned)) return 'linen';
  if (/merino/.test(cleaned)) return 'merino wool';
  if (/lambswool|shetland/.test(cleaned)) return 'wool';
  if (/denim/.test(cleaned)) return 'cotton';
  if (/spandex/.test(cleaned)) return 'elastane';
  if (/rayon/.test(cleaned)) return 'viscose';

  const words = cleaned.split(/[\s\-\/,•·]+/).filter((w) => w.length > 2);
  for (const word of words) {
    const hit = mapFiberSynonym(word);
    if (hit) return hit;
  }

  return cleaned.split(/\s+/).pop() || cleaned;
}
