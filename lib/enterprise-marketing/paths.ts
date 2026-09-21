/**
 * Enterprise marketing public paths.
 * Canonical surface: /brands — /platform is a temporary legacy alias.
 */

export const MARKETING_BASE = "/brands";
export const MARKETING_LEGACY_BASE = "/platform";

/** Reserved extensionless paths under /brands (not static public/brands/* assets). */
export const MARKETING_RESERVED_SEGMENTS = [
  "solutions",
  "pricing",
  "demo",
  "see-it-live",
  "request",
  "success-stories",
  "product-intelligence",
  "traceability",
  "environmental-intelligence",
  "digital-product-passport",
  "supplier-data",
  "login",
] as const;

export type MarketingPath =
  | typeof MARKETING_BASE
  | `${typeof MARKETING_BASE}/${(typeof MARKETING_RESERVED_SEGMENTS)[number]}`
  | `${typeof MARKETING_BASE}/request?${string}`;

export function marketingPath(
  subpath: "" | (typeof MARKETING_RESERVED_SEGMENTS)[number] | `request?${string}` = "",
): string {
  if (!subpath) return MARKETING_BASE;
  if (subpath.startsWith("request?")) return `${MARKETING_BASE}/${subpath}`;
  return `${MARKETING_BASE}/${subpath}`;
}

export function marketingCanonical(subpath = ""): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com").replace(/\/$/, "");
  const path = marketingPath(subpath as "" | (typeof MARKETING_RESERVED_SEGMENTS)[number]);
  return `${site}${path}`;
}

/** Map a legacy /platform path to canonical /brands (for redirects). */
export function platformPathToBrands(pathname: string): string | null {
  if (pathname === "/platform" || pathname === "/platform/") return "/brands";
  if (pathname === "/platform/login" || pathname.startsWith("/platform/login?")) return null; // SaaS login host
  if (!pathname.startsWith("/platform/")) return null;
  const rest = pathname.slice("/platform/".length);
  if (rest === "see-it-live" || rest.startsWith("see-it-live?")) {
    return pathname.replace(/^\/platform\/see-it-live/, "/brands/demo");
  }
  return `/brands/${rest}`;
}
