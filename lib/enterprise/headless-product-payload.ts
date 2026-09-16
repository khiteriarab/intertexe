import type { ProductImpactRecord, ProductTraceabilityScore } from "../sustainability/types";

export type HeadlessProductPayload = {
  id: string;
  name: string;
  sku: string | null;
  styleCode: string | null;
  category: string | null;
  passportState: string | null;
  environmentalImpact: ProductImpactRecord["environmentalImpact"] | null;
  impactAssessments: ProductImpactRecord["impactAssessments"];
  sustainabilityScores: ProductImpactRecord["sustainabilityScores"];
  traceabilityScore: ProductTraceabilityScore | null;
};

export function buildHeadlessProductPayload(input: {
  product: {
    id: string;
    name: string;
    sku?: string | null;
    style_code?: string | null;
    category?: string | null;
    passport_state?: string | null;
  };
  impact: ProductImpactRecord | null;
  traceabilityScore: ProductTraceabilityScore | null;
}): HeadlessProductPayload {
  return {
    id: input.product.id,
    name: input.product.name,
    sku: input.product.sku ?? null,
    styleCode: input.product.style_code ?? null,
    category: input.product.category ?? null,
    passportState: input.product.passport_state ?? null,
    environmentalImpact: input.impact?.environmentalImpact ?? null,
    impactAssessments: input.impact?.impactAssessments ?? [],
    sustainabilityScores: input.impact?.sustainabilityScores ?? [],
    traceabilityScore: input.traceabilityScore,
  };
}
