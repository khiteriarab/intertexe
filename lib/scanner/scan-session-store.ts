import type { SupabaseClient } from '@supabase/supabase-js';

export type ScanSession = {
  sessionId: string;
  barcode?: string | null;
  brandName?: string | null;
  brandSlug?: string | null;
  productName?: string | null;
  garmentType?: string | null;
  detectedPrice?: number | null;
  detectedCurrency?: string | null;
  composition?: string | null;
  naturalPercent?: number | null;
  imageUrl?: string | null;
  region?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ScanSessionRow = {
  session_id: string;
  barcode?: string | null;
  brand_name?: string | null;
  brand_slug?: string | null;
  product_name?: string | null;
  garment_type?: string | null;
  detected_price?: number | null;
  detected_currency?: string | null;
  composition?: string | null;
  natural_percent?: number | null;
  image_url?: string | null;
  region?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MergedScanContext = {
  sessionId: string;
  barcode?: string;
  brandName?: string;
  brandSlug?: string;
  productName?: string;
  garmentType?: string;
  detectedPrice?: number | null;
  detectedCurrency: string;
  composition?: string;
  naturalPercent?: number | null;
  imageUrl?: string;
  region: string;
};

function rowToSession(row: ScanSessionRow): ScanSession {
  return {
    sessionId: row.session_id,
    barcode: row.barcode,
    brandName: row.brand_name,
    brandSlug: row.brand_slug,
    productName: row.product_name,
    garmentType: row.garment_type,
    detectedPrice: row.detected_price != null ? Number(row.detected_price) : null,
    detectedCurrency: row.detected_currency,
    composition: row.composition,
    naturalPercent: row.natural_percent,
    imageUrl: row.image_url,
    region: row.region,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(
  sessionId: string,
  updates: Partial<ScanSession>
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    session_id: sessionId,
    updated_at: new Date().toISOString(),
  };
  if (updates.barcode !== undefined) row.barcode = updates.barcode;
  if (updates.brandName !== undefined) row.brand_name = updates.brandName;
  if (updates.brandSlug !== undefined) row.brand_slug = updates.brandSlug;
  if (updates.productName !== undefined) row.product_name = updates.productName;
  if (updates.garmentType !== undefined) row.garment_type = updates.garmentType;
  if (updates.detectedPrice !== undefined) row.detected_price = updates.detectedPrice;
  if (updates.detectedCurrency !== undefined) row.detected_currency = updates.detectedCurrency;
  if (updates.composition !== undefined) row.composition = updates.composition;
  if (updates.naturalPercent !== undefined) row.natural_percent = updates.naturalPercent;
  if (updates.imageUrl !== undefined) row.image_url = updates.imageUrl;
  if (updates.region !== undefined) row.region = updates.region;
  return row;
}

export async function getScanSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<ScanSession | null> {
  if (!sessionId) return null;
  const { data } = await supabase
    .from('scan_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  return data ? rowToSession(data as ScanSessionRow) : null;
}

export async function getOrCreateScanSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<ScanSession> {
  const existing = await getScanSession(supabase, sessionId);
  if (existing) return existing;

  const now = new Date().toISOString();
  await supabase.from('scan_sessions').upsert({
    session_id: sessionId,
    detected_currency: 'USD',
    region: 'us',
    created_at: now,
    updated_at: now,
  });

  return {
    sessionId,
    detectedCurrency: 'USD',
    region: 'us',
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateScanSession(
  supabase: SupabaseClient,
  sessionId: string,
  updates: Partial<ScanSession>
): Promise<void> {
  if (!sessionId) return;
  await supabase
    .from('scan_sessions')
    .upsert(toRow(sessionId, updates), { onConflict: 'session_id' });
}

export function mergeScanContext(
  session: ScanSession | null,
  body: Record<string, any>,
  parsedPrice: number | null
): MergedScanContext {
  const sessionId = String(body.session_id || session?.sessionId || '').trim();
  const compositionRaw =
    body.composition_text ||
    body.composition ||
    session?.composition ||
    '';
  const composition =
    typeof compositionRaw === 'string' && compositionRaw.trim()
      ? compositionRaw.trim()
      : undefined;

  const brandFromBody = String(body.brand || body.brand_name || '').trim();
  const brandName =
    brandFromBody ||
    (session?.brandName && session.brandName !== 'Unknown' ? session.brandName : '') ||
    undefined;

  return {
    sessionId,
    barcode: String(body.barcode || session?.barcode || '').replace(/\D/g, '') || undefined,
    brandName,
    brandSlug: session?.brandSlug || undefined,
    productName:
      String(body.product_name || body.productName || session?.productName || '').trim() ||
      undefined,
    garmentType:
      String(body.garment_type || body.garmentType || session?.garmentType || '').trim() ||
      undefined,
    detectedPrice:
      parsedPrice ??
      (session?.detectedPrice != null ? Number(session.detectedPrice) : null),
    detectedCurrency:
      String(body.detected_currency || body.currency || session?.detectedCurrency || 'USD').trim() ||
      'USD',
    composition,
    naturalPercent: session?.naturalPercent ?? null,
    imageUrl:
      String(body.image_url || body.imageUrl || session?.imageUrl || '').trim() || undefined,
    region: String(body.region || session?.region || 'us').trim().toLowerCase() || 'us',
  };
}

export async function cleanOldSessions(supabase: SupabaseClient): Promise<void> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await supabase.from('scan_sessions').delete().lt('updated_at', thirtyMinutesAgo);
}

export function resolveDisplayBrand(brandName?: string | null): string {
  const trimmed = String(brandName || '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') return '';
  return trimmed;
}
