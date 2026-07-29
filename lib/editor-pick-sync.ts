/**
 * Curator favorites drive products.is_editor_pick (what we push to all shoppers).
 * Unfavorite must immediately clear the flag and bust homepage caches.
 */
import { revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export const EDITOR_PICK_CURATOR_EMAIL = "khiteriarab@gmail.com";

type Untyped = SupabaseClient<any, "public", any>;

export function isEditorPickCurator(user: { email?: string | null } | null | undefined): boolean {
  const email = String(user?.email || "").trim().toLowerCase();
  return email.length > 0 && email === EDITOR_PICK_CURATOR_EMAIL;
}

/** Resolve UUID + feed product_id aliases for a favorite key. */
export async function resolveFavoriteProductAliases(
  supabase: Untyped,
  productId: string
): Promise<string[]> {
  const raw = String(productId || "").trim();
  if (!raw) return [];
  const ids = new Set<string>([raw]);

  const { data: byExternal } = await supabase
    .from("products")
    .select("id, product_id")
    .eq("product_id", raw)
    .limit(5);
  for (const row of byExternal || []) {
    if (row?.id) ids.add(String(row.id));
    if (row?.product_id) ids.add(String(row.product_id));
  }

  const { data: byUuid } = await supabase
    .from("products")
    .select("id, product_id")
    .eq("id", raw)
    .limit(5);
  for (const row of byUuid || []) {
    if (row?.id) ids.add(String(row.id));
    if (row?.product_id) ids.add(String(row.product_id));
  }

  return [...ids].filter(Boolean);
}

/**
 * Remove curator favorite aliases and clear editor-pick merchandising immediately.
 * Safe to call for non-curators (no-op beyond returning aliases).
 */
export async function clearCuratorEditorPickAfterUnfavorite(
  supabase: Untyped,
  user: { id: string | number; email?: string | null },
  productId: string
): Promise<{ aliases: string[]; clearedEditorPick: boolean }> {
  const aliases = await resolveFavoriteProductAliases(supabase, productId);
  const userId = String(user.id);

  if (aliases.length > 0) {
    await supabase.from("product_favorites").delete().eq("user_id", userId).in("product_id", aliases);
  } else {
    await supabase.from("product_favorites").delete().eq("user_id", userId).eq("product_id", productId);
  }

  let clearedEditorPick = false;
  if (isEditorPickCurator(user)) {
    const keys = aliases.length > 0 ? aliases : [productId];
    const now = new Date().toISOString();
    const patch = {
      is_editor_pick: false,
      editor_picked_at: null as null,
      updated_at: now,
    };
    const uuidLike =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const uuidKeys = keys.filter((k) => uuidLike.test(k));
    const byId = uuidKeys.length
      ? await supabase.from("products").update(patch).in("id", uuidKeys)
      : { error: null };
    const byExternal = await supabase.from("products").update(patch).in("product_id", keys);
    clearedEditorPick = !byId.error && !byExternal.error;
    try {
      revalidateTag("homepage");
    } catch {
      // Build contexts without Next cache still succeed on the DB clear.
    }
  }

  return { aliases: aliases.length > 0 ? aliases : [productId], clearedEditorPick };
}

/** Bust homepage caches when the curator favorites (adds) a pick. */
export function bustHomepageCacheForCuratorFavorite(user: { email?: string | null } | null | undefined) {
  if (!isEditorPickCurator(user)) return;
  try {
    revalidateTag("homepage");
  } catch {
    // ignore
  }
}
