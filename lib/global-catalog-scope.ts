/**
 * Global women's apparel scope — applied to every live_products_apparel PostgREST query.
 * Mirrors supabase view guards + iOS WomensCatalogGuard.
 *
 * Filters must run after `.select()` (PostgREST builder from `.from()` alone has no `.not()`).
 */

export const EXCLUDED_GENDER_SCOPES = ["men", "male", "mens", "boys"] as const;

const EXCLUDED_HOME_CATEGORY_PATTERNS = [
  "%bedding%",
  "%sheet%",
  "%pillow%",
  "%duvet%",
  "%towel%",
  "%blanket%",
  "%curtain%",
  "%rug%",
  "%home%",
  "%kitchen%",
  "%bath%",
] as const;

const EXCLUDED_HOME_NAME_PATTERNS = [
  "%sheet%",
  "%pillowcase%",
  "%duvet%",
  "%bedding%",
  "%towel%",
  "%blanket%",
] as const;

/** eslint-disable @typescript-eslint/no-explicit-any */
export function applyGlobalCatalogScope<T extends { not: (...args: any[]) => T }>(query: T): T {
  let q = query.not("gender_scope", "in", `(${EXCLUDED_GENDER_SCOPES.map((g) => `"${g}"`).join(",")})`);
  for (const pattern of EXCLUDED_HOME_CATEGORY_PATTERNS) {
    q = q.not("category", "ilike", pattern);
  }
  for (const pattern of EXCLUDED_HOME_NAME_PATTERNS) {
    q = q.not("name", "ilike", pattern);
  }
  return q;
}

/** Start a scoped `live_products_apparel` query — call `.select(...)` then chain filters. */
export function liveProductsApparelFrom(supabase: { from: (table: string) => { select: (...args: any[]) => any } }) {
  const table = supabase.from("live_products_apparel");
  return {
    select(columns?: string, options?: Record<string, unknown>) {
      return applyGlobalCatalogScope(table.select(columns ?? "*", options));
    },
  };
}
