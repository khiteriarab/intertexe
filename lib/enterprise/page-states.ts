export type ImplementationState = "implemented" | "partial" | "placeholder";

export function implementationLabel(state: ImplementationState): string {
  if (state === "implemented") return "Production";
  if (state === "partial") return "Operational";
  return "Roadmap";
}

/** Map enterprise nav href suffix to page-state registry key. */
export function navHrefToStateKey(href: string): string {
  const trimmed = href.replace(/^\//, "").trim();
  if (!trimmed) return "overview";
  if (trimmed === "benchmarking") return "benchmarking";
  return trimmed.split("/")[0] || "overview";
}

export function pageStateForNavHref(href: string): ImplementationState {
  const key = navHrefToStateKey(href);
  return ORG_PAGE_STATES[key] ?? "partial";
}

/**
 * Implementation maturity per workspace module.
 * Sync with enterprise nav (`ENTERPRISE_NAV_GROUPS`) and marketing grid.
 */
export const ORG_PAGE_STATES: Record<string, ImplementationState> = {
  overview: "implemented",
  products: "implemented",
  issues: "implemented",
  passports: "implemented",
  workflows: "implemented",
  imports: "partial",
  approvals: "partial",
  suppliers: "partial",
  files: "partial",
  activity: "implemented",
  audit: "partial",
  regulations: "implemented",
  benchmarking: "partial",
  analytics: "implemented",
  integrations: "partial",
  developers: "partial",
  exports: "partial",
  settings: "partial",
};
