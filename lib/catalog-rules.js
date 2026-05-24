/**
 * Shared INTERTEXE catalog rules (web + iOS + ingest + daily refresh).
 * Mirrors Supabase functions in 20240021–20240027 when RPCs are unavailable.
 */

export {
  consumerExclusionReason,
  passesConsumerIngestionGate,
  isWomensApparelCategory,
} from './catalog-consumer-rules.js';

export const SHOP_CATEGORY_GARMENT_TYPES = {
  dresses: ['dresses'],
  tops: ['tops_blouses', 'shirts'],
  knitwear: ['knitwear', 'sweaters_cardigans'],
  bottoms: ['pants_trousers', 'shorts'],
  outerwear: ['coats', 'jackets_blazers'],
  skirts: ['skirts'],
  swimwear: ['swim_resortwear'],
  lingerie: ['other_apparel'],
};

export const SHOP_FIBER_TO_MATERIAL = {
  silk: 'silk',
  linen: 'linen',
  cotton: 'cotton',
  wool: 'wool',
  cashmere: 'cashmere',
  'leather-suede': 'leather_suede',
  leather_suede: 'leather_suede',
};

export function garmentTypesForShopCategory(category) {
  if (!category || category === 'all') return null;
  return SHOP_CATEGORY_GARMENT_TYPES[String(category).toLowerCase()] ?? null;
}

export function materialPrimaryForShopFiber(fiber) {
  if (!fiber || fiber === 'all') return null;
  const f = String(fiber).toLowerCase();
  if (f === 'denim' || f === 'jeans' || f === 'jean') return null;
  return SHOP_FIBER_TO_MATERIAL[f] ?? f;
}

/** Primary material from body/shell composition (trim/lining excluded via NFP parser). */
export function classifyMaterial(composition = '', materialMetadata = null) {
  const comp = String(composition || '').toLowerCase().trim();
  const meta = materialMetadata ? String(materialMetadata).toLowerCase() : '';
  const blob = `${comp} ${meta}`.trim();
  if (!blob) return 'unknown_material';
  if (/(silk|mulberry)/.test(blob)) return 'silk';
  if (/cashmere/.test(blob)) return 'cashmere';
  if (/(wool|merino|lambswool|alpaca)/.test(blob)) return 'wool';
  if (/(linen|flax)/.test(blob)) return 'linen';
  if (/cotton/.test(blob)) return 'cotton';
  if (/(leather|suede)/.test(blob)) return 'leather_suede';
  if (/(viscose|rayon|cupro|modal|lyocell|tencel)/.test(blob)) return 'viscose_rayon';
  if (/(polyester|nylon|acrylic|elastane|spandex|polyamide)/.test(blob)) return 'synthetic_blend';
  return 'unknown_material';
}

export function classifyGarment(category = '', name = '') {
  const cat = String(category || '').toLowerCase().trim();
  const nam = String(name || '').toLowerCase().trim();
  if (!cat && !nam) return 'needs_review';
  if (/(dress|gown)/.test(cat) || /(dress|gown)/.test(nam)) return 'dresses';
  if (/(blouse|bodysuit|tank|camisole)/.test(cat) || /(blouse|bodysuit)/.test(nam)) return 'tops_blouses';
  if (/(^|[^a-z])top([^a-z]|$)/.test(cat) || /( tank top| camisole)/.test(nam)) return 'tops_blouses';
  if (/shirt/.test(cat) && !/t-shirt/.test(cat)) return 'shirts';
  if (/knit/.test(cat) && !/(sweater|cardigan)/.test(cat)) return 'knitwear';
  if (/(sweater|cardigan|pullover|jumper)/.test(cat)) return 'sweaters_cardigans';
  if (/(pant|trouser|jean|denim)/.test(cat)) return 'pants_trousers';
  if (/skirt/.test(cat)) return 'skirts';
  if (/short/.test(cat)) return 'shorts';
  if (/(blazer|jacket)/.test(cat)) return 'jackets_blazers';
  if (/(coat|outerwear|parka|trench|anorak)/.test(cat)) return 'coats';
  if (/(swim|bikini|resort)/.test(cat)) return 'swim_resortwear';
  if (/(scarf|wrap|shawl)/.test(cat) || /(scarf|wrap|shawl)/.test(nam)) return 'scarves_wraps';
  if (/(set|co-ord|coord|two piece|two-piece)/.test(cat)) return 'matching_sets';
  if (!cat) return 'needs_review';
  return 'other_apparel';
}

export function offerCompletenessStatus(row) {
  const excl = consumerExclusionReason({
    category: row.category,
    name: row.name,
    composition: row.composition,
    imageUrl: row.image_url ?? row.imageUrl,
    price: row.price,
    url: row.url,
  });
  if (excl) return 'excluded';
  if (!row.currency || !String(row.currency).trim()) return 'needs_review';
  const mat = classifyMaterial(row.composition, row.material_metadata);
  if (mat === 'unknown_material') return 'needs_review';
  if (classifyGarment(row.category, row.name) === 'needs_review') return 'needs_review';
  return 'complete';
}

export function rowMatchesShopFiber(fiber, row) {
  const f = String(fiber || '').toLowerCase().trim();
  if (!f || f === 'all') return true;
  const mat = classifyMaterial(row.composition, row.material_metadata);
  const garment = row.garment_type || classifyGarment(row.category, row.name);
  const cat = String(row.category || '').toLowerCase();
  const nam = String(row.name || '').toLowerCase();
  const comp = String(row.composition || '').toLowerCase();

  if (['denim', 'jeans', 'jean'].includes(f)) {
    return /(denim|jean)/.test(cat) || /(denim|jean)/.test(nam) || /(denim|jean)/.test(comp);
  }

  const mapped = materialPrimaryForShopFiber(f);
  if (mapped) return mat === mapped;
  return comp.includes(f) || cat.includes(f) || nam.includes(f);
}

export function rowMatchesGarmentFilter(row, category) {
  const types = garmentTypesForShopCategory(category);
  if (!types?.length) return true;
  const gt = (row.garment_type || classifyGarment(row.category, row.name)).toLowerCase();
  return types.includes(gt);
}

export function normTokenCatalog(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function catalogNormalizeImageUrl(pImageUrl) {
  if (!pImageUrl) return null;
  const trimmed = String(pImageUrl).split('#')[0].split('?')[0].trim().toLowerCase();
  return trimmed || null;
}

export function catalogDedupeKey(row) {
  const img = catalogNormalizeImageUrl(row.image_url ?? row.imageUrl);
  if (img) return `img:${img}`;
  const b = normTokenCatalog(row.brand_name ?? row.brandName);
  const n = normTokenCatalog(row.name);
  const c = normTokenCatalog(row.composition);
  if (b && n && c) return `identity:${b}|${n}|${c}`;
  const pid = String(row.product_id ?? row.productId ?? '').trim().toLowerCase();
  if (pid) return `pid:${pid}`;
  return `id:${row.id}`;
}

export function catalogRegionRank(region, preferred) {
  const r = String(region || 'us').toLowerCase();
  const p = String(preferred || 'us').toLowerCase();
  if (r === p) return 0;
  if (r === 'us') return 1;
  if (r === 'uk') return 2;
  if (r === 'eu') return 3;
  return 4;
}

export function pickDedupeWinner(rows, preferred = 'us', fallback = 'us') {
  return [...rows].sort((a, b) => {
    const d = catalogRegionRank(a.region, preferred) - catalogRegionRank(b.region, preferred);
    if (d !== 0) return d;
    const df = catalogRegionRank(a.region, fallback) - catalogRegionRank(b.region, fallback);
    if (df !== 0) return df;
    const nfp = (b.natural_fiber_percent || 0) - (a.natural_fiber_percent || 0);
    if (nfp !== 0) return nfp;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  })[0];
}

/** One visible card per canonical product (image / identity / product_id). */
export function dedupeCatalogRows(rows, preferred = 'us', fallback = 'us') {
  const groups = new Map();
  for (const row of rows) {
    const key = catalogDedupeKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return Array.from(groups.values()).map((g) => pickDedupeWinner(g, preferred, fallback));
}

export function capNaturalFiberPercent(nfp) {
  if (nfp == null || Number.isNaN(Number(nfp))) return nfp;
  return Math.min(100, Math.max(0, Math.round(Number(nfp))));
}

export const CATALOG_INITIAL_PAGE = 32;
export const CATALOG_PAGE_SIZE = 40;
