import type { SupabaseClient } from '@supabase/supabase-js';
import { scannerCatalogQuery } from '../scanner-catalog';
import { parsePriceNumber } from '../scanner-copy';

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

export async function getSmartAlternatives(
  supabase: SupabaseClient,
  params: {
    composition?: string | null;
    detectedPrice?: number | null;
    currency?: string | null;
    category?: string | null;
    primaryFiber?: string | null;
    naturalFiberPercent?: number | null;
    brandSlug?: string | null;
    region?: string | null;
    userId?: string | null;
    excludeBrandSlug?: string | null;
  }
): Promise<any[]> {
  const {
    composition,
    detectedPrice,
    category,
    primaryFiber,
    naturalFiberPercent,
    region,
    userId,
    excludeBrandSlug,
  } = params;

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

  let query = scannerCatalogQuery(supabase)
    .eq('region', resolvedRegion)
    .gte('natural_fiber_percent', targetNfp)
    .order('natural_fiber_percent', { ascending: false });

  if (excludeBrandSlug) query = query.neq('brand_slug', excludeBrandSlug);
  if (categoryHint) query = query.ilike('category', `%${categoryHint}%`);
  if ((naturalFiberPercent || 0) < 80 && fiberHint) {
    query = query.ilike('composition', `%${fiberHint}%`);
  }
  if (detectedPrice && detectedPrice > 0) {
    query = query.gte('price', detectedPrice * 0.7).lte('price', detectedPrice * 1.3);
  }

  const { data: primaryRows } = await query.limit(24);
  let merged = primaryRows || [];

  if (merged.length < 6) {
    let broader = scannerCatalogQuery(supabase)
      .eq('region', resolvedRegion)
      .gte('natural_fiber_percent', 90)
      .order('natural_fiber_percent', { ascending: false });
    if (excludeBrandSlug) broader = broader.neq('brand_slug', excludeBrandSlug);
    const { data: broaderRows } = await broader.limit(24);
    merged = [...merged, ...(broaderRows || [])];
  }

  const deduped: any[] = [];
  const seen = new Set<string>();
  for (const row of filterProductsByPrice(merged, detectedPrice, 0.3)) {
    const id = String(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(row);
    if (deduped.length >= 12) break;
  }

  return deduped.slice(0, 6);
}

function extractPrimaryFiber(composition: string): string | null {
  const fibers = ['silk', 'cashmere', 'linen', 'wool', 'cotton', 'leather', 'alpaca'];
  const lower = composition.toLowerCase();
  for (const fiber of fibers) {
    if (lower.includes(fiber)) return fiber;
  }
  return null;
}
