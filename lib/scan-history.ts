/**
 * Normalized scan_history row for API + iOS parity.
 * Column names match public.scan_history (see migrations).
 */

export type ScanHistoryInput = {
  userId?: string | null;
  sessionId?: string | null;
  brand?: string | null;
  productName?: string | null;
  composition?: string | null;
  naturalPercent?: number | null;
  verdict?: string | null;
  scanSource?: string | null;
  imageUrl?: string | null;
  productUrl?: string | null;
  upcCode?: string | null;
  countryOfOrigin?: string | null;
  careInstructions?: string | null;
  hasRecycledContent?: boolean;
  deviceType?: string | null;
  appVersion?: string | null;
  labelType?: string | null;
  rawOcrText?: string | null;
  lookupSource?: string | null;
  fiberPrimary?: string | null;
  priceDetected?: number | null;
  currencyDetected?: string | null;
  helpedBuildDatabase?: boolean;
  alternativesShown?: string[];
  rawAnalysis?: Record<string, unknown> | null;
  detectedBrand?: string | null;
};

export function buildScanHistoryRow(input: ScanHistoryInput): Record<string, unknown> {
  const country = input.countryOfOrigin?.trim() || null;
  return {
    user_id: input.userId ?? null,
    session_id: input.sessionId ?? null,
    scanned_at: new Date().toISOString(),
    brand: input.brand ?? null,
    product_name: input.productName ?? null,
    composition: input.composition ?? null,
    natural_percent: input.naturalPercent ?? null,
    verdict: input.verdict ?? null,
    scan_source: input.scanSource ?? "manual",
    image_url: input.imageUrl?.trim() || null,
    product_url: input.productUrl?.trim() || null,
    upc_code: input.upcCode?.replace(/\D/g, "") || null,
    country: country,
    country_of_origin: country,
    care_instructions: input.careInstructions?.trim() || null,
    has_recycled_content: input.hasRecycledContent ?? false,
    device_type: input.deviceType ?? null,
    app_version: input.appVersion ?? null,
    label_type: input.labelType ?? null,
    raw_ocr_text: input.rawOcrText ?? null,
    lookup_source: input.lookupSource ?? null,
    detected_brand: input.detectedBrand ?? input.brand ?? null,
    fiber_primary: input.fiberPrimary ?? null,
    price_detected: input.priceDetected ?? null,
    currency_detected: input.currencyDetected ?? null,
    helped_build_database: input.helpedBuildDatabase ?? false,
    alternatives_shown: input.alternativesShown?.length ? input.alternativesShown : null,
    raw_analysis: input.rawAnalysis ?? null,
  };
}
