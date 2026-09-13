import type { ImpactInputRow, ProductEnvironmentalImpact, VerificationStatus } from "./types";

function metricFromRow(row: ImpactInputRow | undefined): ProductEnvironmentalImpact["carbonFootprint"] {
  if (!row || row.value == null) return null;
  return {
    value: Number(row.value),
    unit: row.unit || null,
    status: (row.data_status as VerificationStatus) || "declared",
    methodology: row.methodology || null,
    calculatedAt: row.updated_at || null,
    source: row.notes || null,
  };
}

function worstStatus(rows: Array<{ status: VerificationStatus }>): VerificationStatus {
  const order: VerificationStatus[] = ["missing", "estimated", "declared", "verified", "not_applicable"];
  let worst: VerificationStatus = "verified";
  for (const r of rows) {
    if (order.indexOf(r.status) < order.indexOf(worst)) worst = r.status;
  }
  return worst;
}

function inferDurability(composition: string | null, category: string | null): ProductEnvironmentalImpact["durability"] {
  const c = (composition || "").toLowerCase();
  const cat = (category || "").toLowerCase();
  if (/100%\s*(wool|linen|cashmere|silk)/.test(c) || /coat|outerwear|tailoring/.test(cat)) {
    return { level: "high", basis: "Natural fiber composition and product category" };
  }
  if (/polyester|polyamide|acrylic/.test(c) && !/wool|linen|cotton/.test(c)) {
    return { level: "low", basis: "Synthetic-dominant composition" };
  }
  return { level: "medium", basis: "Mixed or undeclared durability signals" };
}

export function buildEnvironmentalImpact(input: {
  impactInputs: ImpactInputRow[];
  composition: string | null;
  category: string | null;
}): ProductEnvironmentalImpact {
  const byKey = new Map(input.impactInputs.map((r) => [r.metric_key, r]));

  const carbonFootprint = metricFromRow(byKey.get("carbon_footprint_kg_co2e"));
  const waterImpact = metricFromRow(byKey.get("water_impact_liters"));
  const biodiversityImpact = metricFromRow(byKey.get("biodiversity_impact"));
  const resourceUse = metricFromRow(byKey.get("resource_use"));

  const metrics = [carbonFootprint, waterImpact, biodiversityImpact, resourceUse].filter(Boolean) as Array<{
    status: VerificationStatus;
  }>;

  const primary = input.impactInputs.find((r) => r.methodology);
  const durabilityRow = byKey.get("durability_index");

  return {
    carbonFootprint,
    waterImpact,
    biodiversityImpact,
    resourceUse,
    durability: durabilityRow?.value
      ? {
          level: Number(durabilityRow.value) >= 0.7 ? "high" : Number(durabilityRow.value) >= 0.4 ? "medium" : "low",
          basis: durabilityRow.notes || "Declared durability index",
        }
      : inferDurability(input.composition, input.category),
    methodology: primary?.methodology || null,
    methodologyVersion: primary?.notes?.match(/v[\d.]+/)?.[0] || null,
    calculatedAt: primary?.updated_at || null,
    verificationStatus: metrics.length ? worstStatus(metrics) : "missing",
  };
}
