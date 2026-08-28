import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMaterialToken } from "./ontology";

export type NormalizationRuleScope = "global" | "organization";
export type NormalizationRuleStatus =
  | "observed"
  | "candidate"
  | "reviewed"
  | "approved"
  | "rejected"
  | "superseded";

/**
 * Org-scoped only. Authenticated clients cannot insert global or approved rows
 * (RLS). Never copy identifiable source payloads onto a global rule.
 */
export async function recordNormalizationCandidate(input: {
  client: SupabaseClient;
  organizationId: string;
  fieldKey: string;
  original: string;
  canonical: string;
  issueId?: string | null;
  productId?: string | null;
  reviewerId?: string | null;
  source: "issue_resolution" | "field_approval" | "unknown_token";
  status?: "observed" | "candidate";
}): Promise<void> {
  const original = input.original.trim();
  const canonical = input.canonical.trim();
  if (!original || !canonical) return;
  if (original.toLowerCase() === canonical.toLowerCase() && input.source !== "unknown_token") return;
  if (globalOntologyAlreadyMaps(original, canonical) && input.source !== "unknown_token") return;

  const rawPattern = original.toLowerCase();
  const status = input.status || (input.source === "unknown_token" ? "observed" : "candidate");

  const existing = await input.client
    .from("normalization_rules")
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .eq("field_key", input.fieldKey)
    .eq("raw_pattern", rawPattern)
    .in("status", ["observed", "candidate", "reviewed", "approved"])
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  let ruleId = existing.data?.id as string | undefined;
  if (!ruleId) {
    const inserted = await input.client
      .from("normalization_rules")
      .insert({
        organization_id: input.organizationId,
        scope: "organization",
        status,
        field_key: input.fieldKey,
        raw_pattern: rawPattern,
        canonical_value: canonical,
        method: "deterministic",
        version: 1,
        reviewer_id: input.reviewerId || null,
        provenance: input.source,
        data_classification: "customer_confidential",
      })
      .select("id")
      .maybeSingle();
    ruleId = inserted.data?.id;
  }

  if (!ruleId) return;

  await input.client.from("normalization_rule_cases").insert({
    organization_id: input.organizationId,
    rule_id: ruleId,
    issue_id: input.issueId || null,
    product_id: input.productId || null,
    original_value: original,
    interpreted_value: canonical,
    source: input.source,
  });
}

function globalOntologyAlreadyMaps(original: string, canonical: string): boolean {
  const term = resolveMaterialToken(original);
  if (!term) return false;
  const target = canonical.toLowerCase();
  return term.code === target || term.canonicalName.toLowerCase() === target;
}

export async function loadApprovedOrgAliases(
  client: SupabaseClient,
  organizationId: string
): Promise<Record<string, string>> {
  const { data, error } = await client
    .from("normalization_rules")
    .select("raw_pattern, canonical_value, field_key")
    .eq("organization_id", organizationId)
    .eq("scope", "organization")
    .eq("status", "approved")
    .in("field_key", ["material_alias", "composition"]);
  if (error || !data?.length) return {};
  const aliases: Record<string, string> = {};
  for (const row of data) {
    if (row.field_key !== "material_alias") continue;
    const key = String(row.raw_pattern || "").trim().toLowerCase();
    const value = String(row.canonical_value || "").trim().toLowerCase();
    if (key && value) aliases[key] = value;
  }
  return aliases;
}

export async function findApprovedCompositionRule(
  client: SupabaseClient,
  organizationId: string,
  original: string
): Promise<{ id: string; canonical: string } | null> {
  const pattern = original.trim().toLowerCase();
  if (!pattern) return null;
  const { data, error } = await client
    .from("normalization_rules")
    .select("id, canonical_value")
    .eq("organization_id", organizationId)
    .eq("scope", "organization")
    .eq("status", "approved")
    .eq("field_key", "composition")
    .eq("raw_pattern", pattern)
    .maybeSingle();
  if (error || !data?.canonical_value) return null;
  return { id: data.id, canonical: String(data.canonical_value) };
}

export function assertNotGlobalPromotion(rule: { scope: string; organizationId: string | null }): void {
  if (rule.scope === "global" || !rule.organizationId) {
    throw new Error("Customer resolutions must not be promoted to global rules automatically.");
  }
}
