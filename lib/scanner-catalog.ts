/**
 * Scanner catalog queries — same consumer surface as shop (live_products_apparel).
 * The view already enforces approved=yes, is_active, NFP≥80, women's apparel scope.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const SCANNER_CATALOG_TABLE = "live_products_apparel" as const;

const MIN_NFP = 80;

/** Base query for scanner product reads (catalog-aligned). */
export function scannerCatalogQuery(supabase: SupabaseClient) {
  return supabase
    .from(SCANNER_CATALOG_TABLE)
    .select("*")
    .gte("natural_fiber_percent", MIN_NFP)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .not("price", "is", null)
    .neq("price", "");
}
