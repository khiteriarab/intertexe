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

function postFilterAlternatives(
  products: any[],
  opts: {
    garmentType?: string | null;
    minPrice: number;
    maxPrice: number;
    fiberHint?: string | null;
  }
): any[] {
  const { garmentType, minPrice, maxPrice, fiberHint } = opts;
  return products.filter((p) => {
    const price = parseProductPrice(p.price);
    if (price != null && (price < minPrice || price > maxPrice)) return false;
    if (garmentType && !matchesGarmentType(p, garmentType)) return false;
    if (fiberHint) {
      const comp = String(p.composition || '').toLowerCase();
      if (!comp.includes(fiberHint.toLowerCase())) return false;
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
    primaryFiber: string;
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
  if (
    context.primaryFiber &&
    String(product.composition || '')
      .toLowerCase()
      .includes(context.primaryFiber.toLowerCase())
  ) {
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
    minPrice: number;
    maxPrice: number;
    fiberHint?: string | null;
    requireGarmentType?: boolean;
    anchorPrice?: number;
    scannedNfp?: number;
  }
): any[] {
  const filtered = postFilterAlternatives(products, {
    garmentType: opts.requireGarmentType ? opts.garmentType : null,
    minPrice: opts.minPrice,
    maxPrice: opts.maxPrice,
    fiberHint: opts.fiberHint,
  });
  const anchor = opts.anchorPrice ?? (opts.minPrice + opts.maxPrice) / 2;
  const scoreContext = {
    targetPrice: anchor,
    primaryFiber: opts.fiberHint || '',
    garmentType: opts.garmentType || '',
    scannedNfp: opts.scannedNfp ?? 0,
  };
  const sorted = [...filtered].sort(
    (a, b) => scoreAlternative(b, scoreContext) - scoreAlternative(a, scoreContext)
  );
  return deduplicateById(sorted).slice(0, 6);
}

function extractPrimaryFiber(composition: string): string | null {
  const fibers = ['silk', 'cashmere', 'wool', 'linen', 'cotton', 'leather', 'alpaca'];
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
    userId,
    excludeBrandSlug,
  } = params;

  const rawPrice = detectedPrice ?? priceParam ?? null;
  const hadRealPrice = rawPrice != null && rawPrice > 0;
  let priceUSD = hadRealPrice ? toPriceUSD(rawPrice, currency) : null;

  const scannedFiber = primaryFiber?.toLowerCase().split(/\s+/)[0] || null;
  const preferredFiber = scannedFiber || extractPrimaryFiber(composition || '');

  const resolvedRegion = (region || 'us').toLowerCase();
  const targetNfp = Math.min(
    Math.max((naturalFiberPercent || 0) + 10, 80),
    95
  );
  const categoryHint = category?.trim() || null;
  const fiberHint = preferredFiber || extractPrimaryFiber(composition || '');

  if (!priceUSD) {
    priceUSD = defaultPriceForFiber(fiberHint);
    console.log(
      `No price scanned — using fiber default: $${priceUSD} for ${fiberHint || 'default'}`
    );
  }

  const minMultiplier = hadRealPrice ? 0.7 : 0.4;
  const maxMultiplier = hadRealPrice ? 1.5 : 2.5;
  const minPrice = priceUSD * minMultiplier;
  const maxPrice = priceUSD * maxMultiplier;

  console.log(
    `Price range for alternatives: $${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)} (anchor $${priceUSD.toFixed(0)}, scanned=${hadRealPrice})`
  );

  const runQuery = async (
    minNfp: number,
    withGarmentType: boolean,
    fetchLimit = 120
  ) => {
    let query = scannerCatalogQuery(supabase)
      .eq('region', resolvedRegion)
      .gte('natural_fiber_percent', minNfp)
      .not('image_url', 'is', null);

    if (excludeBrandSlug) query = query.neq('brand_slug', excludeBrandSlug);
    if (withGarmentType && garmentType) {
      query = query.or(garmentTypeOrFilter(garmentType));
    } else if (categoryHint) {
      query = query.ilike('category', `%${categoryHint}%`);
    }
    if (fiberHint) {
      query = query.ilike('composition', `%${fiberHint}%`);
    }

    const { data } = await query
      .order('natural_fiber_percent', { ascending: false })
      .limit(fetchLimit);
    return data || [];
  };

  console.log(
    `Finding alternatives: fiber=${fiberHint}, price=$${priceUSD.toFixed(0)}, garmentType=${garmentType || 'any'}`
  );
  console.log(
    `Price filter: $${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)} (anchor: $${priceUSD.toFixed(0)})`
  );

  const primary = await runQuery(targetNfp, true);
  const primaryFiltered = finalizeAlternatives(primary, {
    garmentType,
    minPrice,
    maxPrice,
    fiberHint,
    requireGarmentType: !!garmentType,
    anchorPrice: priceUSD,
    scannedNfp: naturalFiberPercent ?? 0,
  });
  if (primaryFiltered.length >= 3) {
    return primaryFiltered;
  }

  if (garmentType) {
    console.log('Garment type filter strict — widening price range but keeping garment type');
    const widerMin = priceUSD * 0.3;
    const widerMax = priceUSD * 2.2;
    const widerPriceSameGarment = await runQuery(80, true, 180);
    const widerFiltered = finalizeAlternatives(widerPriceSameGarment, {
      garmentType,
      minPrice: widerMin,
      maxPrice: widerMax,
      fiberHint,
      requireGarmentType: true,
      anchorPrice: priceUSD,
      scannedNfp: naturalFiberPercent ?? 0,
    });
    if (widerFiltered.length >= 1) {
      return widerFiltered.length >= 3
        ? widerFiltered
        : deduplicateById([...widerFiltered, ...primaryFiltered]).slice(0, 6);
    }

    console.log('Garment type filter still strict — widening price further with garment type');
    const widestMin = priceUSD * 0.2;
    const widestMax = priceUSD * 2.5;
    const widestGarment = await runQuery(80, true, 240);
    const widestFiltered = finalizeAlternatives(widestGarment, {
      garmentType,
      minPrice: widestMin,
      maxPrice: widestMax,
      fiberHint,
      requireGarmentType: true,
      anchorPrice: priceUSD,
      scannedNfp: naturalFiberPercent ?? 0,
    });
    if (widestFiltered.length >= 1) {
      return widestFiltered;
    }
  }

  if (!garmentType) {
    console.log('Price filter too strict — broadening range');
    const broaderMin = priceUSD * 0.25;
    const broaderMax = priceUSD * 2.5;
    const broader = await runQuery(80, false, 200);
    const broaderFiltered = finalizeAlternatives(broader, {
      garmentType: null,
      minPrice: broaderMin,
      maxPrice: broaderMax,
      fiberHint,
      anchorPrice: priceUSD,
      scannedNfp: naturalFiberPercent ?? 0,
    });
    if (broaderFiltered.length >= 1) {
      return broaderFiltered;
    }
  }

  let fallbackQuery = scannerCatalogQuery(supabase)
    .eq('region', resolvedRegion)
    .gte('natural_fiber_percent', 80)
    .not('image_url', 'is', null);
  if (garmentType) {
    fallbackQuery = fallbackQuery.or(garmentTypeOrFilter(garmentType));
  }
  if (fiberHint) {
    fallbackQuery = fallbackQuery.ilike('composition', `%${fiberHint}%`);
  }
  const { data: fallback } = await fallbackQuery
    .order('natural_fiber_percent', { ascending: false })
    .limit(200);

  return finalizeAlternatives(fallback || [], {
    garmentType,
    minPrice,
    maxPrice,
    fiberHint,
    requireGarmentType: !!garmentType,
    anchorPrice: priceUSD,
    scannedNfp: naturalFiberPercent ?? 0,
  });
}
