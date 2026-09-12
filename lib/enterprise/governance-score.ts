import type { SupabaseClient } from "@supabase/supabase-js";
import { loadProductTraceability } from "./traceability";
import { assessLcaReadiness, type ImpactInputRow } from "./impact-readiness";

export type GovernanceDimension = {
  key: string;
  label: string;
  score: number | null;
  detail: string;
  status: "complete" | "partial" | "missing";
};

export type ProductGovernanceScore = {
  dimensions: GovernanceDimension[];
  productId: string;
};

function scoreFromBoolean(present: boolean): { score: number; status: "complete" | "missing" } {
  return present ? { score: 100, status: "complete" } : { score: 0, status: "missing" };
}

function partialScore(ratio: number): { score: number; status: "complete" | "partial" | "missing" } {
  const score = Math.round(ratio * 100);
  if (score >= 100) return { score: 100, status: "complete" };
  if (score > 0) return { score, status: "partial" };
  return { score: 0, status: "missing" };
}

export async function loadProductGovernanceScore(
  client: SupabaseClient,
  organizationId: string,
  productId: string
): Promise<ProductGovernanceScore> {
  const [
    { data: product },
    { data: fields },
    { data: identifiers },
    { data: evidence },
    { data: issues },
    traceability,
    { data: impactRows },
  ] = await Promise.all([
    client.from("products").select("id, sku, name, passport_state").eq("organization_id", organizationId).eq("id", productId).maybeSingle(),
    client.from("normalized_fields").select("field_key, normalized_value, state").eq("organization_id", organizationId).eq("product_id", productId),
    client.from("product_identifiers").select("id").eq("organization_id", organizationId).eq("product_id", productId),
    client
      .from("evidence_records")
      .select("verification_status")
      .eq("organization_id", organizationId)
      .eq("product_id", productId),
    client.from("issues").select("status, severity").eq("organization_id", organizationId).eq("product_id", productId),
    loadProductTraceability(client, organizationId, productId),
    client.from("product_impact_inputs").select("metric_key, data_status").eq("organization_id", organizationId).eq("product_id", productId),
  ]);

  const fieldRows = fields || [];
  const hasName = Boolean(fieldRows.find((f) => f.field_key === "name" && f.normalized_value));
  const hasSku = Boolean(product?.sku);
  const hasComposition = Boolean(fieldRows.find((f) => f.field_key === "composition" && f.normalized_value));
  const hasOrigin = Boolean(
    fieldRows.find(
      (f) =>
        (f.field_key === "manufacturing_country" || f.field_key === "country_of_origin") && f.normalized_value
    )
  );
  const identity = partialScore(
    [hasName, hasSku, (identifiers || []).length > 0].filter(Boolean).length / 3
  );

  const composition = scoreFromBoolean(hasComposition);
  const origin = scoreFromBoolean(hasOrigin);
  const trace = partialScore(traceability.completenessPct / 100);

  const ev = evidence || [];
  const verified = ev.filter((e) => e.verification_status === "verified").length;
  const evidenceCoverage = ev.length ? partialScore(verified / ev.length) : { score: 0, status: "missing" as const };

  const impactInputs: ImpactInputRow[] = (impactRows || []).map((r) => ({
    metricKey: r.metric_key,
    metricLabel: r.metric_key,
    value: null,
    unit: null,
    dataStatus: r.data_status as ImpactInputRow["dataStatus"],
    methodology: null,
    notes: null,
  }));
  const lca = assessLcaReadiness({
    fields: fieldRows,
    traceabilityKnownTiers: traceability.knownTierCount,
    evidenceVerifiedCount: verified,
    impactInputs,
  });
  const impactScore =
    lca.level === "ready" ? 100 : lca.level === "partial" ? 55 : 0;
  const impactStatus =
    lca.level === "ready" ? "complete" : lca.level === "partial" ? "partial" : "missing";

  const passportState = product?.passport_state || "incomplete";
  const blockingIssues = (issues || []).filter(
    (i) => i.status === "open" && (i.severity === "critical" || i.severity === "high")
  ).length;
  const passportScore =
    passportState === "published"
      ? 100
      : passportState === "ready"
        ? 85
        : passportState === "review_required"
          ? 60
          : blockingIssues
            ? 25
            : 40;
  const passportStatus =
    passportState === "published" || passportState === "ready"
      ? "complete"
      : passportState === "review_required"
        ? "partial"
        : "missing";

  const dimensions: GovernanceDimension[] = [
    { key: "identity", label: "Identity completeness", score: identity.score, detail: "Name, SKU, identifiers", status: identity.status },
    { key: "composition", label: "Composition completeness", score: composition.score, detail: hasComposition ? "Composition recorded" : "Missing composition", status: composition.status },
    { key: "traceability", label: "Traceability completeness", score: trace.score, detail: `${traceability.knownTierCount}/4 tiers known`, status: trace.status },
    { key: "evidence", label: "Evidence coverage", score: evidenceCoverage.score, detail: `${verified}/${ev.length || 0} verified`, status: evidenceCoverage.status },
    { key: "origin", label: "Origin completeness", score: origin.score, detail: hasOrigin ? "Origin recorded" : "Missing origin", status: origin.status },
    { key: "impact", label: "Impact readiness", score: impactScore, detail: lca.summary, status: impactStatus as GovernanceDimension["status"] },
    { key: "passport", label: "Passport readiness", score: passportScore, detail: passportStateLabel(passportState), status: passportStatus as GovernanceDimension["status"] },
  ];

  return { productId, dimensions };
}

function passportStateLabel(state: string): string {
  const labels: Record<string, string> = {
    incomplete: "Not ready",
    review_required: "Needs review",
    ready: "Ready to publish",
    published: "Published",
    update_required: "Update required",
  };
  return labels[state] || state;
}
