export type ImplementationState = "implemented" | "partial" | "placeholder";

export function implementationLabel(state: ImplementationState): string {
  if (state === "implemented") return "Implemented";
  if (state === "partial") return "Partial";
  return "Placeholder";
}

export const ORG_PAGE_STATES: Record<string, ImplementationState> = {
  overview: "implemented",
  products: "implemented",
  issues: "implemented",
  passports: "implemented",
  suppliers: "placeholder",
  regulations: "placeholder",
  benchmarking: "partial",
  workflows: "partial",
  analytics: "placeholder",
  integrations: "partial",
  developers: "placeholder",
  files: "placeholder",
  activity: "placeholder",
  settings: "partial",
};
