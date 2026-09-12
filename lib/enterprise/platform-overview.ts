import type { SupabaseClient } from "@supabase/supabase-js";
import { loadOrgOverview } from "./queries";
import { loadCatalogTraceabilitySummary } from "./traceability";
import { loadCatalogImpactSummary } from "./impact-readiness";
import { loadDecisionIntelligence, type DecisionInsight } from "./decision-intelligence";

export type PlatformOverview = {
  overview: Awaited<ReturnType<typeof loadOrgOverview>>;
  traceability: Awaited<ReturnType<typeof loadCatalogTraceabilitySummary>>;
  impact: Awaited<ReturnType<typeof loadCatalogImpactSummary>>;
  supplierRequestsOpen: number;
  topRisks: DecisionInsight[];
  operatingModel: Array<{ stage: string; label: string; status: "complete" | "active" | "upcoming" }>;
};

const OPERATING_STAGES = [
  "CONNECT",
  "NORMALIZE",
  "TRACE",
  "RESOLVE",
  "UNDERSTAND",
  "ACT",
  "PUBLISH",
] as const;

export async function loadPlatformOverview(
  client: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<PlatformOverview> {
  const [overview, traceability, impact, { count: openRequests }, topRisks] = await Promise.all([
    loadOrgOverview(client, organizationId),
    loadCatalogTraceabilitySummary(client, organizationId),
    loadCatalogImpactSummary(client, organizationId),
    client
      .from("supplier_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["open", "submitted"]),
    loadDecisionIntelligence(client, organizationId, slug),
  ]);

  const hasProducts = overview.productCount > 0;
  const hasImports = overview.recentActivity.some((a) => /^Imported/i.test(a.title));
  const hasIssues = overview.issueCount > 0;
  const hasTrace = traceability.avgCompletenessPct > 0;
  const hasPublished = overview.publishedCount > 0;

  const stageStatus = (index: number): "complete" | "active" | "upcoming" => {
    const gates = [hasImports || hasProducts, hasProducts, hasTrace, !hasIssues, hasProducts, hasIssues || overview.readyCount > 0, hasPublished];
    if (gates[index]) return index === gates.findIndex(Boolean) ? "active" : "complete";
    return "upcoming";
  };

  const operatingModel = OPERATING_STAGES.map((stage, index) => ({
    stage,
    label: stage.charAt(0) + stage.slice(1).toLowerCase(),
    status: stageStatus(index),
  }));

  return {
    overview,
    traceability,
    impact,
    supplierRequestsOpen: openRequests || 0,
    topRisks: topRisks.slice(0, 4),
    operatingModel,
  };
}
