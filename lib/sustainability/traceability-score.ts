import type { ProductTraceabilityScore, TraceabilityStage, VerificationStatus } from "./types";

type TraceNode = {
  tier: number;
  tier_label?: string | null;
  facility_name?: string | null;
  country_code?: string | null;
  data_status?: string | null;
};

const STAGE_DEFS: Array<{ id: string; label: string; tier?: number; fieldKeys?: string[] }> = [
  { id: "raw_material", label: "Raw material origin", tier: 4 },
  { id: "fiber_producer", label: "Fiber producer identified", tier: 4 },
  { id: "spinner", label: "Spinner identified", tier: 3 },
  { id: "weaver", label: "Weaver / mill identified", tier: 2 },
  { id: "dye_house", label: "Dye house identified", tier: 3 },
  { id: "garment_factory", label: "Garment factory identified", tier: 1 },
  { id: "transportation", label: "Transportation data", fieldKeys: ["distribution", "transport"] },
  { id: "certificates", label: "Certificates verified", fieldKeys: ["certification", "certifications"] },
  { id: "energy_source", label: "Energy source", fieldKeys: ["energy_source", "renewable_energy"] },
];

function nodeKnown(node: TraceNode | undefined): boolean {
  if (!node) return false;
  if (node.data_status === "missing" || node.data_status === "unknown") return false;
  return Boolean(node.facility_name || node.country_code);
}

function fieldPresent(fields: Map<string, string>, keys: string[]): TraceabilityStage["status"] {
  const hit = keys.some((k) => fields.has(k) && fields.get(k));
  return hit ? "verified" : "missing";
}

export function buildTraceabilityScore(input: {
  traceNodes: TraceNode[];
  publicFields?: Array<{ key: string; value: string }>;
  certificateCount?: number;
  evidenceCount?: number;
  lastVerifiedAt?: string | null;
}): ProductTraceabilityScore {
  const byTier = new Map(input.traceNodes.map((n) => [n.tier, n]));
  const fieldMap = new Map((input.publicFields || []).map((f) => [f.key, f.value]));

  const verifiedStages: TraceabilityStage[] = [];
  const unverifiedStages: TraceabilityStage[] = [];

  for (const def of STAGE_DEFS) {
    let status: TraceabilityStage["status"] = "missing";
    let detail: string | null = null;

    if (def.tier != null) {
      const node = byTier.get(def.tier);
      if (nodeKnown(node)) {
        status = "verified";
        detail = [node?.facility_name, node?.country_code].filter(Boolean).join(" · ") || null;
      } else if (node && node.data_status === "unknown") {
        status = "partial";
      }
    } else if (def.fieldKeys) {
      status = fieldPresent(fieldMap, def.fieldKeys);
    }

    const stage: TraceabilityStage = { id: def.id, label: def.label, status, detail };
    if (status === "verified") verifiedStages.push(stage);
    else unverifiedStages.push(stage);
  }

  const scored = STAGE_DEFS.length;
  const verifiedCount = verifiedStages.length + unverifiedStages.filter((s) => s.status === "partial").length * 0.5;
  const score = Math.round((verifiedCount / scored) * 100);
  const completionPercentage = score;

  const facilities = input.traceNodes
    .filter((n) => n.facility_name || n.country_code)
    .map((n) => ({
      name: n.facility_name || null,
      country: n.country_code || null,
      tier: n.tier,
    }));

  const countries = Array.from(
    new Set(input.traceNodes.map((n) => n.country_code).filter(Boolean) as string[])
  );

  const supplyChainRecordCount = input.traceNodes.filter((n) => nodeKnown(n)).length;
  const certificateCount = input.certificateCount ?? (fieldMap.has("certifications") ? 1 : 0);
  const evidenceCount = input.evidenceCount ?? supplyChainRecordCount;

  let verificationStatus: VerificationStatus = "missing";
  if (score >= 80) verificationStatus = "verified";
  else if (score >= 50) verificationStatus = "declared";
  else if (score > 0) verificationStatus = "estimated";

  return {
    completionPercentage,
    score,
    verifiedStages,
    unverifiedStages,
    facilities,
    countries,
    certificateCount,
    supplyChainRecordCount,
    evidenceCount,
    verificationStatus,
    lastVerifiedAt: input.lastVerifiedAt || null,
    methodology: "intertexe_traceability_v1",
  };
}
