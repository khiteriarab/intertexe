import type { SupabaseClient } from '@supabase/supabase-js';

export type DppScanFields = {
  countryOfOrigin?: string | null;
  careInstructions?: string | null;
  hasRecycledContent?: boolean;
  recycledContentPercent?: number | null;
  labelLanguage?: string | null;
  fiberBreakdown?: any[] | null;
};

export function computeDppReady(fields: {
  countryOfOrigin?: string | null;
  careInstructions?: string | null;
  composition?: string | null;
}): boolean {
  return !!(
    fields.countryOfOrigin &&
    fields.careInstructions &&
    fields.composition
  );
}

export function buildDppUpsertFields(
  composition: string | null | undefined,
  dpp: DppScanFields
) {
  const dppReady = computeDppReady({
    countryOfOrigin: dpp.countryOfOrigin,
    careInstructions: dpp.careInstructions,
    composition,
  });

  return {
    country_of_origin: dpp.countryOfOrigin ?? null,
    care_instructions: dpp.careInstructions ?? null,
    has_recycled_content: dpp.hasRecycledContent ?? false,
    recycled_content_percent: dpp.recycledContentPercent ?? null,
    label_language: dpp.labelLanguage ?? null,
    verified_by: 'user_scan',
    verification_date: new Date().toISOString(),
    dpp_ready: dppReady,
    ...(dpp.fiberBreakdown ? { fiber_breakdown: dpp.fiberBreakdown } : {}),
  };
}

export function mapExtractedDppFields(extracted: any, fibers: any[]): DppScanFields {
  const hasRecycledFromFibers = fibers.some(
    (f: any) => f.isRecycled === true || /recycled|regenerated/i.test(String(f.fiber || f.name || ''))
  );

  return {
    countryOfOrigin: extracted.countryOfOrigin || extracted.madeIn || null,
    careInstructions: extracted.careInstructions || null,
    hasRecycledContent:
      extracted.hasRecycledContent === true ||
      hasRecycledFromFibers ||
      (typeof extracted.recycledContentPercent === 'number' && extracted.recycledContentPercent > 0),
    recycledContentPercent:
      extracted.recycledContentPercent != null
        ? Number(extracted.recycledContentPercent)
        : null,
    labelLanguage: extracted.labelLanguage || null,
    fiberBreakdown: fibers.length ? fibers : null,
  };
}

export async function countDppReadyBarcodes(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from('barcode_compositions')
    .select('*', { count: 'exact', head: true })
    .eq('dpp_ready', true);
  return count ?? 0;
}
