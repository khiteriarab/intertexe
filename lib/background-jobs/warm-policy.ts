/**
 * Warming policy — permanent INTERTEXE engineering standard.
 *
 * ONLY lightweight health endpoints may ever be warmed.
 * Catalog, search, scan, recommendations, and sale APIs must NEVER be warmed.
 */

export const WARM_FORBIDDEN_PATH_PREFIXES = [
  "/api/catalog",
  "/api/sale",
  "/api/scan",
  "/api/scan-tag",
  "/api/scan-url",
  "/api/recommend",
  "/api/shop",
  "/api/products",
  "/api/homepage",
  "/api/designers",
  "/api/search",
] as const;

/** Explicit allow-list for any future optional warm job. */
export const WARM_ALLOWED_PATHS = ["/api/health"] as const;

export function isWarmPathForbidden(route: string): boolean {
  const path = route.split("?")[0].toLowerCase();
  return WARM_FORBIDDEN_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(prefix)
  );
}

export function isWarmPathAllowed(route: string): boolean {
  const path = route.split("?")[0];
  return (WARM_ALLOWED_PATHS as readonly string[]).includes(path);
}

export function assertWarmRoutesAllowed(routes: string[]): {
  ok: boolean;
  forbidden: string[];
} {
  const forbidden = routes.filter((r) => !isWarmPathAllowed(r) || isWarmPathForbidden(r));
  return { ok: forbidden.length === 0, forbidden };
}
