import type { ImpactReadinessReport } from "./impact-readiness";
import type { ProductTraceability } from "./traceability";

export type ImpactLifecycleStage =
  | "raw_material"
  | "processing"
  | "manufacturing"
  | "transport"
  | "distribution"
  | "use_phase"
  | "end_of_life";

export type ImpactLifecycleSegment = {
  stage: ImpactLifecycleStage;
  label: string;
  sharePct: number;
  color: string;
};

export type ProductImpactScores = {
  pefSingleScore: number;
  pefUnit: string;
  frenchEnvironmentalCost: number;
  frenchUnit: string;
  frenchPer100g: number | null;
  climateKgCo2e: number;
  climateUnit: string;
  methodology: string;
  confidence: "high" | "medium" | "low";
  confidenceNote: string;
  segments: ImpactLifecycleSegment[];
  largestDriver: ImpactLifecycleSegment;
  secondDriver: ImpactLifecycleSegment | null;
  insights: string[];
  recommendations: string[];
};

export type ImpactSimulationInputs = {
  materialComposition: "current" | "lower_impact_fiber" | "recycled_blend";
  supplier: "current" | "verified_nearshore" | "unverified";
  manufacturingLocation: "current" | "eu" | "asia";
  transport: "current" | "sea" | "air" | "rail";
  packaging: "current" | "reduced" | "recycled";
};

const STAGE_META: Array<{
  stage: ImpactLifecycleStage;
  label: string;
  color: string;
  base: number;
}> = [
  { stage: "raw_material", label: "Raw material", color: "#3d4f3a", base: 38 },
  { stage: "processing", label: "Processing", color: "#7a8f72", base: 12 },
  { stage: "manufacturing", label: "Manufacturing", color: "#8fa891", base: 22 },
  { stage: "transport", label: "Transport", color: "#9aa7b2", base: 8 },
  { stage: "distribution", label: "Distribution", color: "#6f8496", base: 7 },
  { stage: "use_phase", label: "Use phase", color: "#c4b49a", base: 8 },
  { stage: "end_of_life", label: "End of life", color: "#b08968", base: 5 },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeShares(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0) || 1;
  const raw = values.map((v) => (v / sum) * 100);
  const rounded = raw.map((v) => Math.round(v));
  const drift = 100 - rounded.reduce((a, b) => a + b, 0);
  if (rounded.length) rounded[0] += drift;
  return rounded;
}

function ghgFromInputs(report: ImpactReadinessReport | null): number | null {
  const row = report?.inputs.find((i) => i.metricKey === "ghg");
  if (row?.value != null && row.value > 0) return row.value;
  return null;
}

function baseClimate(report: ImpactReadinessReport | null, completenessPct: number): number {
  const fromInput = ghgFromInputs(report);
  if (fromInput != null) return fromInput;
  // Editorial estimate when no LCA input yet — scales with completeness gap.
  return Number((4.2 - completenessPct / 80).toFixed(1));
}

function buildSegments(weights: number[]): ImpactLifecycleSegment[] {
  const shares = normalizeShares(weights);
  return STAGE_META.map((meta, i) => ({
    stage: meta.stage,
    label: meta.label,
    sharePct: shares[i] ?? 0,
    color: meta.color,
  }));
}

function sortByShare(segments: ImpactLifecycleSegment[]) {
  return [...segments].sort((a, b) => b.sharePct - a.sharePct);
}

export function buildProductImpactScores(input: {
  productName?: string | null;
  weightGrams?: number | null;
  traceability: ProductTraceability;
  impactReadiness: ImpactReadinessReport | null;
  composition?: string | null;
}): ProductImpactScores {
  const completeness = input.traceability.completenessPct;
  const known = input.traceability.knownTierCount;
  const climate = baseClimate(input.impactReadiness, completeness);
  const readinessBoost = input.impactReadiness?.level === "ready" ? 0.92 : input.impactReadiness?.level === "partial" ? 1 : 1.12;

  const weights = STAGE_META.map((meta) => {
    let w = meta.base;
    if (meta.stage === "raw_material" && !input.composition) w += 6;
    if (meta.stage === "manufacturing" && known < 1) w += 4;
    if (meta.stage === "processing" && known < 3) w += 5;
    if (meta.stage === "transport" && known < 2) w += 3;
    return w;
  });

  const segments = buildSegments(weights);
  const ranked = sortByShare(segments);
  const largestDriver = ranked[0];
  const secondDriver = ranked[1] || null;

  const pefSingleScore = Math.round(climate * 2100 * readinessBoost);
  const frenchEnvironmentalCost = Math.round(climate * 780 * readinessBoost);
  const frenchPer100g =
    input.weightGrams && input.weightGrams > 0
      ? Math.round((frenchEnvironmentalCost / input.weightGrams) * 100)
      : null;

  const confidence: ProductImpactScores["confidence"] =
    completeness >= 75 && input.impactReadiness?.level === "ready"
      ? "high"
      : completeness >= 40
        ? "medium"
        : "low";

  const insights = [
    `${largestDriver.label} is the largest contributor to this product’s impact (${largestDriver.sharePct}%).`,
    secondDriver
      ? `${secondDriver.label} is the second-largest contributor (${secondDriver.sharePct}%).`
      : "Additional lifecycle stages contribute the remainder of the score.",
  ];

  if (completeness < 75) {
    insights.push("Missing supplier evidence may reduce confidence in the score.");
  }

  const recommendations: string[] = [];
  if (largestDriver.stage === "raw_material") {
    recommendations.push("Switching fiber composition or supplier inputs could improve the score.");
  }
  if (largestDriver.stage === "manufacturing" || known < 2) {
    recommendations.push("Verify manufacturing location and facility evidence to improve modelling confidence.");
  }
  if (completeness < 50) {
    recommendations.push("Complete upstream tiers (2–4) so impact drivers reflect the real supply chain.");
  }
  if (!recommendations.length) {
    recommendations.push("Simulate fiber, supplier, or transport changes to explore lower-impact pathways.");
  }

  return {
    pefSingleScore,
    pefUnit: "Pts",
    frenchEnvironmentalCost,
    frenchUnit: "points d'impact",
    frenchPer100g,
    climateKgCo2e: Number(climate.toFixed(1)),
    climateUnit: "kgCO₂e",
    methodology: "PEFCR methodology",
    confidence,
    confidenceNote:
      confidence === "high"
        ? "Based on governed product fields and verified impact inputs."
        : confidence === "medium"
          ? "Partial traceability — scores are directional until upstream evidence is complete."
          : "Limited chain data — treat scores as provisional estimates.",
    segments,
    largestDriver,
    secondDriver,
    insights,
    recommendations,
  };
}

export const DEFAULT_SIMULATION_INPUTS: ImpactSimulationInputs = {
  materialComposition: "current",
  supplier: "current",
  manufacturingLocation: "current",
  transport: "current",
  packaging: "current",
};

/** Apply simulation deltas to a baseline score set (client-side what-if). */
export function simulateProductImpactScores(
  baseline: ProductImpactScores,
  sim: ImpactSimulationInputs
): ProductImpactScores {
  let climateFactor = 1;
  let pefFactor = 1;
  let frenchFactor = 1;
  const weightAdjust = [...baseline.segments.map((s) => s.sharePct)];

  const stageIndex = (stage: ImpactLifecycleStage) =>
    STAGE_META.findIndex((m) => m.stage === stage);

  if (sim.materialComposition === "lower_impact_fiber") {
    climateFactor *= 0.82;
    pefFactor *= 0.84;
    frenchFactor *= 0.83;
    weightAdjust[stageIndex("raw_material")] *= 0.7;
  } else if (sim.materialComposition === "recycled_blend") {
    climateFactor *= 0.74;
    pefFactor *= 0.76;
    frenchFactor *= 0.75;
    weightAdjust[stageIndex("raw_material")] *= 0.55;
  }

  if (sim.supplier === "verified_nearshore") {
    climateFactor *= 0.94;
    weightAdjust[stageIndex("transport")] *= 0.7;
    weightAdjust[stageIndex("manufacturing")] *= 0.95;
  } else if (sim.supplier === "unverified") {
    climateFactor *= 1.08;
    pefFactor *= 1.06;
  }

  if (sim.manufacturingLocation === "eu") {
    climateFactor *= 0.93;
    weightAdjust[stageIndex("manufacturing")] *= 0.9;
    weightAdjust[stageIndex("transport")] *= 0.85;
  } else if (sim.manufacturingLocation === "asia") {
    climateFactor *= 1.05;
    weightAdjust[stageIndex("transport")] *= 1.25;
  }

  if (sim.transport === "sea") {
    climateFactor *= 0.96;
    weightAdjust[stageIndex("transport")] *= 0.8;
  } else if (sim.transport === "air") {
    climateFactor *= 1.22;
    weightAdjust[stageIndex("transport")] *= 2.1;
  } else if (sim.transport === "rail") {
    climateFactor *= 0.97;
    weightAdjust[stageIndex("transport")] *= 0.85;
  }

  if (sim.packaging === "reduced") {
    climateFactor *= 0.98;
    frenchFactor *= 0.97;
    weightAdjust[stageIndex("distribution")] *= 0.85;
  } else if (sim.packaging === "recycled") {
    climateFactor *= 0.97;
    frenchFactor *= 0.96;
    weightAdjust[stageIndex("end_of_life")] *= 0.8;
  }

  const segments = buildSegments(weightAdjust);
  const ranked = sortByShare(segments);
  const climateKgCo2e = Number((baseline.climateKgCo2e * climateFactor).toFixed(1));
  const pefSingleScore = Math.round(baseline.pefSingleScore * pefFactor);
  const frenchEnvironmentalCost = Math.round(baseline.frenchEnvironmentalCost * frenchFactor);
  const frenchPer100g =
    baseline.frenchPer100g != null
      ? Math.round(baseline.frenchPer100g * frenchFactor)
      : null;

  const deltaPct = Math.round((1 - climateFactor) * 100);
  const insights = [
    deltaPct > 0
      ? `This simulation lowers climate impact by about ${deltaPct}% vs the current record.`
      : deltaPct < 0
        ? `This simulation raises climate impact by about ${Math.abs(deltaPct)}% vs the current record.`
        : "This simulation leaves climate impact roughly unchanged.",
    `${ranked[0].label} remains the largest driver (${ranked[0].sharePct}%).`,
  ];

  return {
    ...baseline,
    pefSingleScore,
    frenchEnvironmentalCost,
    frenchPer100g,
    climateKgCo2e,
    segments,
    largestDriver: ranked[0],
    secondDriver: ranked[1] || null,
    insights,
    recommendations: [
      "Compare simulated PEF and French Environmental Cost against the current product record.",
      "Promote verified supplier and material changes into the governed record when ready.",
    ],
    confidenceNote: "Simulation only — does not change the governed product record.",
  };
}
