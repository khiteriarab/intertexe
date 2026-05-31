import type { SupabaseClient } from '@supabase/supabase-js';
import { scannerCatalogQuery } from '../scanner-catalog';

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
  top: ['top', 'blouse', 'shirt', 'tee', 'tank', 'camisole'],
  knitwear: ['knit', 'sweater', 'pullover', 'cardigan', 'jumper'],
  trouser: ['trouser', 'pant', 'jean', 'legging', 'culotte'],
  skirt: ['skirt', 'midi skirt', 'maxi skirt', 'mini skirt'],
  outerwear: ['coat', 'jacket', 'blazer', 'vest', 'cape'],
  jumpsuit: ['jumpsuit', 'playsuit', 'romper', 'overall'],
};

function garmentTypeOrFilter(garmentType: string): string {
  const terms = GARMENT_TYPE_TERMS[garmentType.toLowerCase()] || [garmentType];
  return terms
    .map(
      (term) =>
        `name.ilike.%${term}%,category.ilike.%${term}%,garment_type.ilike.%${term}%`
    )
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

function toPriceUSD(price: number, currency?: string | null): number {
  if (!currency) return price;
  switch (currency.toUpperCase()) {
    case 'EUR':
      return price * 1.08;
    case 'GBP':
      return price * 1.27;
    case 'CAD':
      return price * 0.74;
    default:
      return price;
  }
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

function matchesGarmentType(product: any, garmentType: string): boolean {
  const terms = GARMENT_TYPE_TERMS[garmentType.toLowerCase()] || [garmentType];
  const haystack = `${product.name || ''} ${product.category || ''} ${product.garment_type || ''}`.toLowerCase();
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
  const seen = new Set<string>();
  return products.filter((p) => {
    const id = String(p.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function finalizeAlternatives(
  products: any[],
  opts: {
    garmentType?: string | null;
    minPrice: number;
    maxPrice: number;
    fiberHint?: string | null;
    requireGarmentType?: boolean;
  }
): any[] {
  const filtered = postFilterAlternatives(products, {
    garmentType: opts.requireGarmentType ? opts.garmentType : null,
    minPrice: opts.minPrice,
    maxPrice: opts.maxPrice,
    fiberHint: opts.fiberHint,
  });
  return deduplicateById(filtered).slice(0, 6);
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
  let priceUSD =
    rawPrice != null && rawPrice > 0 ? toPriceUSD(rawPrice, currency) : null;
  const hadBarcodePrice = priceUSD != null && priceUSD > 0;

  let preferredFiber = primaryFiber?.toLowerCase().split(/\s+/)[0] || null;
  if (userId) {
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('preferred_fibers')
      .eq('user_id', userId)
      .maybeSingle();
    if (prefs?.preferred_fibers?.[0]) {
      preferredFiber = String(prefs.preferred_fibers[0]).toLowerCase();
    }
  }

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
      `No price from barcode — using fiber default: $${priceUSD} for ${fiberHint || 'default'}`
    );
  }

  const minMultiplier = hadBarcodePrice ? 0.5 : 0.4;
  const maxMultiplier = hadBarcodePrice ? 2.0 : 2.5;
  const minPrice = priceUSD * minMultiplier;
  const maxPrice = priceUSD * maxMultiplier;

  const runQuery = async (
    minNfp: number,
    min: number,
    max: number,
    withGarmentType: boolean
  ) => {
    let query = scannerCatalogQuery(supabase)
      .eq('region', resolvedRegion)
      .gte('natural_fiber_percent', minNfp)
      .not('image_url', 'is', null)
      .gte('price', min)
      .lte('price', max);

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
      .limit(24);
    return data || [];
  };

  console.log(
    `Finding alternatives: fiber=${fiberHint}, price=$${priceUSD.toFixed(0)}, garmentType=${garmentType || 'any'}`
  );
  console.log(
    `Price filter: $${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)} (anchor: $${priceUSD.toFixed(0)})`
  );

  const primary = await runQuery(targetNfp, minPrice, maxPrice, true);
  const primaryFiltered = finalizeAlternatives(primary, {
    garmentType,
    minPrice,
    maxPrice,
    fiberHint,
    requireGarmentType: !!garmentType,
  });
  if (primaryFiltered.length >= 3) {
    return primaryFiltered;
  }

  if (garmentType) {
    console.log('Garment type filter strict — widening price range but keeping garment type');
    const widerPriceSameGarment = await runQuery(
      80,
      priceUSD * 0.3,
      priceUSD * 2.2,
      true
    );
    const widerFiltered = finalizeAlternatives(widerPriceSameGarment, {
      garmentType,
      minPrice: priceUSD * 0.3,
      maxPrice: priceUSD * 2.2,
      fiberHint,
      requireGarmentType: true,
    });
    if (widerFiltered.length >= 1) {
      return widerFiltered.length >= 3
        ? widerFiltered
        : [...widerFiltered, ...primaryFiltered].slice(0, 6);
    }

    console.log('Garment type filter too strict — broadening without garment type');
    const broaderGarment = await runQuery(80, priceUSD * 0.4, priceUSD * 2.2, false);
    const broaderFiltered = finalizeAlternatives(broaderGarment, {
      garmentType: null,
      minPrice: priceUSD * 0.4,
      maxPrice: priceUSD * 2.2,
      fiberHint,
    });
    if (broaderFiltered.length >= 1) {
      return broaderFiltered;
    }
  }

  console.log('Price filter too strict — broadening range');
  const broaderMin = priceUSD * 0.25;
  const broaderMax = priceUSD * 2.5;
  const broader = await runQuery(80, broaderMin, broaderMax, false);
  const broaderFiltered = finalizeAlternatives(broader, {
    garmentType: null,
    minPrice: broaderMin,
    maxPrice: broaderMax,
    fiberHint,
  });
  if (broaderFiltered.length >= 1) {
    return broaderFiltered;
  }

  const { data: fallback } = await scannerCatalogQuery(supabase)
    .eq('region', resolvedRegion)
    .gte('natural_fiber_percent', 80)
    .not('image_url', 'is', null)
    .gte('price', minPrice)
    .lte('price', maxPrice)
    .order('natural_fiber_percent', { ascending: false })
    .limit(24);

  return finalizeAlternatives(fallback || [], {
    garmentType,
    minPrice,
    maxPrice,
    fiberHint,
    requireGarmentType: !!garmentType,
  });
}
