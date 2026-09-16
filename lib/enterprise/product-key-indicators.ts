import type { ProductGovernanceScore } from "./governance-score";
import type { ProductTraceability } from "./traceability";

export type ProductKeyIndicator = {
  key: string;
  label: string;
  value: number;
  max: number;
  detail?: string;
};

function scoreToFive(score: number | null | undefined): number {
  if (typeof score !== "number" || Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(5, Math.round(score / 20)));
}

function traceabilityToFive(completenessPct: number): number {
  return Math.max(0, Math.min(5, Math.round(completenessPct / 20)));
}

export function buildProductKeyIndicators(
  governance: ProductGovernanceScore,
  traceability: ProductTraceability
): ProductKeyIndicator[] {
  const byKey = Object.fromEntries(governance.dimensions.map((d) => [d.key, d]));
  const traceDim = byKey.traceability;
  const passportDim = byKey.passport;
  const evidenceDim = byKey.evidence;
  const impactDim = byKey.impact;

  const traceabilityValue = traceabilityToFive(traceability.completenessPct);
  const complianceScore =
    passportDim?.score != null && evidenceDim?.score != null
      ? Math.round((passportDim.score + evidenceDim.score) / 2)
      : passportDim?.score ?? evidenceDim?.score ?? 0;
  const complianceValue = scoreToFive(complianceScore);
  const recyclabilityValue = scoreToFive(impactDim?.score ?? null);

  return [
    {
      key: "traceability",
      label: "Traceability",
      value: traceabilityValue,
      max: 5,
      detail: traceDim?.detail || `${traceability.knownTierCount}/4 tiers known`,
    },
    {
      key: "compliance",
      label: "Compliance",
      value: complianceValue,
      max: 5,
      detail: passportDim?.detail || "Passport & evidence readiness",
    },
    {
      key: "recyclability",
      label: "Recyclability",
      value: recyclabilityValue,
      max: 5,
      detail: impactDim?.detail || "Impact & circularity readiness",
    },
  ];
}


export function buildProductKeyIndicatorsSimple(input: {
  traceabilityPct: number;
  passportState: string | null;
  impactScore?: number | null;
}): ProductKeyIndicator[] {
  const traceabilityValue = traceabilityToFive(input.traceabilityPct);
  const passportScore =
    input.passportState === "published"
      ? 100
      : input.passportState === "ready"
        ? 85
        : input.passportState === "review_required"
          ? 60
          : 35;
  const complianceValue = scoreToFive(passportScore);
  const recyclabilityValue = scoreToFive(input.impactScore ?? 0);

  return [
    {
      key: "traceability",
      label: "Traceability",
      value: traceabilityValue,
      max: 5,
      detail: `${Math.round(input.traceabilityPct)}% supply chain completeness`,
    },
    {
      key: "compliance",
      label: "Compliance",
      value: complianceValue,
      max: 5,
      detail: "Passport & evidence readiness",
    },
    {
      key: "recyclability",
      label: "Recyclability",
      value: recyclabilityValue,
      max: 5,
      detail: "Impact & circularity readiness",
    },
  ];
}
