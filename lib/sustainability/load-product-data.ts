import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImpactInputRow, RegulatoryScoreRow } from "./types";

async function loadRegulatoryScores(client: SupabaseClient, organizationId: string, productId: string) {
  const { data, error } = await client
    .from("product_regulatory_scores")
    .select(
      "jurisdiction, regime, total_points, points_per_100g, methodology, methodology_version, calculated_at, declared_at, source, verification_status"
    )
    .eq("organization_id", organizationId)
    .eq("product_id", productId);
  if (error) return [] as RegulatoryScoreRow[];
  return (data || []) as RegulatoryScoreRow[];
}

export async function loadProductSustainabilityData(
  client: SupabaseClient,
  input: { organizationId: string; productId: string; persistentIdentityId?: string | null }
) {
  const [{ data: impactInputs }, regulatoryScores, { count: evidenceCount }, ownershipCount] =
    await Promise.all([
      client
        .from("product_impact_inputs")
        .select("metric_key, metric_label, value, unit, data_status, methodology, notes, updated_at")
        .eq("organization_id", input.organizationId)
        .eq("product_id", input.productId),
      loadRegulatoryScores(client, input.organizationId, input.productId),
      client
        .from("evidence_records")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", input.organizationId)
        .eq("product_id", input.productId),
      input.persistentIdentityId
        ? client
            .from("ownership_events")
            .select("owner_sequence", { count: "exact", head: true })
            .eq("persistent_identity_id", input.persistentIdentityId)
            .then((r) => r.count || 1)
        : Promise.resolve(1),
    ]);

  const lastVerified = (impactInputs || [])
    .map((r) => r.updated_at)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null;

  return {
    impactInputs: (impactInputs || []) as ImpactInputRow[],
    regulatoryScores: (regulatoryScores || []) as RegulatoryScoreRow[],
    evidenceCount: evidenceCount || 0,
    ownershipCount: Math.max(1, ownershipCount || 1),
    lastVerifiedAt: lastVerified,
  };
}
