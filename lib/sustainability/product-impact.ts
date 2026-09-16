import type { SupabaseClient } from "@supabase/supabase-js";
import { SUSTAINABILITY_PROVIDERS, providerAttribution } from "./providers";
import {
  listStoredProductImpacts,
  loadProviderConnections,
  resolveStoredProductImpact,
} from "./store";
import type { ProductImpactRecord, ProductTraceabilityScore } from "./types";

export type ProductImpactBundle = {
  impact: ProductImpactRecord | null;
  traceabilityScore: ProductTraceabilityScore | null;
  sourceAttribution: string | null;
};

export async function loadProductImpactBundle(
  client: SupabaseClient,
  organizationId: string,
  slug: string,
  product: { id: string; style_code?: string | null; sku?: string | null; data_completeness?: number | null }
): Promise<ProductImpactBundle> {
  const connections = await loadProviderConnections(client, organizationId, slug);
  let impact = await resolveStoredProductImpact(client, organizationId, slug, product);

  if (!impact) {
    for (const provider of SUSTAINABILITY_PROVIDERS) {
      if (!connections.find((c) => c.providerId === provider.id)?.credentialsConfigured) continue;
      const live = await provider.fetchProductImpact({
        organizationId,
        productId: product.id,
        sku: product.sku,
        styleCode: product.style_code,
        credentials: null,
      });
      if (live?.environmentalImpact) {
        impact = {
          productId: product.id,
          environmentalImpact: live.environmentalImpact,
          impactAssessments: live.impactAssessments || [],
          sustainabilityScores: live.sustainabilityScores || [],
        };
        break;
      }
    }
  }

  const traceabilityScore = buildTraceabilityScore(product.data_completeness);
  const primaryAssessment = impact?.impactAssessments[0];
  const sourceAttribution = primaryAssessment
    ? providerAttribution(primaryAssessment.provider, primaryAssessment.methodology)
    : null;

  return { impact, traceabilityScore, sourceAttribution };
}

function buildTraceabilityScore(dataCompleteness: number | null | undefined): ProductTraceabilityScore {
  const score = typeof dataCompleteness === "number" ? Math.round(dataCompleteness) : 0;
  return {
    score,
    supplyChainRecordCount: score > 0 ? Math.max(1, Math.round(score / 12)) : 0,
    certificateCount: score >= 70 ? 2 : score >= 40 ? 1 : 0,
    verifiedStages: score >= 50 ? [{ id: "tier1", label: "Tier 1 supplier", detail: "On file" }] : [],
    unverifiedStages:
      score < 85
        ? [{ id: "tier2", label: "Tier 2 processing", status: score < 50 ? "missing" : "partial" }]
        : [],
  };
}

export async function loadAllProductImpacts(
  client: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<ProductImpactRecord[]> {
  return listStoredProductImpacts(client, organizationId, slug);
}
