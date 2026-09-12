/**
 * Fashion data orchestration depth layer tests.
 * Run: node --import tsx --test scripts/enterprise-orchestration.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { computeTraceabilityCompleteness, TRACEABILITY_TIERS } from "../lib/enterprise/traceability.ts";
import { buildFieldProvenance } from "../lib/enterprise/provenance.ts";
import { assessLcaReadiness } from "../lib/enterprise/impact-readiness.ts";
import { deriveImportPipelineStage } from "../lib/enterprise/import-ops.ts";
import { parseIssueSubtype } from "../lib/enterprise/issue-taxonomy.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Enterprise orchestration depth layer", () => {
  it("migration 024 defines traceability and impact tables with RLS", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "enterprise/supabase/migrations/024_traceability_impact_orchestration.sql"),
      "utf8"
    );
    for (const table of ["supply_chain_nodes", "product_impact_inputs", "supplier_social_evidence"]) {
      assert.match(sql, new RegExp(table));
      assert.match(sql, new RegExp(`${table}_select`));
    }
    assert.match(sql, /collaboration_status/);
  });

  it("traceability completeness never counts unknown tiers as known", () => {
    const tiers = TRACEABILITY_TIERS.map((t, index) => ({
      tier: t.tier,
      label: t.label,
      role: t.role,
      status: index === 0 ? ("known" as const) : ("not_provided" as const),
      facility: null,
      country: index === 0 ? "PT" : null,
      countryCode: index === 0 ? "PT" : null,
      supplierId: null,
      supplierName: null,
      evidenceStatus: null,
      sourceRecordId: null,
      confidence: null,
      nodeId: null,
    }));
    assert.equal(computeTraceabilityCompleteness(tiers), 25);
  });

  it("provenance exposes multiple sources and canonical selection", () => {
    const provenance = buildFieldProvenance(
      "composition",
      [
        {
          id: "f1",
          field_key: "composition",
          original_value: "100% Cotton",
          normalized_value: "100% Cotton",
          state: "approved",
          source_record_id: "s2",
          updated_at: "2026-08-12T10:00:00Z",
        },
      ],
      [
        {
          id: "s1",
          source_system: "ERP export",
          retrieved_at: "2026-08-10T10:00:00Z",
          original_payload: { Composition: "100% Cotton" },
        },
        {
          id: "s2",
          source_system: "Supplier file",
          retrieved_at: "2026-08-12T10:00:00Z",
          original_payload: { Composition: "100% Cotton" },
        },
      ]
    );
    assert.ok(provenance);
    assert.equal(provenance!.sources.length, 2);
    assert.ok(provenance!.sources.some((s) => s.isCanonical));
  });

  it("LCA readiness does not claim ready without core prerequisites", () => {
    const insufficient = assessLcaReadiness({
      fields: [],
      traceabilityKnownTiers: 0,
      evidenceVerifiedCount: 0,
      impactInputs: [],
    });
    assert.equal(insufficient.level, "insufficient");

    const partial = assessLcaReadiness({
      fields: [{ field_key: "composition", normalized_value: "100% Cotton" }],
      traceabilityKnownTiers: 1,
      evidenceVerifiedCount: 0,
      impactInputs: [],
    });
    assert.equal(partial.level, "partial");
  });

  it("import pipeline stage derives from summary without fabrication", () => {
    assert.equal(deriveImportPipelineStage("succeeded", { productsTouched: 10 }), "Completed");
    assert.equal(deriveImportPipelineStage("failed", {}), "Failed");
  });

  it("issue subtypes parse from detail without schema migration", () => {
    assert.equal(parseIssueSubtype("subtype:missing_traceability_tier|tier:3"), "missing_traceability_tier");
  });

  it("nav includes traceability workspace", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/constants.ts"), "utf8");
    assert.match(src, /\/traceability/);
  });

  it("bulk supplier evidence operation exists", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/bulk-ops.ts"), "utf8");
    assert.match(src, /bulkRequestSupplierEvidence/);
  });

  it("governance score uses transparent dimensions", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/governance-score.ts"), "utf8");
    assert.match(src, /Traceability completeness/);
    assert.match(src, /Impact readiness/);
  });
});
