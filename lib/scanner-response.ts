import type { SupabaseClient } from '@supabase/supabase-js';
import { scannerCatalogQuery } from './scanner-catalog';
import {
  getAlternativesLabel,
  getVerdictLabel,
  getVerdictMessage,
  NEEDS_COMPOSITION_BRAND_KNOWN,
  NEEDS_COMPOSITION_GENERIC,
  parsePriceNumber,
} from './scanner-copy';
import type { BarcodeLookupResult } from './scanner-barcode-lookup';
import { getSmartAlternatives } from './scanner-barcode-lookup';
import { detectGarmentType } from './scanner/detect-garment-type';

export type ScanResponseInput = {
  supabase: SupabaseClient;
  brandName: string;
  brandSlug: string;
  productName: string;
  price: string;
  priceNum: number | null;
  imageUrl?: string;
  category: string;
  color: string;
  garmentType: string;
  compositionText: string;
  fibers: any[];
  naturalPercent: number;
  qualityScore: number;
  verdict: string;
  alternatives: any[];
  brandProducts: any[];
  designerInfo: any;
  brandStats: any;
  confirmPrompt: string | null;
  inputType: string;
  sourceHost?: string;
  barcode?: string;
  lookupSource?: string;
  needsCompositionLabel?: boolean;
  isNewToDatabase?: boolean;
  success?: boolean;
  countryOfOrigin?: string | null;
  careInstructions?: string | null;
  hasRecycledContent?: boolean;
  recycledContentPercent?: number | null;
  labelLanguage?: string | null;
  dppReady?: boolean;
};

function slugifyBrand(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function enrichBrandContext(
  supabase: SupabaseClient,
  brandName: string,
  brandSlug: string,
  productName: string,
  category: string,
  garmentType: string
) {
  let designerInfo = null;
  let brandProducts: any[] = [];
  try {
    const [dr, fdr] = await Promise.all([
      supabase.from('designers').select('*').eq('slug', brandSlug).limit(1),
      supabase.from('designers').select('*').ilike('name', `%${brandName}%`).limit(1),
    ]);
    designerInfo = dr.data?.[0] || fdr.data?.[0] || null;
    if (brandSlug && brandSlug !== 'unknown') {
      const normalizedBrandName = brandName.replace(/'/g, "''");
      const { data } = await scannerCatalogQuery(supabase)
        .or(`brand_slug.eq.${brandSlug},brand_name.ilike.%${normalizedBrandName}%`)
        .order('natural_fiber_percent', { ascending: false })
        .limit(12);
      brandProducts = data || [];
      if (brandProducts.length === 0 && productName) {
        const terms = [productName, garmentType, category]
          .filter(Boolean)
          .join(' ')
          .split(/\s+/)
          .map((term: string) => term.toLowerCase().replace(/[^a-z0-9]/g, ''))
          .filter((term: string) => term.length >= 4)
          .slice(0, 4);
        if (terms.length > 0) {
          const { data: productMatches } = await scannerCatalogQuery(supabase)
            .or(terms.map((term: string) => `name.ilike.%${term}%`).join(','))
            .order('natural_fiber_percent', { ascending: false })
            .limit(12);
          brandProducts = productMatches || [];
        }
      }
    }
  } catch {
    /* optional */
  }

  const avgFiber = brandProducts.length
    ? Math.min(
        99,
        Math.round(
          brandProducts.reduce((s: number, p: any) => s + (p.natural_fiber_percent || 0), 0) /
            brandProducts.length
        )
      )
    : null;
  const brandRating =
    avgFiber === null
      ? null
      : avgFiber >= 95
        ? 'Exceptional'
        : avgFiber >= 85
          ? 'Excellent'
          : avgFiber >= 70
            ? 'Good'
            : 'Caution';

  return { designerInfo, brandProducts, avgFiber, brandRating };
}

export function buildUnifiedScanResponse(input: ScanResponseInput) {
  const {
    brandName,
    productName,
    price,
    priceNum,
    imageUrl = '',
    category,
    color,
    garmentType,
    compositionText,
    fibers,
    naturalPercent,
    qualityScore,
    verdict,
    alternatives,
    brandProducts,
    designerInfo,
    brandStats,
    confirmPrompt,
    inputType,
    sourceHost = '',
    barcode = '',
    lookupSource,
    needsCompositionLabel = false,
    isNewToDatabase = false,
    success = true,
    countryOfOrigin = null,
    careInstructions = null,
    hasRecycledContent = false,
    recycledContentPercent = null,
    labelLanguage = null,
    dppReady = false,
  } = input;

  const needsMessage = needsCompositionLabel
    ? brandName && brandName !== 'Unknown'
      ? NEEDS_COMPOSITION_BRAND_KNOWN
      : NEEDS_COMPOSITION_GENERIC
    : null;

  const verdictMessage =
    naturalPercent > 0 || compositionText
      ? getVerdictMessage(naturalPercent)
      : needsMessage || getVerdictMessage(0);

  const displayVerdict = compositionText || naturalPercent > 0 ? verdictMessage : needsMessage || verdictMessage;

  return {
    success,
    inputType,
    lookupSource: lookupSource || inputType,
    brand: brandName !== 'Unknown' ? brandName : null,
    productName: productName || null,
    composition: compositionText || null,
    naturalPercent,
    fibers: fibers,
    fiberBreakdown: fibers,
    verdict: displayVerdict,
    verdictMessage,
    verdictLabel: getVerdictLabel(naturalPercent),
    alternatives,
    betterAlternatives: alternatives,
    alternativesLabel: getAlternativesLabel(naturalPercent, priceNum, alternatives),
    catalogProducts: brandProducts.slice(0, 12),
    products: brandProducts.slice(0, 12),
    needsCompositionLabel,
    needsCompositionMessage: needsMessage,
    isNewToDatabase,
    countryOfOrigin,
    careInstructions,
    hasRecycledContent,
    recycledContentPercent,
    labelLanguage,
    dppReady,
    tagInfo: {
      brandName: brandName || 'Unknown',
      productName,
      price,
      composition: compositionText,
      garmentType,
      size: '',
      madeIn: countryOfOrigin || '',
      careInstructions: careInstructions || '',
      confidence: compositionText ? 'high' : needsCompositionLabel ? 'medium' : 'low',
      rawText:
        inputType === 'barcode'
          ? 'From barcode'
          : inputType === 'composition'
            ? 'From care label'
            : inputType === 'image'
              ? 'From photo scan'
              : inputType === 'url'
                ? `From ${sourceHost || 'product URL'}`
                : 'From scan',
      inputType,
      color,
      silhouette: '',
      barcode: barcode || '',
    },
    imageUrl,
    qualityScore,
    isNatural: naturalPercent >= 80,
    category,
    matched: !!(designerInfo || brandProducts.length || alternatives.length),
    brandStats,
    designerInfo: designerInfo
      ? {
          name: designerInfo.name,
          slug: designerInfo.slug,
          logo_url: designerInfo.logo_url,
          website: designerInfo.website,
          description: designerInfo.description,
          rating: designerInfo.rating,
          hasProducts: brandProducts.length > 0,
        }
      : null,
    confirmationPrompt: confirmPrompt,
  };
}

export async function buildBarcodeScanResponse(
  supabase: SupabaseClient,
  barcodeResult: BarcodeLookupResult,
  upc: string,
  userId: string | null,
  sessionId?: string | null,
  deviceType?: string | null
) {
  const brandName = barcodeResult.brand || 'Unknown';
  const brandSlug = barcodeResult.brandSlug || slugifyBrand(brandName);
  const productName = barcodeResult.productName || '';
  const garmentType = detectGarmentType(productName, '');
  const compositionText = barcodeResult.composition || '';
  const naturalPercent = barcodeResult.naturalFiberPercent ?? 0;
  const fibers = barcodeResult.fiberBreakdown || [];
  const priceStr = barcodeResult.price != null ? `$${barcodeResult.price}` : '';

  const alternatives = await getSmartAlternatives(supabase, {
    composition: barcodeResult.composition,
    detectedPrice: barcodeResult.price,
    currency: barcodeResult.currency,
    garmentType,
    primaryFiber: barcodeResult.fiberPrimary,
    naturalFiberPercent: barcodeResult.naturalFiberPercent,
    brandSlug: barcodeResult.brandSlug,
    region: 'us',
    userId,
    excludeBrandSlug: barcodeResult.brandSlug || undefined,
  });

  const { designerInfo, brandProducts, avgFiber, brandRating } = await enrichBrandContext(
    supabase,
    brandName,
    brandSlug,
    productName,
    '',
    ''
  );

  const mergedBrandProducts =
    barcodeResult.catalogProducts.length > 0
      ? [...barcodeResult.catalogProducts, ...brandProducts].filter(
          (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
        )
      : brandProducts;

  const brandStats =
    mergedBrandProducts.length && avgFiber !== null
      ? { avgFiber, rating: brandRating, productCount: mergedBrandProducts.length }
      : null;

  return buildUnifiedScanResponse({
    supabase,
    brandName,
    brandSlug,
    productName,
    price: priceStr,
    priceNum: barcodeResult.price,
    category: '',
    color: '',
    garmentType: garmentType || '',
    compositionText,
    fibers,
    naturalPercent,
    qualityScore: naturalPercent,
    verdict: getVerdictMessage(naturalPercent),
    alternatives,
    brandProducts: mergedBrandProducts,
    designerInfo,
    brandStats,
    confirmPrompt: null,
    inputType: 'barcode',
    barcode: upc,
    lookupSource: barcodeResult.source,
    needsCompositionLabel: barcodeResult.needsCompositionLabel,
    isNewToDatabase: barcodeResult.isNewToDatabase,
    success: true,
    countryOfOrigin: barcodeResult.countryOfOrigin ?? null,
    careInstructions: barcodeResult.careInstructions ?? null,
    hasRecycledContent: barcodeResult.hasRecycledContent ?? false,
    recycledContentPercent: barcodeResult.recycledContentPercent ?? null,
    labelLanguage: barcodeResult.labelLanguage ?? null,
    dppReady: barcodeResult.dppReady ?? false,
  });
}
