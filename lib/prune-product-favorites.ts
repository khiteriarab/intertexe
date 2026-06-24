import type { SupabaseClient } from "@supabase/supabase-js";

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

/** Remove wishlist rows that are no longer in the live consumer catalog or are sold out. */
export async function pruneUnavailableProductFavorites(
  supabase: SupabaseClient,
  userId: string,
  productIds?: string[]
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

  const { data: liveRows, error: liveErr } = await supabase
    .from("live_products_apparel")
    .select("id, product_id, stock_status")
    .or(`id.in.(${ids.join(",")}),product_id.in.(${ids.join(",")})`);
  if (liveErr) throw liveErr;

  const available = new Set<string>();
  for (const row of liveRows || []) {
    if (isUnavailableStock(row.stock_status != null ? String(row.stock_status) : null)) continue;
    if (row.id) available.add(String(row.id));
    if (row.product_id) available.add(String(row.product_id));
  }

  const kept: string[] = [];
  const removed: string[] = [];
  for (const id of ids) {
    if (available.has(id)) kept.push(id);
    else removed.push(id);
  }

  if (removed.length > 0) {
    const { error: deleteErr } = await supabase
      .from("product_favorites")
      .delete()
      .eq("user_id", userId)
      .in("product_id", removed);
    if (deleteErr) throw deleteErr;
  }

  return { kept, removed };
}
