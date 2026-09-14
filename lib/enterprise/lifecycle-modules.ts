export type LifecycleModuleEntry = {
  id: string;
  label: string;
  groupId: string;
  groupLabel: string;
  description: string;
  previewSlug: string;
};

/** Public platform lifecycle — customer outcomes, not internal SaaS nav. */
export const LIFECYCLE_GROUP_TAGLINES: Record<string, string> = {
  create: "From conception to production",
  prove: "Traceability & compliance",
  understand: "Intelligence that drives decisions",
  extend: "From ownership to next life",
};

export const LIFECYCLE_RAIL = [
  "Conception",
  "Production",
  "Market",
  "Ownership",
  "Resale",
  "Next life",
] as const;

const MODULES: LifecycleModuleEntry[] = [
  {
    id: "product-creation",
    label: "Product creation",
    groupId: "create",
    groupLabel: "Create",
    description: "Materials, composition, specifications and product identity",
    previewSlug: "products",
  },
  {
    id: "supply-chain",
    label: "Supply chain",
    groupId: "create",
    groupLabel: "Create",
    description: "Suppliers, factories, processing and sourcing",
    previewSlug: "supply-chain",
  },
  {
    id: "evidence",
    label: "Evidence",
    groupId: "create",
    groupLabel: "Create",
    description: "Certifications, documents and manufacturing proof",
    previewSlug: "evidence",
  },
  {
    id: "governed-record",
    label: "Governed record",
    groupId: "create",
    groupLabel: "Create",
    description: "One trusted product record from every source",
    previewSlug: "record",
  },
  {
    id: "traceability",
    label: "Traceability",
    groupId: "prove",
    groupLabel: "Prove",
    description: "Follow materials and manufacturing from source to finished product",
    previewSlug: "traceability",
  },
  {
    id: "environmental-impact",
    label: "Environmental impact",
    groupId: "prove",
    groupLabel: "Prove",
    description: "Carbon, environmental cost and sustainability metrics",
    previewSlug: "impact",
  },
  {
    id: "compliance",
    label: "Compliance",
    groupId: "prove",
    groupLabel: "Prove",
    description: "DPP-ready structured data and regulatory requirements",
    previewSlug: "compliance",
  },
  {
    id: "verification",
    label: "Verification",
    groupId: "prove",
    groupLabel: "Prove",
    description: "Identify missing evidence, conflicts and unsupported claims",
    previewSlug: "verification",
  },
  {
    id: "material-benchmark",
    label: "Material Benchmark",
    groupId: "understand",
    groupLabel: "Understand",
    description: "Compare fiber strategy against peer brands",
    previewSlug: "benchmark",
  },
  {
    id: "catalog-intelligence",
    label: "Catalog intelligence",
    groupId: "understand",
    groupLabel: "Understand",
    description: "Understand material mix, completeness and readiness",
    previewSlug: "catalog",
  },
  {
    id: "consumer-signals",
    label: "Consumer signals",
    groupId: "understand",
    groupLabel: "Understand",
    description: "See which material cohorts are gaining or losing demand",
    previewSlug: "signals",
  },
  {
    id: "impact-insights",
    label: "Impact insights",
    groupId: "understand",
    groupLabel: "Understand",
    description: "Understand where products outperform and where improvement is needed",
    previewSlug: "insights",
  },
  {
    id: "digital-product-passport",
    label: "Digital Product Passport",
    groupId: "extend",
    groupLabel: "Extend",
    description: "Carry the verified product record to the consumer",
    previewSlug: "passport",
  },
  {
    id: "care-repair",
    label: "Care & repair",
    groupId: "extend",
    groupLabel: "Extend",
    description: "Give owners guidance that extends product life",
    previewSlug: "care",
  },
  {
    id: "resale-value",
    label: "Resale value",
    groupId: "extend",
    groupLabel: "Extend",
    description: "Estimate residual value and identify the best resale route",
    previewSlug: "resale-value",
  },
  {
    id: "resale-transfer",
    label: "Resale & ownership transfer",
    groupId: "extend",
    groupLabel: "Extend",
    description: "Create verified listings and carry the passport to the next owner",
    previewSlug: "transfer",
  },
  {
    id: "circularity",
    label: "Circularity",
    groupId: "extend",
    groupLabel: "Extend",
    description: "Repair, resale, donation, recycling and eventual end-of-life",
    previewSlug: "circularity",
  },
];

const GROUP_ORDER = [
  { id: "create", label: "Create" },
  { id: "prove", label: "Prove" },
  { id: "understand", label: "Understand" },
  { id: "extend", label: "Extend" },
] as const;

export function lifecycleModuleCatalogByGroup(): Array<{
  id: string;
  label: string;
  tagline: string;
  modules: LifecycleModuleEntry[];
}> {
  return GROUP_ORDER.map((group) => ({
    id: group.id,
    label: group.label,
    tagline: LIFECYCLE_GROUP_TAGLINES[group.id] || "",
    modules: MODULES.filter((mod) => mod.groupId === group.id),
  }));
}
