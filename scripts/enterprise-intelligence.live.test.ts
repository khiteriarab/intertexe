import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadConsumerIntelligenceAggregate } from "../lib/enterprise/consumer-intelligence.ts";
import { loadGovernedBenchmark } from "../lib/enterprise/benchmarks.ts";
import { getEnterpriseServiceClient } from "../lib/enterprise/client.ts";
import { deleteOrganizationForTest } from "../lib/enterprise/deletion.ts";
import { ITX_RULESET_VERSION } from "../lib/enterprise/intelligence.ts";
import { mappingForPreview } from "../lib/enterprise/import-preview.ts";
import {
  loadMappingTemplate,
  rememberMappingTemplate,
  schemaFingerprint,
} from "../lib/enterprise/mapping-templates.ts";
import { recordNormalizationCandidate } from "../lib/enterprise/learning-loop.ts";
import { ITX_ONTOLOGY_VERSION } from "../lib/enterprise/ontology.ts";
import { commitMappedImport } from "../lib/enterprise/pipeline.ts";
import { publishProductPassport } from "../lib/enterprise/publish.ts";
import { resolveIssue } from "../lib/enterprise/review.ts";
import { parseCompositionText } from "../lib/material-intelligence/composition.ts";

const live = process.env.ENTERPRISE_ALLOW_LIVE_TESTS === "true";

function jwtClient() {
  const url = String(process.env.ENTERPRISE_SUPABASE_URL || "").trim();
  const anon = String(process.env.ENTERPRISE_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

describe("Live intelligence foundations (015)", { skip: !live }, () => {
  it("015 schema is present on obelisk-core", async () => {
    const admin = getEnterpriseServiceClient();
    assert.ok(admin);
    const checks = await Promise.all([
      admin.from("material_ontology_versions").select("version_label").eq("version_label", ITX_ONTOLOGY_VERSION).maybeSingle(),
      admin.from("normalization_rules").select("id").limit(1),
      admin.from("import_mapping_templates").select("schema_fingerprint").limit(1),
      admin.from("normalized_fields").select("ontology_version, rule_id, intelligence_kind").limit(1),
      admin.from("consumer_intelligence_aggregates").select("metric_key").limit(1),
      admin.from("passport_versions").select("ontology_version").limit(1),
    ]);
    for (const row of checks) {
      assert.equal(row.error, null, row.error?.message);
    }
    assert.equal(checks[0].data?.version_label, ITX_ONTOLOGY_VERSION);
  });

  it("ontology v1, normalization provenance, mappings, learning loop, and fail-closed loaders", async () => {
    const admin = getEnterpriseServiceClient();
    assert.ok(admin);
    const suffix = Date.now().toString(36);
    const password = randomBytes(18).toString("base64url");
    let orgId = "";
    let userClient: SupabaseClient | null = null;
    let profileId = "";
    let otherOrgId = "";
    const email = `itx-intel-${suffix}@example.invalid`;

    try {
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .insert({
          slug: `itx-intel-${suffix}`,
          name: "Intelligence live fixture",
          kind: "customer",
          plan: "saas",
        })
        .select("id")
        .maybeSingle();
      assert.equal(orgErr, null, orgErr?.message);
      orgId = org!.id;
      await admin.from("organizations").update({ data_classification: "synthetic_test" }).eq("id", orgId);

      const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(authErr, null, authErr?.message);
      const { data: profile } = await admin
        .from("profiles")
        .insert({ email, auth_user_id: authUser!.user!.id, full_name: "Intel Tester" })
        .select("id")
        .maybeSingle();
      assert.ok(profile?.id);
      profileId = profile.id;
      await admin.from("organization_memberships").insert({
        organization_id: orgId,
        user_id: profileId,
        role: "owner",
        status: "active",
      });

      userClient = jwtClient();
      assert.ok(userClient);
      const session = await userClient.auth.signInWithPassword({ email, password });
      assert.equal(session.error, null, session.error?.message);

      // Ontology v1 abbreviations in process
      assert.equal(parseCompositionText("100% PA").components[0]?.fiber_code, "polyamide");
      assert.equal(parseCompositionText("5% EA").components[0]?.fiber_code, "elastane");
      assert.equal(parseCompositionText("100% PES").components[0]?.fiber_code, "polyester");
      const nylon = parseCompositionText("100% Nylon").components[0];
      assert.equal(nylon?.fiber_code, "nylon");
      assert.equal(nylon?.fiber_name, "Nylon");

      const { data: ontologyRow } = await userClient
        .from("material_ontology_versions")
        .select("version_label, status")
        .eq("version_label", ITX_ONTOLOGY_VERSION)
        .maybeSingle();
      assert.equal(ontologyRow?.status, "approved");

      const columns = ["Style No", "SKU", "Product Name", "Composition"];
      const mapping = { "Style No": "style_code", SKU: "sku", "Product Name": "name", Composition: "composition" };
      await rememberMappingTemplate({
        client: userClient,
        organizationId: orgId,
        columns,
        mapping,
        approvedBy: profileId,
      });
      const loaded = await loadMappingTemplate(userClient, orgId, columns, "upload");
      assert.ok(loaded?.mapping.SKU === "sku");
      const preview = mappingForPreview(columns, undefined, loaded?.mapping || null);
      assert.equal(preview.mappingSource, "saved_template");
      assert.equal(preview.mapping.SKU, "sku");
      // Operator must still confirm — empty operator mapping must not wipe saved template
      const emptyOperator = mappingForPreview(columns, {}, loaded?.mapping || null);
      assert.equal(emptyOperator.mapping.SKU, "sku");

      const otherOrg = await admin
        .from("organizations")
        .insert({ slug: `itx-intel-other-${suffix}`, name: "Other", kind: "customer", plan: "saas" })
        .select("id")
        .maybeSingle();
      assert.ok(otherOrg.data?.id);
      otherOrgId = otherOrg.data!.id;
      const crossOrg = await loadMappingTemplate(userClient, otherOrgId, columns, "upload");
      assert.equal(crossOrg, null);

      const wrongSystem = await loadMappingTemplate(userClient, orgId, columns, "shopify");
      assert.equal(wrongSystem, null);

      const fingerprint = schemaFingerprint(columns);
      const { data: templateRow } = await admin
        .from("import_mapping_templates")
        .select("schema_fingerprint, source_system, organization_id")
        .eq("organization_id", orgId)
        .eq("source_system", "upload")
        .eq("schema_fingerprint", fingerprint)
        .maybeSingle();
      assert.equal(templateRow?.organization_id, orgId);

      const importResult = await commitMappedImport({
        client: userClient,
        organizationId: orgId,
        organizationPlan: "saas",
        productAllowance: null,
        filename: `intel-${suffix}.csv`,
        mapping: { ...mapping, Composition: "composition", "Country of Origin": "manufacturing_country" },
        rows: [
          {
            "Style No": "ST-1",
            SKU: `INTEL-${suffix}`,
            "Product Name": "Intel Tee",
            Composition: "95% cotton 5% millfibre",
            "Country of Origin": "PT",
          },
        ],
      });
      assert.ok(importResult.productsTouched >= 1);

      const { data: product } = await userClient
        .from("products")
        .select("id")
        .eq("organization_id", orgId)
        .eq("sku", `INTEL-${suffix}`)
        .maybeSingle();
      assert.ok(product?.id);

      const { data: compositionField } = await userClient
        .from("normalized_fields")
        .select("ontology_version, rule_id, intelligence_kind, normalized_value, original_value")
        .eq("organization_id", orgId)
        .eq("product_id", product!.id)
        .eq("field_key", "composition")
        .maybeSingle();
      assert.equal(compositionField?.ontology_version, ITX_ONTOLOGY_VERSION);
      assert.equal(compositionField?.intelligence_kind, "normalized");
      assert.match(String(compositionField?.normalized_value || ""), /Cotton/i);

      const { data: nameField } = await userClient
        .from("normalized_fields")
        .select("intelligence_kind")
        .eq("organization_id", orgId)
        .eq("product_id", product!.id)
        .eq("field_key", "name")
        .maybeSingle();
      assert.equal(nameField?.intelligence_kind, "observed");

      const { data: unknownRules } = await admin
        .from("normalization_rules")
        .select("id, scope, status, organization_id, field_key, raw_pattern")
        .eq("organization_id", orgId)
        .eq("field_key", "material_alias")
        .in("status", ["observed", "candidate"]);
      assert.ok((unknownRules || []).length >= 1);
      assert.equal(unknownRules![0].scope, "organization");
      assert.notEqual(unknownRules![0].status, "approved");

      const globalInsert = await userClient.from("normalization_rules").insert({
        organization_id: orgId,
        scope: "global",
        status: "candidate",
        field_key: "composition",
        raw_pattern: "should-fail",
        canonical_value: "fail",
        method: "deterministic",
        version: 1,
      });
      assert.ok(globalInsert.error, "authenticated user must not insert global rules");

      const approvedGlobalInsert = await userClient.from("normalization_rules").insert({
        organization_id: orgId,
        scope: "organization",
        status: "approved",
        field_key: "composition",
        raw_pattern: "should-fail-approved",
        canonical_value: "fail",
        method: "deterministic",
        version: 1,
      });
      assert.ok(approvedGlobalInsert.error, "authenticated user must not self-approve rules");

      await userClient.from("normalized_fields").update({ locked: true, state: "approved" }).eq("product_id", product!.id).eq("field_key", "composition");
      const { data: conflictIssue } = await userClient
        .from("issues")
        .insert({
          organization_id: orgId,
          product_id: product!.id,
          issue_type: "conflict",
          severity: "high",
          title: "Locked composition differs from new source",
          original_value: compositionField?.normalized_value,
          interpreted_value: "98% Cotton / 2% Elastane",
          status: "open",
        })
        .select("id")
        .maybeSingle();
      assert.ok(conflictIssue?.id);

      await resolveIssue({
        client: userClient,
        organizationId: orgId,
        issueId: conflictIssue!.id,
        status: "resolved",
      });

      const { data: candidateRules } = await admin
        .from("normalization_rules")
        .select("id, status, scope")
        .eq("organization_id", orgId)
        .eq("field_key", "composition")
        .eq("status", "candidate");
      assert.ok((candidateRules || []).length >= 1);

      const { data: cases } = await admin
        .from("normalization_rule_cases")
        .select("id, issue_id, rule_id")
        .eq("organization_id", orgId)
        .eq("issue_id", conflictIssue!.id);
      assert.ok((cases || []).length >= 1);

      const { data: overridden } = await userClient
        .from("normalized_fields")
        .select("intelligence_kind, normalized_value")
        .eq("product_id", product!.id)
        .eq("field_key", "composition")
        .maybeSingle();
      assert.equal(overridden?.intelligence_kind, "override");
      assert.match(String(overridden?.normalized_value || ""), /Elastane|98%/);

      await userClient.from("normalized_fields").update({ locked: true, state: "approved" }).eq("product_id", product!.id).eq("field_key", "composition");
      await userClient.from("issues").update({ status: "resolved" }).eq("organization_id", orgId).eq("status", "open");

      const published = await publishProductPassport({
        client: userClient,
        organizationId: orgId,
        productId: product!.id,
      });
      assert.ok(published.publicId);

      const { data: passport } = await admin
        .from("passports")
        .select("id")
        .eq("organization_id", orgId)
        .eq("product_id", product!.id)
        .maybeSingle();
      assert.ok(passport?.id);

      const { data: v1 } = await admin
        .from("passport_versions")
        .select("ontology_version, ruleset_version, snapshot, published_at")
        .eq("passport_id", passport!.id)
        .eq("version_number", 1)
        .maybeSingle();
      assert.equal(v1?.ontology_version, ITX_ONTOLOGY_VERSION);
      assert.equal(v1?.ruleset_version, ITX_RULESET_VERSION);
      assert.equal((v1?.snapshot as { ontology_version?: string })?.ontology_version, ITX_ONTOLOGY_VERSION);

      const { error: mutatePublished } = await admin
        .from("passport_versions")
        .update({ ontology_version: "itx-ontology.v2-should-not-stick" })
        .eq("passport_id", passport!.id)
        .eq("version_number", 1);
      const { data: v1After } = await admin
        .from("passport_versions")
        .select("ontology_version")
        .eq("passport_id", passport!.id)
        .eq("version_number", 1)
        .maybeSingle();
      assert.ok(mutatePublished?.message || v1After?.ontology_version === ITX_ONTOLOGY_VERSION, "published v1 must stay immutable");

      const benchmark = await loadGovernedBenchmark(userClient, { metricKey: "material_mix_cotton" });
      assert.equal(benchmark.status, "insufficient");
      assert.equal(benchmark.reason, "Insufficient benchmark data");

      const consumer = await loadConsumerIntelligenceAggregate(userClient, "passport_scans");
      assert.equal(consumer.status, "insufficient");

      await recordNormalizationCandidate({
        client: userClient,
        organizationId: orgId,
        fieldKey: "material_alias",
        original: "zzunknownfiber",
        canonical: "zzunknownfiber",
        source: "unknown_token",
        status: "observed",
      });
    } finally {
      if (userClient) await userClient.auth.signOut();
      if (otherOrgId) await deleteOrganizationForTest(otherOrgId);
      if (orgId) await deleteOrganizationForTest(orgId);
    }
  });
});
