/** Enterprise workspace entry — platform.intertexe.com (not a separate brand). */

const DEFAULT_PLATFORM_ORIGIN = "https://platform.intertexe.com";

/** Public B2B sales page (always on the consumer site). */
export const PLATFORM_SALES_PATH = "/platform";

/**
 * Customer-facing enterprise origin.
 * Production default: https://platform.intertexe.com
 * Dev: set NEXT_PUBLIC_PLATFORM_APP_URL or use same-origin /dashboard/login internally.
 */
export function getEnterpriseLoginOrigin(): string {
  const env = process.env.NEXT_PUBLIC_PLATFORM_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "";
  return DEFAULT_PLATFORM_ORIGIN;
}

/**
 * Customer-facing Sign in URL. Never advertise /dashboard/login in production CTAs.
 * Internal rewrite to /dashboard/login on platform host is middleware-only.
 */
export function getEnterpriseLoginUrl(): string {
  const origin = getEnterpriseLoginOrigin();
  return origin ? `${origin}/` : "/dashboard/login";
}

/** Consumer site origin for cross-links from enterprise login. */
export function getConsumerSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return "https://www.intertexe.com";
}

/** Password reset redirect — stays on the requesting host (platform or www). */
export function buildDashboardPasswordResetRedirect(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/reset-password?next=${encodeURIComponent("/dashboard")}`;
}
