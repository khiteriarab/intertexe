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

export const ENTERPRISE_NAV_GROUPS = [
  {
    id: "core",
    label: "Core",
    icon: "core" as const,
    items: [
      { href: "", label: "Overview", icon: "overview" as const, exact: true as const },
      { href: "/products", label: "Products", icon: "products" as const },
      { href: "/issues", label: "Issues", icon: "issues" as const },
      { href: "/passports", label: "Passports", icon: "passports" as const },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: "operations" as const,
    items: [
      { href: "/workflows", label: "Workflows", icon: "workflows" as const },
      { href: "/suppliers", label: "Suppliers", icon: "suppliers" as const },
      { href: "/files", label: "Files", icon: "files" as const },
      { href: "/activity", label: "Activity", icon: "activity" as const },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    icon: "intelligence" as const,
    items: [
      { href: "/regulations", label: "Regulations", icon: "regulations" as const },
      { href: "/benchmarking", label: "Benchmarking", icon: "benchmarking" as const },
      { href: "/analytics", label: "Analytics", icon: "analytics" as const },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: "system" as const,
    items: [
      { href: "/integrations", label: "Integrations", icon: "integrations" as const },
      { href: "/developers", label: "Developers", icon: "developers" as const },
      { href: "/settings", label: "Settings", icon: "settings" as const },
    ],
  },
] as const;

export const ENTERPRISE_NAV = ENTERPRISE_NAV_GROUPS.flatMap((group) => group.items);

/** @deprecated use ENTERPRISE_NAV */
export const ENTERPRISE_PILOT_NAV = ENTERPRISE_NAV.slice(0, 5);

/** @deprecated roadmap modules are active; retained for tests referencing table names */
export const ENTERPRISE_LATER_NAV = ENTERPRISE_NAV.slice(5);

export function enterpriseNavForActor(_hq?: boolean) {
  return ENTERPRISE_NAV;
}

export type { ImplementationState } from "./page-states";
