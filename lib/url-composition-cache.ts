import type { SupabaseClient } from "@supabase/supabase-js";

export type URLCompositionRow = {
  url: string;
  brand_name: string | null;
  brand_slug: string | null;
  product_name: string | null;
  composition: string | null;
  natural_percent: number | null;
  price_usd: number | null;
  garment_type: string | null;
  image_url: string | null;
  fiber_breakdown: unknown[] | null;
};

export function normalizeScanURL(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    for (const p of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "gad_source",
      "gclid",
      "fbclid",
    ]) {
      parsed.searchParams.delete(p);
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export async function lookupURLComposition(
  supabase: SupabaseClient,
  rawUrl: string
): Promise<URLCompositionRow | null> {
  const url = normalizeScanURL(rawUrl);
  if (!url) return null;

  const { data } = await supabase
    .from("url_compositions")
    .select("*")
    .eq("url", url)
    .maybeSingle();

  if (!data?.composition) return null;

  void supabase.rpc("increment_url_scan_count", { target_url: url });
  return data as URLCompositionRow;
}

export async function cacheURLComposition(
  supabase: SupabaseClient,
  rawUrl: string,
  payload: {
    brandName?: string | null;
    brandSlug?: string | null;
    productName?: string | null;
    composition?: string | null;
    naturalPercent?: number | null;
    priceUsd?: number | null;
    garmentType?: string | null;
    imageUrl?: string | null;
    fiberBreakdown?: unknown[] | null;
    region?: string | null;
  }
): Promise<void> {
  const url = normalizeScanURL(rawUrl);
  const composition = String(payload.composition || "").trim();
  if (!url || !composition) return;

  await supabase.from("url_compositions").upsert(
    {
      url,
      brand_name: payload.brandName ?? null,
      brand_slug: payload.brandSlug ?? null,
      product_name: payload.productName ?? null,
      composition,
      natural_percent: payload.naturalPercent ?? null,
      price_usd: payload.priceUsd ?? null,
      garment_type: payload.garmentType ?? null,
      image_url: payload.imageUrl ?? null,
      fiber_breakdown: payload.fiberBreakdown ?? null,
      region: payload.region ?? "us",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "url_hash" }
  );
}

export function urlCompositionToExtracted(row: URLCompositionRow) {
  return {
    brandName: row.brand_name || "",
    productName: row.product_name || "",
    composition: row.composition || "",
    naturalFiberPercent: row.natural_percent ?? undefined,
    garmentType: row.garment_type || "",
    price: row.price_usd ? `$${row.price_usd}` : "",
    imageUrl: row.image_url || "",
    fibers: (row.fiber_breakdown as any[]) || [],
    inputType: "url",
    confidence: "database",
  };
}
