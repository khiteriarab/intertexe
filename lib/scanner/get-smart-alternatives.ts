import type { SupabaseClient } from '@supabase/supabase-js';
import { scannerCatalogQuery } from '../scanner-catalog';

export type SmartAlternativesParams = {
  composition?: string | null;
  detectedPrice?: number | null;
  price?: number | null;
  currency?: string | null;
  category?: string | null;
  primaryFiber?: string | null;
  naturalFiberPercent?: number | null;
  brandSlug?: string | null;
  region?: string | null;
  userId?: string | null;
  excludeBrandSlug?: string | null;
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

function deduplicateById(products: any[]): any[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    const id = String(p.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function extractPrimaryFiber(composition: string): string | null {
  const fibers = ['silk', 'cashmere', 'wool', 'linen', 'cotton', 'leather', 'alpaca'];
  const lower = composition.toLowerCase();
  for (const fiber of fibers) {
    if (lower.includes(fiber)) return fiber;
  }
  return null;
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
    primaryFiber,
    naturalFiberPercent,
    region,
    userId,
    excludeBrandSlug,
  } = params;

  const rawPrice = detectedPrice ?? priceParam ?? null;
  const priceUSD =
    rawPrice != null && rawPrice > 0 ? toPriceUSD(rawPrice, currency) : null;

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
  const targetNfp = Math.max((naturalFiberPercent || 0) + 10, 80);
  const categoryHint = category?.trim() || null;
  const fiberHint = preferredFiber || extractPrimaryFiber(composition || '');

  const runQuery = async (minPrice: number | null, maxPrice: number | null, minNfp: number) => {
    let query = scannerCatalogQuery(supabase)
      .eq('region', resolvedRegion)
      .gte('natural_fiber_percent', minNfp)
      .order('natural_fiber_percent', { ascending: false });

    if (excludeBrandSlug) query = query.neq('brand_slug', excludeBrandSlug);
    if (categoryHint) query = query.ilike('category', `%${categoryHint}%`);
    if (fiberHint && (naturalFiberPercent || 0) < 80) {
      query = query.ilike('composition', `%${fiberHint}%`);
    }
    if (minPrice != null && maxPrice != null && minPrice > 0) {
      query = query.gte('price', minPrice).lte('price', maxPrice);
    }

    const { data } = await query.limit(24);
    return data || [];
  };

  if (priceUSD && priceUSD > 0) {
    const minPrice = priceUSD * 0.5;
    const maxPrice = priceUSD * 2.0;
    console.log(
      `Price filter: $${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)} (scanned: $${priceUSD.toFixed(0)})`
    );

    const primary = await runQuery(minPrice, maxPrice, targetNfp);
    if (primary.length >= 3) {
      return deduplicateById(primary).slice(0, 6);
    }

    console.log('Price filter too strict — broadening range');
    const broaderMin = priceUSD * 0.25;
    const broaderMax = priceUSD * 4.0;
    const broader = await runQuery(broaderMin, broaderMax, 80);
    return deduplicateById(broader).slice(0, 6);
  }

  const fallback = await runQuery(null, null, targetNfp);
  return deduplicateById(fallback).slice(0, 6);
}
