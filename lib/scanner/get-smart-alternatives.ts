import type { SupabaseClient } from '@supabase/supabase-js';
import { scannerCatalogQuery } from '../scanner-catalog';
import { toPriceUSD } from './real-world-price';

export type SmartAlternativesParams = {
  composition?: string | null;
  detectedPrice?: number | null;
  price?: number | null;
  currency?: string | null;
  category?: string | null;
  garmentType?: string | null;
  primaryFiber?: string | null;
  naturalFiberPercent?: number | null;
  brandSlug?: string | null;
  region?: string | null;
  userId?: string | null;
  excludeBrandSlug?: string | null;
};

const GARMENT_TYPE_TERMS: Record<string, string[]> = {
  dress: ['dress', 'dresses', 'gown', 'midi dress', 'maxi dress', 'mini dress'],
  top: ['top', 'blouse', 'shirt', 'tee', 'tank', 'camisole', 'henley'],
  knitwear: ['knit', 'sweater', 'pullover', 'cardigan', 'jumper'],
  trouser: ['trouser', 'pant', 'jean', 'legging', 'culotte'],
  skirt: ['skirt', 'midi skirt', 'maxi skirt', 'mini skirt'],
  outerwear: ['coat', 'jacket', 'blazer', 'vest', 'cape'],
  jumpsuit: ['jumpsuit', 'playsuit', 'romper', 'overall'],
};

function garmentTypeOrFilter(garmentType: string): string {
  const terms = GARMENT_TYPE_TERMS[garmentType.toLowerCase()] || [garmentType];
  return terms
    .map((term) => `name.ilike.%${term}%,category.ilike.%${term}%`)
    .join(',');
}

const FIBER_PRICE_DEFAULTS_USD: Record<string, number> = {
  cashmere: 400,
  silk: 300,
  leather: 500,
  wool: 250,
  linen: 150,
  cotton: 100,
  default: 200,
};

function getAlternativeFibers(scannedFiber: string): string[] {
  const upgrades: Record<string, string[]> = {
    viscose: ['silk', 'linen', 'cotton', 'modal', 'lyocell'],
    polyester: ['silk', 'linen', 'cotton', 'wool', 'cashmere'],
    polyamide: ['silk', 'cotton', 'linen'],
    nylon: ['silk', 'cotton', 'linen'],
    acrylic: ['wool', 'cashmere', 'merino'],
    elastane: ['silk', 'cotton', 'linen'],
    cotton: ['linen', 'silk', 'cotton'],
    linen: ['linen', 'cotton', 'silk'],
    silk: ['silk', 'cashmere', 'linen'],
    wool: ['wool', 'cashmere', 'merino'],
    cashmere: ['cashmere', 'wool', 'merino'],
  };
  return upgrades[scannedFiber.toLowerCase()] || ['silk', 'linen', 'cotton', 'wool', 'cashmere'];
}

function parseProductPrice(raw: unknown): number | null {
  if (typeof raw === 'number' && raw > 0) return raw;
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) && num > 0 ? num : null;
  }
  return null;
}

const GARMENT_TYPE_EXCLUSIONS: Record<string, string[]> = {
  dress: [' pant', ' pants', ' trouser', ' skirt', ' short', ' shorts', ' jacket', ' coat'],
  top: [' dress', ' pants', ' pant', ' skirt', ' jumpsuit'],
};

function matchesGarmentType(product: any, garmentType: string): boolean {
  const terms = GARMENT_TYPE_TERMS[garmentType.toLowerCase()] || [garmentType];
  const haystack = `${product.name || ''} ${product.category || ''}`.toLowerCase();
  const exclusions = GARMENT_TYPE_EXCLUSIONS[garmentType.toLowerCase()] || [];
  if (exclusions.some((term) => haystack.includes(term))) return false;
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function tagPriceMatchNote(products: any[], note: string | null): any[] {
  return products.map((p) => ({ ...p, priceMatchNote: note }));
}

function postFilterAlternatives(
  products: any[],
  opts: {
    garmentType?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    fiberHints?: string[];
  }
): any[] {
  const { garmentType, minPrice, maxPrice, fiberHints } = opts;
  return products.filter((p) => {
    if (minPrice != null && maxPrice != null) {
      const price = parseProductPrice(p.price);
      if (price != null && (price < minPrice || price > maxPrice)) return false;
    }
    if (garmentType && !matchesGarmentType(p, garmentType)) return false;
    if (fiberHints && fiberHints.length > 0) {
      const comp = String(p.composition || '').toLowerCase();
      if (!fiberHints.some((fiber) => comp.includes(fiber.toLowerCase()))) return false;
    }
    return true;
  });
}

function deduplicateById(products: any[]): any[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  return products.filter((p) => {
    const id = String(p.id);
    const nameKey = `${p.brand_slug || p.brand_name || ''}:${String(p.name || '').toLowerCase()}`;
    if (seenIds.has(id) || seenNames.has(nameKey)) return false;
    seenIds.add(id);
    seenNames.add(nameKey);
    return true;
  });
}

function scoreAlternative(
  product: any,
  context: {
    targetPrice: number;
    targetFibers: string[];
    garmentType: string;
    scannedNfp: number;
  }
): number {
  let score = 0;
  const price = parseProductPrice(product.price) || 0;
  const priceDiff =
    context.targetPrice > 0
      ? Math.abs(price - context.targetPrice) / context.targetPrice
      : 1;
  score += Math.max(0, 40 - priceDiff * 40);
  score += ((product.natural_fiber_percent || 0) / 100) * 30;
  const comp = String(product.composition || '').toLowerCase();
  if (context.targetFibers.some((fiber) => comp.includes(fiber.toLowerCase()))) {
    score += 20;
  }
  if (context.garmentType && matchesGarmentType(product, context.garmentType)) {
    score += 10;
  }
  return score;
}

function finalizeAlternatives(
  products: any[],
  opts: {
    garmentType?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    fiberHints?: string[];
    requireGarmentType?: boolean;
    anchorPrice?: number;
    scannedNfp?: number;
  }
): any[] {
  const filtered = postFilterAlternatives(products, {
    garmentType: opts.requireGarmentType ? opts.garmentType : null,
    minPrice: opts.minPrice,
    maxPrice: opts.maxPrice,
    fiberHints: opts.fiberHints,
  });
  const anchor =
    opts.anchorPrice ??
    (opts.minPrice != null && opts.maxPrice != null
      ? (opts.minPrice + opts.maxPrice) / 2
      : FIBER_PRICE_DEFAULTS_USD.default);
  const scoreContext = {
    targetPrice: anchor,
    targetFibers: opts.fiberHints || [],
    garmentType: opts.garmentType || '',
    scannedNfp: opts.scannedNfp ?? 0,
  };
  const sorted = [...filtered].sort(
    (a, b) => scoreAlternative(b, scoreContext) - scoreAlternative(a, scoreContext)
  );
  return deduplicateById(sorted).slice(0, 6);
}

function extractPrimaryFiber(composition: string): string | null {
  const fibers = [
    'viscose',
    'polyester',
    'polyamide',
    'nylon',
    'acrylic',
    'elastane',
    'silk',
    'cashmere',
    'wool',
    'linen',
    'cotton',
    'leather',
    'alpaca',
  ];
  const lower = composition.toLowerCase();
  for (const fiber of fibers) {
    if (lower.includes(fiber)) return fiber;
  }
  return null;
}

function defaultPriceForFiber(primaryFiber: string | null): number {
  if (!primaryFiber) return FIBER_PRICE_DEFAULTS_USD.default;
  return FIBER_PRICE_DEFAULTS_USD[primaryFiber] ?? FIBER_PRICE_DEFAULTS_USD.default;
}

export async function getSmartAlternatives(
  supabase: SupabaseClient,
  params: SmartAlternativesParams
): Promise<any[]> {
  const {
    composition,
    detectedPrice,
    price: priceParam,
    currency,
    category,
    garmentType,
    primaryFiber,
    naturalFiberPercent,
    region,
    excludeBrandSlug,
  } = params;

  const rawPrice = detectedPrice ?? priceParam ?? null;
  const hadRealPrice = rawPrice != null && rawPrice > 0;

  const scannedFiber = primaryFiber?.toLowerCase().split(/\s+/)[0] || null;
  const preferredFiber = scannedFiber || extractPrimaryFiber(composition || '');
  const targetFibers = getAlternativeFibers(preferredFiber || 'cotton');

  const resolvedRegion = (region || 'us').toLowerCase();
  const categoryHint = category?.trim() || null;

  let priceUSD = hadRealPrice ? toPriceUSD(rawPrice!, currency) : null;
  if (!priceUSD) {
    priceUSD = defaultPriceForFiber(preferredFiber);
    console.log(
      `No price scanned — using fiber default: $${priceUSD} for ${preferredFiber || 'default'}`
    );
  }

  console.log(
    `Finding alternatives: scanned=${preferredFiber}, targets=${targetFibers.join('/')}, anchor=$${priceUSD.toFixed(0)} USD, garmentType=${garmentType || 'any'}, region=${resolvedRegion}`
  );

  const runQuery = async (opts: {
    withGarmentType: boolean;
    targetFibers: string[];
    fetchLimit?: number;
  }) => {
    let query = scannerCatalogQuery(supabase)
      .eq('region', resolvedRegion)
      .not('image_url', 'is', null);

    if (excludeBrandSlug) query = query.neq('brand_slug', excludeBrandSlug);
    if (opts.withGarmentType && garmentType) {
      query = query.or(garmentTypeOrFilter(garmentType));
    } else if (categoryHint) {
      query = query.ilike('category', `%${categoryHint}%`);
    }
    if (opts.targetFibers.length > 0) {
      const fiberConditions = opts.targetFibers
        .map((fiber) => `composition.ilike.%${fiber}%`)
        .join(',');
      query = query.or(fiberConditions);
    }

    const { data } = await query
      .order('natural_fiber_percent', { ascending: false })
      .limit(opts.fetchLimit ?? 120);
    return data || [];
  };

  const queryAndFinalize = async (opts: {
    minPrice: number | null;
    maxPrice: number | null;
    priceMatchNote: string | null;
    withGarmentType?: boolean;
    targetFibers?: string[];
    requireGarmentType?: boolean;
    fetchLimit?: number;
  }) => {
    const rows = await runQuery({
      withGarmentType: opts.withGarmentType ?? !!garmentType,
      targetFibers: opts.targetFibers ?? targetFibers,
      fetchLimit: opts.fetchLimit,
    });
    const finalized = finalizeAlternatives(rows, {
      garmentType,
      minPrice: opts.minPrice,
      maxPrice: opts.maxPrice,
      fiberHints: opts.targetFibers ?? targetFibers,
      requireGarmentType: opts.requireGarmentType ?? !!garmentType,
      anchorPrice: priceUSD!,
      scannedNfp: naturalFiberPercent ?? 0,
    });
    return tagPriceMatchNote(finalized, opts.priceMatchNote);
  };

  const attempt1 = await queryAndFinalize({
    minPrice: priceUSD! * 0.7,
    maxPrice: priceUSD! * 1.5,
    priceMatchNote: null,
  });
  if (attempt1.length >= 3) return attempt1;

  const attempt2 = await queryAndFinalize({
    minPrice: priceUSD! * 0.4,
    maxPrice: priceUSD! * 2.5,
    priceMatchNote: 'Similar price range',
    fetchLimit: 180,
  });
  if (attempt2.length >= 3) return attempt2;

  const attempt3 = await queryAndFinalize({
    minPrice: null,
    maxPrice: null,
    priceMatchNote: 'Best natural fiber match',
    withGarmentType: !!garmentType,
    targetFibers,
    fetchLimit: 200,
  });
  if (attempt3.length >= 3) return attempt3;

  const attempt4 = await queryAndFinalize({
    minPrice: null,
    maxPrice: null,
    priceMatchNote: 'Natural fiber alternatives',
    withGarmentType: !!garmentType,
    targetFibers: ['silk', 'linen', 'cotton', 'wool', 'cashmere'],
    requireGarmentType: !!garmentType,
    fetchLimit: 240,
  });
  if (attempt4.length > 0) return attempt4;

  const fallbackFibers = ['silk', 'linen', 'cotton', 'wool', 'cashmere'];
  const fiberConditions = fallbackFibers
    .map((fiber) => `composition.ilike.%${fiber}%`)
    .join(',');

  const { data: lastResort } = await scannerCatalogQuery(supabase)
    .eq('region', resolvedRegion)
    .not('image_url', 'is', null)
    .or(fiberConditions)
    .order('natural_fiber_percent', { ascending: false })
    .limit(12);

  return tagPriceMatchNote(deduplicateById(lastResort || []).slice(0, 6), 'Natural fiber alternatives');
}
