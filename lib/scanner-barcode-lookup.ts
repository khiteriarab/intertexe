import type { SupabaseClient } from '@supabase/supabase-js';
import { scannerCatalogQuery } from './scanner-catalog';
import { parsePriceNumber } from './scanner-copy';

export { getSmartAlternatives } from './scanner/get-smart-alternatives';

export type BarcodeLookupResult = {
  brand: string | null;
  brandSlug: string | null;
  productName: string | null;
  composition: string | null;
  naturalFiberPercent: number | null;
  fiberPrimary: string | null;
  fiberBreakdown: any[] | null;
  price: number | null;
  currency: string | null;
  source: string;
  catalogProducts: any[];
  needsCompositionLabel: boolean;
  isNewToDatabase: boolean;
};

function normalizeUpc(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

export function filterProductsByPrice(
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

export async function fetchCatalogByBrandAndPrice(
  supabase: SupabaseClient,
  brandSlug: string | null,
  price: number | null | undefined,
  limit: number
): Promise<any[]> {
  if (!brandSlug) return [];
  const { data } = await scannerCatalogQuery(supabase)
    .eq('brand_slug', brandSlug)
    .order('natural_fiber_percent', { ascending: false })
    .limit(Math.max(limit * 4, 24));
  const rows = data || [];
  return filterProductsByPrice(rows, price, 0.3).slice(0, limit);
}

export async function lookupBarcode(
  supabase: SupabaseClient,
  upcRaw: string,
  detectedPrice?: number | null,
  detectedCurrency?: string
): Promise<BarcodeLookupResult> {
  const upc = normalizeUpc(upcRaw);
  if (!upc) {
    return {
      brand: null,
      brandSlug: null,
      productName: null,
      composition: null,
      naturalFiberPercent: null,
      fiberPrimary: null,
      fiberBreakdown: null,
      price: detectedPrice ?? null,
      currency: detectedCurrency ?? null,
      source: 'not_found',
      catalogProducts: [],
      needsCompositionLabel: true,
      isNewToDatabase: false,
    };
  }

  const { data: known } = await supabase
    .from('barcode_compositions')
    .select('*')
    .eq('upc_code', upc)
    .maybeSingle();

  if (known?.composition) {
    await supabase
      .from('barcode_compositions')
      .update({
        scan_count: (known.scan_count || 1) + 1,
        last_scanned_at: new Date().toISOString(),
      })
      .eq('upc_code', upc);

    const catalogProducts = await fetchCatalogByBrandAndPrice(
      supabase,
      known.brand_slug,
      detectedPrice ?? parsePriceNumber(known.price_usd) ?? parsePriceNumber(known.price_gbp),
      6
    );

    return {
      brand: known.brand,
      brandSlug: known.brand_slug,
      productName: known.product_name,
      composition: known.composition,
      naturalFiberPercent: known.natural_fiber_percent,
      fiberPrimary: known.fiber_primary,
      fiberBreakdown: (known.fiber_breakdown as any[]) || null,
      price: detectedPrice ?? parsePriceNumber(known.price_usd) ?? parsePriceNumber(known.price_gbp),
      currency: detectedCurrency ?? known.currency_detected ?? 'USD',
      source: 'barcode_database',
      catalogProducts,
      needsCompositionLabel: false,
      isNewToDatabase: false,
    };
  }

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('upc', upc)
    .eq('approved', 'yes')
    .eq('is_active', true)
    .maybeSingle();

  if (product) {
    const catalogProducts = await fetchCatalogByBrandAndPrice(
      supabase,
      product.brand_slug,
      detectedPrice,
      6
    );

    const hadComposition = !!product.composition;
    await supabase.from('barcode_compositions').upsert(
      {
        upc_code: upc,
        brand: product.brand_name,
        brand_slug: product.brand_slug,
        product_name: product.name,
        composition: product.composition,
        natural_fiber_percent: product.natural_fiber_percent,
        fiber_primary: product.fiber_primary,
        matched_product_id: String(product.id),
        source: 'products_catalog',
      },
      { onConflict: 'upc_code' }
    );

    return {
      brand: product.brand_name,
      brandSlug: product.brand_slug,
      productName: product.name,
      composition: product.composition,
      naturalFiberPercent: product.natural_fiber_percent,
      fiberPrimary: product.fiber_primary,
      fiberBreakdown: null,
      price: detectedPrice ?? parsePriceNumber(product.price),
      currency: detectedCurrency ?? product.currency ?? null,
      source: 'products_catalog',
      catalogProducts,
      needsCompositionLabel: !hadComposition,
      isNewToDatabase: !known,
    };
  }

  const [externalResult, prefixResult] = await Promise.allSettled([
    fetchFromExternalDatabase(supabase, upc, detectedPrice, detectedCurrency, !known),
    fetchBrandFromPrefix(supabase, upc, detectedPrice, detectedCurrency),
  ]);

  const external =
    externalResult.status === 'fulfilled' ? externalResult.value : null;
  const prefix = prefixResult.status === 'fulfilled' ? prefixResult.value : null;

  if (external?.composition) return external;
  if (prefix) return prefix;
  if (external) return external;

  return {
    brand: null,
    brandSlug: null,
    productName: null,
    composition: null,
    naturalFiberPercent: null,
    fiberPrimary: null,
    fiberBreakdown: null,
    price: detectedPrice ?? null,
    currency: detectedCurrency ?? null,
    source: 'not_found',
    catalogProducts: [],
    needsCompositionLabel: true,
    isNewToDatabase: false,
  };
}

type PrefixBrandMatch = {
  brand_name: string;
  brand_slug: string | null;
  confidence?: string | null;
};

export async function fetchBrandFromPrefix(
  supabase: SupabaseClient,
  upc: string,
  detectedPrice?: number | null,
  detectedCurrency?: string
): Promise<BarcodeLookupResult | null> {
  const normalized = normalizeUpc(upc);
  if (!normalized) return null;

  for (const length of [9, 8, 7, 6]) {
    if (normalized.length < length) continue;
    const prefix = normalized.substring(0, length);
    const { data: brand } = await supabase
      .from('upc_brand_prefixes')
      .select('brand_name, brand_slug, confidence')
      .eq('prefix', prefix)
      .maybeSingle();

    if (!brand) continue;

    const verified = await isVerifiedPrefixBrand(supabase, brand);
    if (!verified) continue;

    const catalogProducts = await fetchCatalogByBrandAndPrice(
      supabase,
      brand.brand_slug,
      detectedPrice,
      6
    );

    return {
      brand: brand.brand_name,
      brandSlug: brand.brand_slug,
      productName: null,
      composition: null,
      naturalFiberPercent: null,
      fiberPrimary: null,
      fiberBreakdown: null,
      price: detectedPrice ?? null,
      currency: detectedCurrency ?? null,
      source: 'upc_prefix',
      catalogProducts,
      needsCompositionLabel: true,
      isNewToDatabase: false,
    };
  }

  return null;
}

async function isVerifiedPrefixBrand(
  supabase: SupabaseClient,
  brand: PrefixBrandMatch
): Promise<boolean> {
  if (!brand.brand_slug) return false;

  const { data: designer } = await supabase
    .from('designers')
    .select('slug')
    .eq('slug', brand.brand_slug)
    .maybeSingle();

  if (designer) return true;

  return brand.confidence === 'high';
}

async function fetchFromExternalDatabase(
  supabase: SupabaseClient,
  upc: string,
  detectedPrice?: number | null,
  detectedCurrency?: string,
  isNewToDatabase = true
): Promise<BarcodeLookupResult | null> {
  try {
    const external = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!external.ok) return null;

    const externalData = await external.json();
    const item = externalData.items?.[0];
    if (!item?.brand) return null;

    const brandSlug = await resolveDesignerSlug(supabase, item.brand);
    const { data: designer } = await supabase
      .from('designers')
      .select('slug')
      .eq('slug', brandSlug)
      .maybeSingle();
    if (!designer) return null;

    const catalogProducts = await fetchCatalogByBrandAndPrice(
      supabase,
      brandSlug,
      detectedPrice,
      6
    );

    await supabase.from('barcode_compositions').upsert(
      {
        upc_code: upc,
        brand: item.brand,
        brand_slug: brandSlug,
        product_name: item.title,
        source: 'external_api',
      },
      { onConflict: 'upc_code' }
    );

    return {
      brand: item.brand,
      brandSlug,
      productName: item.title || null,
      composition: null,
      naturalFiberPercent: null,
      fiberPrimary: null,
      fiberBreakdown: null,
      price: detectedPrice ?? null,
      currency: detectedCurrency ?? null,
      source: 'external_api',
      catalogProducts,
      needsCompositionLabel: true,
      isNewToDatabase,
    };
  } catch {
    return null;
  }
}

async function resolveDesignerSlug(supabase: SupabaseClient, brandName: string): Promise<string> {
  const { data } = await supabase
    .from('designers')
    .select('slug')
    .ilike('name', brandName.trim())
    .limit(1)
    .maybeSingle();
  if (data?.slug) return data.slug;
  return brandName
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function upsertBarcodeFromComposition(
  supabase: SupabaseClient,
  upc: string,
  payload: {
    brand?: string | null;
    brandSlug?: string | null;
    productName?: string | null;
    composition: string;
    naturalFiberPercent: number;
    fiberPrimary?: string | null;
    fiberBreakdown?: any[];
    price?: number | null;
    currency?: string | null;
  }
): Promise<boolean> {
  const upcCode = normalizeUpc(upc);
  if (!upcCode) return false;

  const { data: existing } = await supabase
    .from('barcode_compositions')
    .select('id, composition')
    .eq('upc_code', upcCode)
    .maybeSingle();

  const isNew = !existing?.composition;

  await supabase.from('barcode_compositions').upsert(
    {
      upc_code: upcCode,
      brand: payload.brand,
      brand_slug: payload.brandSlug,
      product_name: payload.productName,
      composition: payload.composition,
      natural_fiber_percent: payload.naturalFiberPercent,
      fiber_primary: payload.fiberPrimary,
      fiber_breakdown: payload.fiberBreakdown ?? null,
      price_usd: payload.price ?? null,
      currency_detected: payload.currency ?? null,
      source: 'user_scan',
      last_scanned_at: new Date().toISOString(),
      scan_count: existing ? undefined : 1,
    },
    { onConflict: 'upc_code' }
  );

  return isNew;
}
