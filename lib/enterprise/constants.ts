import { HQ_NAV } from "../dashboard/constants";

export const ENTERPRISE_SESSION_COOKIE = "enterprise_session";
export const ENTERPRISE_ORG_COOKIE = "enterprise_organization";
export const CUSTOMER_ZERO_SLUG = "intertexe";
export const DEMO_BRAND_SLUG = "intertexe-demo";

/** Staff handoff JWTs are app-expired after this many seconds even if GoTrue's access token is longer. */
export const ENTERPRISE_HANDOFF_TTL_SECONDS = 15 * 60;

export function technicalPrincipalEmail(hqUserId: string): string {
  const compact = hqUserId.replace(/-/g, "").toLowerCase();
  return `itx-principal.${compact}@identity.intertexe.com`;
}

export const HQ_RESERVED_SLUGS = new Set([
  "login",
  "command-center",
  "email",
  "acquisition",
  "scanner",
  "commerce",
  "operations",
  "consumers",
  "materials",
  "brands",
  "products",
  "dpp",
  "campaigns",
  "content",
  "insights",
  "ai",
  "settings",
  "partnerships",
  "customers",
  "data-sources",
  "engagement",
  "w",
  "org",
  "supplier",
  "founder",
  "enterprise",
  ...HQ_NAV.map((item) => item.href.replace(/^\/dashboard\/?/, "").split("/")[0]).filter(Boolean),
]);

/** Coarse path check used by middleware. JWT/membership still enforced in the org layout. */
export function dashboardPathRequiresEnterpriseSession(pathname: string): boolean {
  const path = pathname.split("?")[0];
  if (path === "/dashboard/supplier" || path.startsWith("/dashboard/supplier/")) return true;
  if (!path.startsWith("/dashboard/")) return false;
  const segment = path.slice("/dashboard/".length).split("/")[0] || "";
  return Boolean(segment) && isValidOrgSlug(segment);
}

export function isReservedHqSlug(slug: string): boolean {
  return HQ_RESERVED_SLUGS.has(slug.trim().toLowerCase());
}

export function isValidOrgSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,62}$/.test(slug) && !isReservedHqSlug(slug);
}

export const ENTERPRISE_PILOT_NAV = [
  { href: "", label: "Overview", exact: true, later: false },
  { href: "/products", label: "Products", later: false },
  { href: "/issues", label: "Issues", later: false },
  { href: "/passports", label: "Passports", later: false },
  { href: "/settings", label: "Settings", later: false },
] as const;

export const ENTERPRISE_LATER_NAV = [
  { href: "/suppliers", label: "Suppliers", later: true },
  { href: "/regulations", label: "Regulations", later: true },
  { href: "/benchmarking", label: "Benchmarking", later: true },
  { href: "/analytics", label: "Analytics", later: true },
  { href: "/integrations", label: "Integrations", later: true },
  { href: "/developers", label: "Developers", later: true },
  { href: "/files", label: "Files", later: true },
  { href: "/activity", label: "Activity", later: true },
] as const;

export const ENTERPRISE_NAV = [...ENTERPRISE_PILOT_NAV, ...ENTERPRISE_LATER_NAV];

export function enterpriseNavForActor(hq: boolean) {
  return hq ? ENTERPRISE_NAV : ENTERPRISE_PILOT_NAV;
}

export type { ImplementationState } from "./page-states";
