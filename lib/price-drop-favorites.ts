import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCaptureWatchId } from "./sale-alerts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FavoritePriceRow = {
  id: string;
  user_id: string;
  product_id: string;
  saved_price: number | string | null;
  saved_currency: string | null;
};

export type ProductPriceRow = {
  id: string;
  product_id: string | null;
  name: string;
  brand_name: string;
  price: unknown;
  currency?: string | null;
  image_url?: string | null;
  url?: string | null;
  natural_fiber_percent?: number | null;
  is_active?: boolean | null;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function parsePrice(val: unknown): number | null {
  if (val == null) return null;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Favorites store Rakuten/external `product_id` values most of the time,
 * not `products.id` UUIDs. Never rely on a FK join to products.id.
 */
export async function loadFavoriteProductsForPriceCheck(
  supabase: SupabaseClient,
  favorites: FavoritePriceRow[]
): Promise<Map<string, ProductPriceRow>> {
  const byKey = new Map<string, ProductPriceRow>();
  if (!favorites.length) return byKey;

  const uuidIds = favorites.map((f) => f.product_id).filter((id) => UUID_RE.test(id));
  const externalIds = favorites.map((f) => f.product_id).filter((id) => !UUID_RE.test(id));
  const cols =
    "id, product_id, name, brand_name, price, currency, image_url, url, natural_fiber_percent, is_active";

  for (const batch of chunk(uuidIds, 100)) {
    const { data } = await supabase.from("products").select(cols).in("id", batch);
    for (const row of (data || []) as ProductPriceRow[]) {
      byKey.set(String(row.id), row);
      if (row.product_id) byKey.set(String(row.product_id), row);
    }
  }

  for (const batch of chunk(externalIds, 100)) {
    const { data } = await supabase.from("products").select(cols).in("product_id", batch);
    for (const row of (data || []) as ProductPriceRow[]) {
      byKey.set(String(row.product_id || ""), row);
      byKey.set(String(row.id), row);
    }
  }

  return byKey;
}

export function isPriceDrop(
  savedPrice: number | null,
  currentPrice: number | null,
  threshold = 0.95
): boolean {
  return (
    savedPrice != null &&
    currentPrice != null &&
    savedPrice > 0 &&
    currentPrice > 0 &&
    currentPrice < savedPrice * threshold
  );
}

function stripUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
}

/**
 * Account sale alerts from the extension and /matches page are stored on
 * price_watches as capture:<id>. Resolve those to catalog products when the
 * same URL exists in INTERTEXE so the daily price-drop email can fire.
 */
export async function loadCaptureSaleWatchFavorites(
  supabase: SupabaseClient
): Promise<FavoritePriceRow[]> {
  const { data: watches } = await supabase
    .from("price_watches")
    .select("user_id, product_id, original_price");
  const rows = (watches || []).filter((row) => parseCaptureWatchId(String(row.product_id || "")));
  if (!rows.length) return [];

  const captureIds = [
    ...new Set(rows.map((row) => parseCaptureWatchId(String(row.product_id))).filter(Boolean) as string[]),
  ];
  const captures: { id: string; original_url: string | null; canonical_url: string | null }[] = [];
  for (const batch of chunk(captureIds, 100)) {
    const { data } = await supabase
      .from("external_captures")
      .select("id, original_url, canonical_url")
      .in("id", batch);
    captures.push(...((data || []) as typeof captures));
  }
  const captureById = new Map(captures.map((row) => [String(row.id), row]));

  const urls = [
    ...new Set(
      captures
        .flatMap((row) => [row.canonical_url, row.original_url])
        .filter((url): url is string => Boolean(url && String(url).trim()))
        .map((url) => stripUrl(String(url)))
    ),
  ];
  const productsByUrl = new Map<string, ProductPriceRow>();
  for (const batch of chunk(urls, 50)) {
    const { data } = await supabase
      .from("products")
      .select(
        "id, product_id, name, brand_name, price, currency, image_url, url, natural_fiber_percent, is_active"
      )
      .in("url", batch);
    for (const product of (data || []) as ProductPriceRow[]) {
      if (product.url) productsByUrl.set(stripUrl(String(product.url)), product);
    }
  }

  const out: FavoritePriceRow[] = [];
  for (const watch of rows) {
    const captureId = parseCaptureWatchId(String(watch.product_id));
    if (!captureId) continue;
    const capture = captureById.get(captureId);
    const url = stripUrl(String(capture?.canonical_url || capture?.original_url || ""));
    const product = url ? productsByUrl.get(url) : undefined;
    if (!product) continue;
    out.push({
      id: "",
      user_id: String(watch.user_id),
      product_id: String(product.product_id || product.id),
      saved_price: watch.original_price as string,
      saved_currency: product.currency || null,
    });
  }
  return out;
}
