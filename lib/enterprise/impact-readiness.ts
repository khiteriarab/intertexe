import type { SupabaseClient } from "@supabase/supabase-js";

export type ImpactDataStatus = "verified" | "declared" | "estimated" | "missing" | "not_applicable";
export type LcaReadinessLevel = "ready" | "partial" | "insufficient";

export const IMPACT_METRIC_KEYS = [
  { key: "ghg", label: "Carbon / GHG", unit: "kg CO₂e" },
  { key: "water", label: "Water", unit: "L" },
  { key: "energy", label: "Energy", unit: "kWh" },
  { key: "waste", label: "Waste", unit: "kg" },
  { key: "transport", label: "Transport", unit: "km·kg" },
] as const;

export type ImpactInputRow = {
  metricKey: string;
  metricLabel: string;
  value: number | null;
  unit: string | null;
  dataStatus: ImpactDataStatus;
  methodology: string | null;
  notes: string | null;
};

export type ImpactReadinessReport = {
  level: LcaReadinessLevel;
  summary: string;
  inputs: ImpactInputRow[];
  prerequisites: Array<{ label: string; met: boolean; detail: string }>;
  disclaimer: string;
};

type FieldRow = { field_key: string; normalized_value?: string | null; state?: string | null };

export function assessLcaReadiness(input: {
  fields: FieldRow[];
  traceabilityKnownTiers: number;
  evidenceVerifiedCount: number;
  impactInputs: ImpactInputRow[];
}): ImpactReadinessReport {
  const composition = input.fields.find((f) => f.field_key === "composition");
  const origin = input.fields.find(
    (f) => f.field_key === "manufacturing_country" || f.field_key === "country_of_origin"
  );
  const compositionComplete = Boolean(composition?.normalized_value);
  const originComplete = Boolean(origin?.normalized_value);
  const supplierData = input.traceabilityKnownTiers >= 1;
  const facilityData = input.traceabilityKnownTiers >= 2;
  const transportData = input.impactInputs.some(
    (m) => m.metricKey === "transport" && m.dataStatus !== "missing"
  );
  const certificationData = input.evidenceVerifiedCount > 0;

  const prerequisites = [
    {
      label: "Material composition complete",
      met: compositionComplete,
      detail: compositionComplete ? "Composition recorded" : "Missing composition",
    },
    {
      label: "Origin available",
      met: originComplete,
      detail: originComplete ? "Manufacturing country recorded" : "Missing origin",
    },
    {
      label: "Supplier / Tier 1 data",
      met: supplierData,
      detail: supplierData ? "At least Tier 1 known" : "No supplier traceability",
    },
    {
      label: "Facility / upstream tiers",
      met: facilityData,
      detail: facilityData ? "Tier 2+ recorded" : "Facility data not provided",
    },
    {
      label: "Transport data (if available)",
      met: transportData,
      detail: transportData ? "Transport input present" : "Not provided — optional",
    },
    {
      label: "Certification / evidence",
      met: certificationData,
      detail: certificationData ? "Verified evidence on file" : "No verified evidence",
    },
  ];

  const requiredMet = [compositionComplete, originComplete, supplierData].filter(Boolean).length;
  const optionalMet = [facilityData, transportData, certificationData].filter(Boolean).length;

  let level: LcaReadinessLevel = "insufficient";
  let summary = "Insufficient structured data for a future LCA or impact assessment.";
  if (requiredMet === 3 && optionalMet >= 2) {
    level = "ready";
    summary = "Core material, origin, and supplier data present. Optional transport/evidence strengthens readiness.";
  } else if (requiredMet >= 2) {
    level = "partial";
    summary = "Partial data available. Additional traceability and evidence needed before impact modelling.";
  }

  return {
    level,
    summary,
    inputs: input.impactInputs,
    prerequisites,
    disclaimer:
      "INTERTEXE does not perform certified LCAs. This readiness view only assesses whether structured inputs exist.",
  };
}

export async function loadProductImpactReadiness(
  client: SupabaseClient,
  organizationId: string,
  productId: string,
  traceabilityKnownTiers: number
): Promise<ImpactReadinessReport> {
  const [{ data: fields }, { data: impactRows }, { count: evidenceVerified }] = await Promise.all([
    client
      .from("normalized_fields")
      .select("field_key, normalized_value, state")
      .eq("organization_id", organizationId)
      .eq("product_id", productId),
    client
      .from("product_impact_inputs")
      .select("metric_key, metric_label, value, unit, data_status, methodology, notes")
      .eq("organization_id", organizationId)
      .eq("product_id", productId),
    client
      .from("evidence_records")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .eq("verification_status", "verified"),
  ]);

  const byKey = new Map((impactRows || []).map((r) => [r.metric_key, r]));
  const inputs: ImpactInputRow[] = IMPACT_METRIC_KEYS.map((def) => {
    const row = byKey.get(def.key);
    return {
      metricKey: def.key,
      metricLabel: row?.metric_label || def.label,
      value: row?.value != null ? Number(row.value) : null,
      unit: row?.unit || def.unit,
      dataStatus: (row?.data_status as ImpactDataStatus) || "missing",
      methodology: row?.methodology || null,
      notes: row?.notes || null,
    };
  });

  return assessLcaReadiness({
    fields: fields || [],
    traceabilityKnownTiers,
    evidenceVerifiedCount: evidenceVerified || 0,
    impactInputs: inputs,
  });
}

export async function loadCatalogImpactSummary(client: SupabaseClient, organizationId: string) {
  const { data: products } = await client
    .from("products")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("lifecycle", "active");

  const ids = (products || []).map((p) => p.id);
  if (!ids.length) {
    return { ready: 0, partial: 0, insufficient: 0, total: 0 };
  }

  let ready = 0;
  let partial = 0;
  let insufficient = 0;

  for (const productId of ids.slice(0, 100)) {
    const report = await loadProductImpactReadiness(client, organizationId, productId, 0);
    if (report.level === "ready") ready += 1;
    else if (report.level === "partial") partial += 1;
    else insufficient += 1;
  }

  const sampled = Math.min(ids.length, 100);
  const scale = ids.length / sampled;
  return {
    ready: Math.round(ready * scale),
    partial: Math.round(partial * scale),
    insufficient: Math.round(insufficient * scale),
    total: ids.length,
  };
}
