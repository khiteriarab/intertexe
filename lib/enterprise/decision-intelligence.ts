import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCatalogTraceabilitySummary } from "./traceability";

export type DecisionInsight = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  body: string;
  metric: string;
  href: string;
  action: string;
};

export async function loadDecisionIntelligence(
  client: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<DecisionInsight[]> {
  const base = `/dashboard/${slug}`;
  const [
    { data: products },
    { data: issues },
    { data: fields },
    { data: suppliers },
    traceSummary,
    { data: requests },
  ] = await Promise.all([
    client
      .from("products")
      .select("id, name, category, passport_state, data_completeness")
      .eq("organization_id", organizationId)
      .eq("lifecycle", "active"),
    client
      .from("issues")
      .select("id, product_id, issue_type, severity, title, status")
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    client
      .from("normalized_fields")
      .select("product_id, field_key, normalized_value")
      .eq("organization_id", organizationId)
      .in("field_key", ["composition", "manufacturing_country"]),
    client.from("suppliers").select("id, name").eq("organization_id", organizationId),
    loadCatalogTraceabilitySummary(client, organizationId),
    client
      .from("supplier_requests")
      .select("id, supplier_id, status, collaboration_status")
      .eq("organization_id", organizationId),
  ]);

  const insights: DecisionInsight[] = [];
  const productRows = products || [];
  const openIssues = issues || [];

  const blocking = openIssues.filter((i) => i.severity === "critical" || i.severity === "high");
  if (blocking.length) {
    insights.push({
      id: "blocking-issues",
      priority: "high",
      title: "Products with highest unresolved data risk",
      body: `${blocking.length} blocking issue(s) require review before publish.`,
      metric: String(blocking.length),
      href: `${base}/issues`,
      action: "Review blocking issues",
    });
  }

  const compositionByProduct = new Map<string, boolean>();
  for (const f of fields || []) {
    if (f.field_key === "composition" && f.normalized_value) {
      compositionByProduct.set(f.product_id, true);
    }
  }
  const missingComposition = productRows.filter((p) => !compositionByProduct.has(p.id));
  if (missingComposition.length) {
    insights.push({
      id: "missing-composition",
      priority: "high",
      title: "Products missing composition",
      body: "Passport publication requires material composition.",
      metric: String(missingComposition.length),
      href: `${base}/products?state=incomplete`,
      action: "Resolve composition gaps",
    });
  }

  const materialExposure = new Map<string, number>();
  for (const f of fields || []) {
    if (f.field_key !== "composition" || !f.normalized_value) continue;
    const product = productRows.find((p) => p.id === f.product_id);
    const cat = product?.category || "Uncategorized";
    materialExposure.set(cat, (materialExposure.get(cat) || 0) + 1);
  }
  const topMaterialCategory = [...materialExposure.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topMaterialCategory) {
    insights.push({
      id: "material-exposure",
      priority: "medium",
      title: "Largest catalog exposure by category",
      body: `${topMaterialCategory[0]} has the most products with recorded composition.`,
      metric: String(topMaterialCategory[1]),
      href: `${base}/products`,
      action: "Review category",
    });
  }

  if (traceSummary.weakestCategories.length) {
    const weakest = traceSummary.weakestCategories[0];
    insights.push({
      id: "weak-traceability",
      priority: "medium",
      title: "Weakest traceability by category",
      body: `${weakest.category} averages ${weakest.avgCompleteness}% traceability completeness.`,
      metric: `${weakest.avgCompleteness}%`,
      href: `${base}/traceability`,
      action: "Open traceability workspace",
    });
  }

  const readyCount = productRows.filter((p) => p.passport_state === "ready").length;
  if (readyCount) {
    insights.push({
      id: "publish-ready",
      priority: "low",
      title: "Products closest to publish-ready",
      body: "These products meet Phase 1 requirements and can be published.",
      metric: String(readyCount),
      href: `${base}/passports`,
      action: "Publish passports",
    });
  }

  const openRequests = (requests || []).filter(
    (r) => r.status === "open" || r.collaboration_status === "awaiting_response"
  ).length;
  if (openRequests) {
    insights.push({
      id: "supplier-requests",
      priority: "medium",
      title: "Outstanding supplier requests",
      body: "Supplier collaboration requests awaiting response or review.",
      metric: String(openRequests),
      href: `${base}/suppliers`,
      action: "Review supplier requests",
    });
  }

  const supplierIssueCounts = new Map<string, number>();
  for (const issue of openIssues.filter((i) => i.issue_type === "supplier" || i.issue_type === "missing_data")) {
    if (!issue.product_id) continue;
    const count = supplierIssueCounts.get(issue.product_id) || 0;
    supplierIssueCounts.set(issue.product_id, count + 1);
  }
  if (supplierIssueCounts.size && (suppliers || []).length) {
    insights.push({
      id: "supplier-incomplete",
      priority: "medium",
      title: "Suppliers contributing incomplete records",
      body: `${supplierIssueCounts.size} product(s) have open supplier-related data gaps.`,
      metric: String(supplierIssueCounts.size),
      href: `${base}/suppliers`,
      action: "Request evidence",
    });
  }

  if (traceSummary.avgCompletenessPct < 50 && productRows.length) {
    insights.push({
      id: "impact-readiness-gap",
      priority: "medium",
      title: "Impact-readiness gaps",
      body: "Low traceability completeness limits future LCA/impact assessment readiness.",
      metric: `${traceSummary.avgCompletenessPct}%`,
      href: `${base}/analytics`,
      action: "Review impact readiness",
    });
  }

  return insights.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.priority] - rank[b.priority];
  });
}
