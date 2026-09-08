import { ENTERPRISE_NAV_GROUPS } from "./constants";
import { ORG_PAGE_STATES, pageStateForNavHref, type ImplementationState } from "./page-states";

export type EnterpriseModuleCatalogEntry = {
  /** Nav path suffix (`""` = overview). */
  href: string;
  label: string;
  groupId: string;
  groupLabel: string;
  state: ImplementationState;
  description: string;
  icon: string;
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  Overview: "Catalog snapshot, readiness KPIs, and module entry",
  Products: "Import, normalize, and approve product records",
  Issues: "Blocking findings, conflicts, and missing data inbox",
  Passports: "Publish and version Digital Product Passports",
  Workflows: "Stage owners, due dates, and team coordination",
  "Import center": "CSV history, row errors, and import replay",
  Approvals: "Field and publish approval requests",
  Suppliers: "Evidence requests and supplier partners",
  Files: "Imports, source records, and uploaded assets",
  Activity: "Audit trail across the organization",
  "Audit log": "Immutable admin and security events",
  Regulations: "Rulesets, readiness gaps, and requirement domains",
  "Signals & benchmarks": "Fiber mix, peer comparison, consumer signals",
  Analytics: "Readiness trends and catalog health",
  Integrations: "CSV import, API credentials, registry connections",
  Developers: "API keys, webhooks, and resolver documentation",
  Exports: "Catalog and passport export jobs",
  Settings: "Team, entitlements, and organization admin",
};

/** Canonical module list — mirrors enterprise sidebar nav + maturity state. */
export function enterpriseModuleCatalog(): EnterpriseModuleCatalogEntry[] {
  return ENTERPRISE_NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => {
      const href = item.href || "";
      return {
        href,
        label: item.label,
        groupId: group.id,
        groupLabel: group.label,
        state: pageStateForNavHref(href),
        description: MODULE_DESCRIPTIONS[item.label] || "Workspace module",
        icon: item.icon,
      };
    })
  );
}

export function enterpriseModuleCatalogByGroup(): Array<{
  id: string;
  label: string;
  modules: EnterpriseModuleCatalogEntry[];
}> {
  const groups = new Map<string, EnterpriseModuleCatalogEntry[]>();
  for (const mod of enterpriseModuleCatalog()) {
    const list = groups.get(mod.groupLabel) || [];
    list.push(mod);
    groups.set(mod.groupLabel, list);
  }
  return ENTERPRISE_NAV_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    modules: groups.get(group.label) || [],
  }));
}

export function implementationSummary(): Record<ImplementationState, number> {
  const summary: Record<ImplementationState, number> = {
    implemented: 0,
    partial: 0,
    placeholder: 0,
  };
  for (const mod of enterpriseModuleCatalog()) {
    summary[mod.state] += 1;
  }
  return summary;
}

/** Marketing-safe maturity note for public /platform copy. */
export function marketingMaturityFootnote(): string {
  const { implemented, partial, placeholder } = implementationSummary();
  const parts = [`${implemented} production-ready`];
  if (partial > 0) parts.push(`${partial} operational (expanding)`);
  if (placeholder > 0) parts.push(`${placeholder} on roadmap`);
  return parts.join(" · ");
}

export { ORG_PAGE_STATES };
