import { HQ_NAV } from "../dashboard/constants";

export const ENTERPRISE_SESSION_COOKIE = "enterprise_session";
export const ENTERPRISE_ORG_COOKIE = "enterprise_organization";
export const CUSTOMER_ZERO_SLUG = "intertexe";
export const DEMO_BRAND_SLUG = "intertexe-demo";

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
  ...HQ_NAV.map((item) => item.href.replace(/^\/dashboard\/?/, "").split("/")[0]).filter(Boolean),
]);

export function isReservedHqSlug(slug: string): boolean {
  return HQ_RESERVED_SLUGS.has(slug.trim().toLowerCase());
}

export function isValidOrgSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,62}$/.test(slug) && !isReservedHqSlug(slug);
}

export const ENTERPRISE_NAV = [
  { href: "", label: "Overview", exact: true },
  { href: "/products", label: "Products" },
  { href: "/issues", label: "Issues" },
  { href: "/passports", label: "Passports" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/regulations", label: "Regulations" },
  { href: "/benchmarking", label: "Benchmarking" },
  { href: "/analytics", label: "Analytics" },
  { href: "/integrations", label: "Integrations" },
  { href: "/developers", label: "Developers" },
  { href: "/files", label: "Files" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings" },
] as const;

export type { ImplementationState } from "./page-states";
