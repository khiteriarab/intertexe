import type { SupabaseClient } from "@supabase/supabase-js";

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
