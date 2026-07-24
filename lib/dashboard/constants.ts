/** Client- and middleware-safe dashboard constants (no next/headers). */

export const HQ_SESSION_COOKIE = "dashboard_session";
export const HQ_WORKSPACE_COOKIE = "dashboard_workspace";
export const HQ_WORKSPACE_SLUG = "intertexe";

/** Founder bootstrap emails — first successful login provisions Founder role. */
export const HQ_FOUNDER_EMAILS = new Set([
  "info@intertexe.com",
  "hello@intertexe.com",
]);

export type HqRoleKey =
  | "founder"
  | "admin"
  | "marketing"
  | "partnerships"
  | "editorial"
  | "support"
  | "analyst"
  | "read_only";

export function isHqHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  return (
    h === "dashboard.intertexe.com" ||
    h === "hq.intertexe.com" ||
    h === "dashboard.localhost" ||
    h === "hq.localhost" ||
    h.endsWith(".dashboard.localhost")
  );
}

export const HQ_NAV = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/consumers", label: "Consumers" },
  { href: "/dashboard/scanner", label: "Scanner" },
  { href: "/dashboard/commerce", label: "Commerce" },
  { href: "/dashboard/materials", label: "Materials" },
  { href: "/dashboard/brands", label: "Brands" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/dpp", label: "Digital Product Passport" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/insights", label: "Insights" },
  { href: "/dashboard/ai", label: "AI" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;
