import type { SupabaseClient } from '@supabase/supabase-js';
import { scannerCatalogQuery } from '../scanner-catalog';
import { getBestNaturalFiberForPrice, parsePriceNumber } from '../scanner-copy';

function filterProductsByPrice(
  rows: any[],
  price: number | null | undefined,
  tolerance = 0.3
): any[] {
  if (!price || !rows?.length) return rows || [];
  const min = price * (1 - tolerance);
  const max = price * (1 + tolerance);
  const filtered = rows.filter((p) => {
    const pn = parsePriceNumber(p.price);
    return pn !== null && pn >= min && pn <= max;
  });
  return filtered.length >= 3 ? filtered : rows;
}

/** catalog_list: p_preferred_region, p_fallback_region, p_fiber, p_category, p_brand_slug, p_search, p_min_nfp, p_limit, p_offset */
export async function getSmartAlternatives(
  supabase: SupabaseClient,
  params: {
    detectedPrice?: number | null;
    primaryFiber?: string | null;
    naturalFiberPercent?: number | null;
    brandSlug?: string | null;
    userId?: string | null;
    excludeBrandSlug?: string | null;
  }
): Promise<any[]> {
  const { detectedPrice, primaryFiber, naturalFiberPercent, userId, excludeBrandSlug } = params;

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

  const searchFiber =
    (naturalFiberPercent || 0) >= 80 && preferredFiber
      ? preferredFiber
      : getBestNaturalFiberForPrice(detectedPrice);

  const tiers: { fiber: string | null }[] = [
    { fiber: searchFiber },
    { fiber: null },
    { fiber: searchFiber },
    { fiber: null },
  ];

  const seen = new Set<string>();
  const merged: any[] = [];

  for (const tier of tiers) {
    const { data, error } = await supabase.rpc('catalog_list', {
      p_preferred_region: 'us',
      p_fallback_region: 'us',
      p_fiber: tier.fiber,
      p_category: null,
      p_brand_slug: null,
      p_search: null,
      p_min_nfp: 80,
      p_limit: 40,
      p_offset: 0,
    });

    let rows: any[] = [];
    if (error) {
      const { data: fallback } = await scannerCatalogQuery(supabase)
        .order('natural_fiber_percent', { ascending: false })
        .limit(40);
      rows = fallback || [];
    } else {
      rows = data || [];
    }

    if (excludeBrandSlug) {
      rows = rows.filter((p) => p.brand_slug !== excludeBrandSlug);
    }

    const priceFiltered = filterProductsByPrice(rows, detectedPrice, 0.3);
    const pool = priceFiltered.length >= 3 ? priceFiltered : rows;

    for (const p of pool) {
      const id = String(p.id);
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(p);
      if (merged.length >= 12) break;
    }
    if (merged.length >= 6) break;
  }

  return merged.slice(0, 12);
}
