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

/** Enterprise SaaS entry — login + existing /dashboard app. */
export function isPlatformHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  return (
    h === "platform.intertexe.com" ||
    h === "platform.localhost" ||
    h.endsWith(".platform.localhost")
  );
}

/** Company operating system — business metrics only. */
export const HQ_NAV = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/revenue", label: "Revenue" },
  { href: "/dashboard/members", label: "Users" },
  { href: "/dashboard/acquisition", label: "Acquisition" },
  { href: "/dashboard/affiliate", label: "Affiliate" },
  { href: "/dashboard/b2b", label: "B2B" },
  { href: "/dashboard/pilots", label: "Pilots" },
  { href: "/dashboard/partnerships", label: "Partnerships" },
  { href: "/dashboard/product", label: "Product / Data" },
  { href: "/dashboard/press", label: "Press" },
  { href: "/dashboard/speaking", label: "Speaking" },
  { href: "/dashboard/goals", label: "Goals" },
  { href: "/dashboard/weekly-review", label: "Weekly Review" },
] as const;

/** Secondary ops — not north-star navigation. */
export const HQ_NAV_SECONDARY = [
  { href: "/dashboard/email", label: "Email Ops" },
  { href: "/dashboard/consumers", label: "Consumers" },
  { href: "/dashboard/catalog", label: "Catalog" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/command-center", label: "Founder Personal", founderOnly: true },
  { href: "/dashboard/enterprise", label: "Enterprise Admin", founderOnly: true },
] as const;
