import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCatalogTraceabilitySummary } from "../enterprise/traceability";
import type { OrganizationSustainabilityAnalytics } from "./types";

/** Load sustainability analytics for an enterprise organization (obelisk). */
export async function loadOrganizationSustainabilityAnalytics(
  client: SupabaseClient,
  organizationId: string
): Promise<OrganizationSustainabilityAnalytics> {
  const [traceSummary, { data: products }, { data: impactRows }, { data: regulatoryRows }, { data: fields }] =
    await Promise.all([
      loadCatalogTraceabilitySummary(client, organizationId),
      client.from("products").select("id, category").eq("organization_id", organizationId).eq("lifecycle", "active"),
      client
        .from("product_impact_inputs")
        .select("product_id, metric_key, value, data_status")
        .eq("organization_id", organizationId),
      client
        .from("product_regulatory_scores")
        .select("product_id, total_points, verification_status")
        .eq("organization_id", organizationId),
      client
        .from("normalized_fields")
        .select("product_id, field_key, normalized_value")
        .eq("organization_id", organizationId)
        .in("field_key", ["composition", "care_instructions", "certifications"]),
    ]);

  const productIds = (products || []).map((p) => p.id);
  const count = productIds.length || 1;

  const carbonByProduct = new Map<string, number>();
  for (const row of impactRows || []) {
    if (row.metric_key === "carbon_footprint_kg_co2e" && row.value != null) {
      carbonByProduct.set(row.product_id, Number(row.value));
    }
  }

  const francePoints = (regulatoryRows || [])
    .map((r) => (r.total_points != null ? Number(r.total_points) : null))
    .filter((v): v is number => v != null);

  const naturalCount = (fields || []).filter((f) => {
    const v = String(f.normalized_value || "").toLowerCase();
    return /linen|wool|cashmere|silk|cotton/.test(v) && !/polyester|polyamide/.test(v);
  }).length;

  const repairableCount = (fields || []).filter((f) =>
    /care_instructions/.test(f.field_key) && /repair|rewear/i.test(String(f.normalized_value))
  ).length;

  const certifiedCount = (fields || []).filter((f) => /certification/i.test(f.field_key)).length;

  const avgCarbon =
    carbonByProduct.size > 0
      ? Math.round((Array.from(carbonByProduct.values()).reduce((a, b) => a + b, 0) / carbonByProduct.size) * 10) / 10
      : null;

  const avgFrance =
    francePoints.length > 0
      ? Math.round(francePoints.reduce((a, b) => a + b, 0) / francePoints.length)
      : null;

  return {
    productCount: traceSummary.productCount,
    fullyTraceablePct: traceSummary.completeChainPct,
    avgTraceabilityScore: traceSummary.avgCompletenessPct,
    avgEnvironmentalCostPoints: avgFrance,
    certifiedSupplyChainPct: Math.round((certifiedCount / count) * 100),
    repairablePct: Math.round((repairableCount / count) * 100),
    resaleEligiblePct: traceSummary.avgCompletenessPct >= 70 ? traceSummary.avgCompletenessPct : Math.round(traceSummary.tier1Pct * 0.9),
    supplyChainDisclosurePct: traceSummary.avgCompletenessPct,
    naturalMaterialsPct: Math.round((naturalCount / count) * 100),
    avgCarbonKg: avgCarbon,
  };
}

/** @deprecated Prefer loadOrganizationSustainabilityAnalytics */
export async function loadBrandSustainabilityAnalytics(
  client: SupabaseClient,
  organizationId: string
): Promise<OrganizationSustainabilityAnalytics> {
  return loadOrganizationSustainabilityAnalytics(client, organizationId);
}
