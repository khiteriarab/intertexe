import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUnavailableStock(stockStatus?: string | null): boolean {
  const status = (stockStatus || "").toLowerCase().trim();
  if (!status) return false;
  return (
    /sold[\s_-]?out/.test(status) ||
    /out[\s_-]?of[\s_-]?stock/.test(status) ||
    status === "unavailable" ||
    status === "discontinued"
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Classify wishlist rows as keep vs unavailable.
 *
 * IMPORTANT: never hard-delete favorites during a normal read.
 * Catalog outages / apparel-only views / shoe exclusions previously caused
 * permanent wishlist data loss when this ran on every GET.
 */
export async function pruneUnavailableProductFavorites(
  supabase: SupabaseClient,
  userId: string,
  productIds?: string[],
  opts?: { hardDelete?: boolean }
): Promise<{ kept: string[]; removed: string[] }> {
  let ids = productIds;
  if (!ids) {
    const { data, error } = await supabase
      .from("product_favorites")
      .select("product_id")
      .eq("user_id", userId);
    if (error) throw error;
    ids = (data || []).map((row: { product_id: string }) => row.product_id);
  }

  if (!ids.length) return { kept: [], removed: [] };

  const uuidIds = ids.filter((id) => UUID_RE.test(id));
  const externalIds = ids.filter((id) => !UUID_RE.test(id));
  const available = new Set<string>();

  for (const batch of chunk(uuidIds, 100)) {
    const { data, error } = await supabase
      .from("products")
      .select("id, product_id, stock_status, is_displayable, is_active, approved")
      .in("id", batch);
    if (error) throw error;
    for (const row of data || []) markAvailable(row, available);
  }

  for (const batch of chunk(externalIds, 100)) {
    const { data, error } = await supabase
      .from("products")
      .select("id, product_id, stock_status, is_displayable, is_active, approved")
      .in("product_id", batch);
    if (error) throw error;
    for (const row of data || []) markAvailable(row, available);
  }

  const kept: string[] = [];
  const removed: string[] = [];
  for (const id of ids) {
    if (available.has(id)) kept.push(id);
    else removed.push(id);
  }

  // Soft-default: keep wishlist rows forever unless explicitly opted into hard delete
  // (e.g. a dedicated cleanup job). Normal Favorites GET must never wipe user data.
  if (opts?.hardDelete && removed.length > 0) {
    const { error: deleteErr } = await supabase
      .from("product_favorites")
      .delete()
      .eq("user_id", userId)
      .in("product_id", removed);
    if (deleteErr) throw deleteErr;
  }

  // Always return the full saved list for display; callers may use `removed`
  // for UI badges ("unavailable") without destroying rows.
  return { kept: ids, removed };
}

function markAvailable(
  row: {
    id?: string | null;
    product_id?: string | null;
    stock_status?: string | null;
    is_displayable?: boolean | null;
    is_active?: boolean | null;
    approved?: string | null;
  },
  available: Set<string>
) {
  if (isUnavailableStock(row.stock_status != null ? String(row.stock_status) : null)) return;
  // Keep favorites even when temporarily non-displayable after feed incidents.
  // Only stock-status sold-out is treated as unavailable for optional UI hints.
  if (row.id) available.add(String(row.id));
  if (row.product_id) available.add(String(row.product_id));
}
