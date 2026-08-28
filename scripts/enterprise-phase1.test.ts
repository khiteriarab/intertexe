import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { canMutateEnterprise } from "../lib/enterprise/roles.ts";
import { evaluateBenchmarkDataset } from "../lib/enterprise/benchmarks.ts";
import { parseCsv, parseImportPayload } from "../lib/enterprise/csv.ts";
import { demoRequestHasForbiddenOrgSelector } from "../lib/enterprise/demo-guard.ts";
import { getDeploymentEnv } from "../lib/enterprise/environment.ts";
import {
  applyColumnMapping,
  mappingForPreview,
  previewImportWithCatalog,
  suggestColumnMapping,
} from "../lib/enterprise/import-preview.ts";
import { evaluatePublishability } from "../lib/enterprise/publishability.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("obelisk-core is the only product source of truth", () => {
  it("does not duplicate customer catalog tables into the HQ migration", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "supabase/migrations/20260827_hq_enterprise_org_refs.sql"),
      "utf8"
    );
    assert.match(sql, /enterprise_organization_id/);
    assert.match(sql, /enterprise_organization_slug/);
    assert.doesNotMatch(sql, /CREATE TABLE.*\bproducts\b/i);
    assert.doesNotMatch(sql, /source_records/);
    assert.doesNotMatch(sql, /normalized_fields/);
    assert.doesNotMatch(sql, /passports/);
  });

  it("keeps Enterprise schema files out of the consumer migrations folder", () => {
    const hq = fs.readdirSync(path.join(ROOT, "supabase/migrations")).join("\n");
    assert.doesNotMatch(hq, /001_enterprise_foundation/);
    assert.doesNotMatch(hq, /source_records/);
  });
});

describe("Environment and demo guards", () => {
  it("rejects organization selectors on demonstration requests", () => {
    assert.equal(demoRequestHasForbiddenOrgSelector(new URLSearchParams("gtin=123")), false);
    assert.equal(demoRequestHasForbiddenOrgSelector(new URLSearchParams("organization=acme")), true);
    assert.equal(demoRequestHasForbiddenOrgSelector({ org: "intertexe" }), true);
    assert.equal(demoRequestHasForbiddenOrgSelector({ organization_id: "uuid" }), true);
    assert.equal(demoRequestHasForbiddenOrgSelector({ slug: "intertexe-demo" }), true);
  });

  it("maps Vercel preview to staging unless ENTERPRISE_DEPLOYMENT_ENV is set", () => {
    const previous = process.env.ENTERPRISE_DEPLOYMENT_ENV;
    const vercel = process.env.VERCEL_ENV;
    delete process.env.ENTERPRISE_DEPLOYMENT_ENV;
    process.env.VERCEL_ENV = "preview";
    try {
      assert.equal(getDeploymentEnv(), "staging");
    } finally {
      if (previous == null) delete process.env.ENTERPRISE_DEPLOYMENT_ENV;
      else process.env.ENTERPRISE_DEPLOYMENT_ENV = previous;
      if (vercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = vercel;
    }
  });

  it("defines environment and classification conventions in 013", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "enterprise/supabase/migrations/013_environment_and_benchmarks.sql"),
      "utf8"
    );
    assert.match(sql, /enterprise_environment/);
    assert.match(sql, /data_classification/);
    assert.match(sql, /demo_public_organizations/);
    assert.match(sql, /assert_demo_org/);
    assert.match(sql, /benchmark_permissions/);
  });
});

describe("Import mapping and CSV", () => {
  it("parses quoted CSV cells and maps customer columns", () => {
    const parsed = parseCsv('STYLE_NO,MATERIAL_1,SKU,NAME\n"ST-1","100% cotton","SKU-1","Tee, navy"');
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].NAME, "Tee, navy");
    const mapping = Object.fromEntries(
      suggestColumnMapping(parsed.columns)
        .filter((row) => row.canonicalField)
        .map((row) => [row.sourceColumn, row.canonicalField!])
    );
    const mapped = applyColumnMapping(parsed.rows[0], mapping);
    assert.equal(mapped.style_code, "ST-1");
    assert.equal(mapped.composition, "100% cotton");
    assert.equal(mapped.sku, "SKU-1");
    assert.equal(suggestColumnMapping(["MATERIAL"])[0].canonicalField, "composition");
  });

  it("auto-suggests high-confidence SKU name and composition without mapping ambiguous columns", () => {
    const columns = ["SKU", "Product Name", "Composition", "Notes", "MATERIAL_1", "Season"];
    const first = mappingForPreview(columns);
    assert.equal(first.mapping.SKU, "sku");
    assert.equal(first.mapping["Product Name"], "name");
    assert.equal(first.mapping.Composition, "composition");
    assert.equal(first.mapping.Notes, "");
    assert.equal(first.mapping.MATERIAL_1, "");
    assert.equal(first.mapping.Season, "");
    assert.equal(first.suggested.find((row) => row.sourceColumn === "MATERIAL_1")?.confidence, "medium");
    const emptyObject = mappingForPreview(columns, {});
    assert.equal(emptyObject.mapping.SKU, "sku");
    const operator = mappingForPreview(columns, { SKU: "sku", Notes: "name" });
    assert.equal(operator.mapping.Notes, "name");
    assert.equal(operator.mapping.Composition, "");
  });

  it("previews updates against existing catalog keys", () => {
    const rows = [
      { SKU: "A-1", NAME: "Tee" },
      { SKU: "B-1", NAME: "New" },
    ];
    const preview = previewImportWithCatalog(rows, { SKU: "sku", NAME: "name" }, new Set(["a-1"]));
    assert.equal(preview.estimatedUpdates, 1);
    assert.equal(preview.estimatedNewProducts, 1);
  });

  it("accepts JSON payloads through parseImportPayload", () => {
    const parsed = parseImportPayload({ json: [{ sku: "1", name: "Tee" }] });
    assert.equal(parsed.rows[0].sku, "1");
  });
});

describe("Benchmarks are governed aggregates", () => {
  it("returns Insufficient benchmark data when unpublished or undersampled", () => {
    const blocked = evaluateBenchmarkDataset({
      status: "draft",
      sample_size: 100,
      min_sample_size: 5,
      provenance: "test",
      aggregation_rules: null,
      median: 40,
    });
    assert.equal(blocked.status, "insufficient");
    if (blocked.status === "insufficient") {
      assert.equal(blocked.reason, "Insufficient benchmark data");
    }
    const small = evaluateBenchmarkDataset({
      status: "approved",
      sample_size: 2,
      min_sample_size: 5,
      provenance: "test",
      aggregation_rules: null,
      median: 40,
    });
    assert.equal(small.status, "insufficient");
    const ok = evaluateBenchmarkDataset({
      status: "approved",
      sample_size: 12,
      min_sample_size: 5,
      provenance: "anonymized mix",
      aggregation_rules: "median",
      median: 41,
    });
    assert.equal(ok.status, "ok");
  });

  it("does not query customer tables from the benchmark helper", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/enterprise/benchmarks.ts"), "utf8");
    assert.doesNotMatch(src, /from\("products"\)/);
    assert.doesNotMatch(src, /from\("organizations"\)/);
    assert.doesNotMatch(src, /from\("source_records"\)/);
    assert.match(src, /benchmark_datasets/);
  });
});

describe("Phase 1 permissions and publishability", () => {
  it("blocks read-only and supplier mutation", () => {
    assert.equal(canMutateEnterprise("product_manager"), true);
    assert.equal(canMutateEnterprise("owner"), true);
    assert.equal(canMutateEnterprise("read_only"), false);
    assert.equal(canMutateEnterprise("supplier_contributor"), false);
  });

  it("requires identity, composition, approvals, and a resolver", () => {
    const blocked = evaluatePublishability({
      identityPresent: true,
      requiredFieldsPresent: true,
      criticalConflicts: 0,
      criticalValidations: 0,
      requiredApprovalsComplete: false,
      passportIdentifier: "pending",
      resolverDestination: "https://www.intertexe.com/p/pending",
    });
    assert.equal(blocked.status, "blocked");
  });
});

describe("Demo remains on curated fixtures until ten real Demo Brand products exist", () => {
  it("keeps /platform/demo on the material-intelligence fixtures", () => {
    const page = fs.readFileSync(path.join(ROOT, "app/platform/demo/PlatformDemoClient.tsx"), "utf8");
    assert.match(page, /\/api\/v1\/demo\/composition/);
    assert.doesNotMatch(page, /intertexe-demo/);
    const api = fs.readFileSync(path.join(ROOT, "app/api/v1/demo/composition/[gtin]/route.ts"), "utf8");
    assert.match(api, /lookupDemoRecord/);
    assert.match(api, /demoRequestHasForbiddenOrgSelector/);
  });
});
