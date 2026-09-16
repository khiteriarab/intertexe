export const PRODUCT_LIFECYCLE_STEPS = [
  { id: "create", label: "Create" },
  { id: "prove", label: "Prove" },
  { id: "market", label: "Market" },
  { id: "own", label: "Own" },
  { id: "next_life", label: "Next life" },
] as const;

export type ProductLifecycleStepId = (typeof PRODUCT_LIFECYCLE_STEPS)[number]["id"];

export type ProductLifecycleStepStatus = "complete" | "current" | "pending";

export type ProductLifecycleState = {
  currentId: ProductLifecycleStepId;
  steps: Array<{
    id: ProductLifecycleStepId;
    label: string;
    status: ProductLifecycleStepStatus;
  }>;
};

function stepIndex(id: ProductLifecycleStepId): number {
  return PRODUCT_LIFECYCLE_STEPS.findIndex((step) => step.id === id);
}

export function resolveProductLifecycleStep(input: {
  passportState?: string | null;
  hasIdentity?: boolean;
  hasComposition?: boolean;
  traceabilityPct?: number;
  isPublished?: boolean;
  resaleEligible?: boolean;
}): ProductLifecycleStepId {
  if (input.resaleEligible || input.passportState === "update_required") return "next_life";
  if (input.isPublished || input.passportState === "published") return "own";
  if (input.passportState === "ready") return "market";
  if ((input.traceabilityPct || 0) >= 40 || input.passportState === "review_required") return "prove";
  if (input.hasIdentity || input.hasComposition) return "create";
  return "create";
}

export function buildProductLifecycleState(input: {
  passportState?: string | null;
  hasIdentity?: boolean;
  hasComposition?: boolean;
  traceabilityPct?: number;
  isPublished?: boolean;
  resaleEligible?: boolean;
}): ProductLifecycleState {
  const currentId = resolveProductLifecycleStep(input);
  const currentIndex = stepIndex(currentId);
  return {
    currentId,
    steps: PRODUCT_LIFECYCLE_STEPS.map((step, index) => ({
      id: step.id,
      label: step.label,
      status: index < currentIndex ? "complete" : index === currentIndex ? "current" : "pending",
    })),
  };
}
