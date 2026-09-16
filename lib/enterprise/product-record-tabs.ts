export const PRODUCT_RECORD_TABS = [
  { id: "overview", label: "Overview" },
  { id: "traceability", label: "Traceability" },
  { id: "impact", label: "Impact" },
  { id: "compliance", label: "Compliance" },
  { id: "passport", label: "Passport" },
  { id: "circularity", label: "Circularity" },
] as const;

export type ProductRecordTab = (typeof PRODUCT_RECORD_TABS)[number]["id"];

const TAB_ALIASES: Record<string, ProductRecordTab> = {
  materials: "traceability",
  suppliers: "traceability",
  history: "compliance",
};

export function resolveProductRecordTab(value: string | null | undefined): ProductRecordTab {
  const raw = String(value || "overview").toLowerCase();
  if (TAB_ALIASES[raw]) return TAB_ALIASES[raw];
  if (PRODUCT_RECORD_TABS.some((tab) => tab.id === raw)) return raw as ProductRecordTab;
  return "overview";
}
