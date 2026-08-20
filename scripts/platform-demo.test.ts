import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  DEMO_GTIN_MISSING,
  DEMO_GTIN_REPORTED,
  DEMO_GTIN_VERIFIED,
  DEMO_ILLUSTRATIVE_NOTICE,
  lookupDemoRecord,
} from "../lib/material-intelligence/demo-records.ts";
import {
  DEMO_CATALOG,
  DEMO_WORKFLOW,
  demoCatalogStats,
  demoIssueSummary,
} from "../lib/material-intelligence/demo-catalog.ts";
import { parseGtin, isValidGtinCheckDigit, appendGtinCheckDigit } from "../lib/gtin.ts";
import { parseCompositionText } from "../lib/material-intelligence/composition.ts";
import { evidenceStatusFromSource } from "../lib/material-intelligence/evidence.ts";
import { assertEnvelopeMatchesOpenApi, materialOpenApiDocument } from "../lib/material-intelligence/openapi.ts";
import { successEnvelope, errorEnvelope, newRequestId } from "../lib/material-intelligence/envelope.ts";
import { DPP_ALIGNMENT_NOTICE } from "../lib/material-intelligence/types.ts";

describe("GTIN validation", () => {
  it("accepts checksum-valid GTIN-8/12/13/14 and preserves leading zeroes", () => {
    const gtin8 = appendGtinCheckDigit("0000000");
    const gtin12 = appendGtinCheckDigit("01234567890");
    const gtin13 = DEMO_GTIN_VERIFIED;
    const gtin14 = appendGtinCheckDigit("0001234567890");
    assert.equal(parseGtin(gtin8).ok, true);
    assert.equal(parseGtin(gtin12).ok, true);
    assert.equal((parseGtin(gtin13) as { gtin: string }).gtin, DEMO_GTIN_VERIFIED);
    assert.equal(parseGtin(gtin14).ok, true);
    assert.equal(isValidGtinCheckDigit(DEMO_GTIN_VERIFIED), true);
  });

  it("rejects the previous invalid demo GTIN-13", () => {
    assert.equal(isValidGtinCheckDigit("0198765432104"), false);
    assert.equal(parseGtin("0198765432104").ok, false);
  });
});

describe("Demo fixtures", () => {
  it("uses checksum-valid identifiers for all three records", () => {
    for (const gtin of [DEMO_GTIN_VERIFIED, DEMO_GTIN_REPORTED, DEMO_GTIN_MISSING]) {
      assert.equal(parseGtin(gtin).ok, true, gtin);
    }
  });

  it("labels the verified fixture as an illustrative sample", () => {
    const record = lookupDemoRecord(DEMO_GTIN_VERIFIED);
    assert.ok(record);
    assert.equal(record.evidence.status, "verified_label");
    assert.equal(record.match_type, "exact_gtin");
    assert.match(record.message || "", /Illustrative verified-label example/i);
    assert.equal(record.message, DEMO_ILLUSTRATIVE_NOTICE);
    assert.equal(record.product.brand, "INTERTEXE Sample");
    assert.ok(!/reviewed garment-label evidence/i.test(JSON.stringify(record)));
  });

  it("accepts SKU aliases without inventing a manufacturer", () => {
    assert.equal(lookupDemoRecord("SAMPLE-VERIFIED")?.product.gtin, DEMO_GTIN_VERIFIED);
    assert.equal(lookupDemoRecord("SAMPLE-REPORTED")?.evidence.status, "reported_retailer");
    const missing = lookupDemoRecord("SAMPLE-MISSING");
    assert.equal(missing?.match_type, "not_found");
    assert.equal(missing?.product.brand, null);
    assert.equal(missing?.composition.components.length, 0);
  });

  it("does not invent a company from a sample prefix", () => {
    const record = lookupDemoRecord(DEMO_GTIN_MISSING);
    assert.ok(record);
    assert.equal(record.match_type, "not_found");
    assert.equal(record.product.brand, null);
    assert.equal(record.composition.components.length, 0);
    assert.doesNotMatch(JSON.stringify(record), /Demo House/);
    assert.match(record.message || "", /No manufacturer was assumed/);
  });

  it("does not search production for unknown valid GTINs", () => {
    const unknown = appendGtinCheckDigit("999999999999");
    assert.equal(lookupDemoRecord(unknown), null);
  });
});

describe("Provenance mapping", () => {
  it("never upgrades retailer, affiliate, or user_scan data to verified_label", () => {
    assert.equal(
      evidenceStatusFromSource({ source: "affiliate_feed", hasComposition: true }),
      "reported_retailer"
    );
    assert.equal(
      evidenceStatusFromSource({ source: "retailer_page", hasComposition: true }),
      "reported_retailer"
    );
    assert.equal(
      evidenceStatusFromSource({ source: "user_scan", verifiedBy: "user_scan", hasComposition: true }),
      "unknown_legacy"
    );
    assert.equal(
      evidenceStatusFromSource({ source: "inferred", hasComposition: true }),
      "inferred"
    );
    assert.equal(
      evidenceStatusFromSource({
        source: "physical_label_scan",
        verifiedBy: "label_reviewer",
        reviewedAt: "2026-08-02T12:00:00Z",
        hasComposition: true,
      }),
      "verified_label"
    );
  });
});

describe("Composition parsing", () => {
  it("does not invent a remainder to reach 100", () => {
    const parsed = parseCompositionText("80% cotton");
    assert.equal(parsed.total_percentage, 80);
    assert.equal(parsed.components.length, 1);
    assert.ok(parsed.normalization_warnings.some((w) => /not invented/i.test(w)));
  });
});

describe("OpenAPI contract", () => {
  it("describes OpenAPI 3.1 and the production path", () => {
    const doc = materialOpenApiDocument();
    assert.equal(doc.openapi, "3.1.0");
    assert.ok(doc.paths["/api/v1/composition/{gtin}"]);
    assert.ok(doc.paths["/api/v1/demo/composition/{gtin}"]);
  });

  it("matches runtime success and error envelopes", () => {
    const record = lookupDemoRecord(DEMO_GTIN_VERIFIED);
    assert.ok(record);
    const ok = successEnvelope(newRequestId(), record);
    assert.deepEqual(assertEnvelopeMatchesOpenApi(ok as unknown as Record<string, unknown>), []);
    const err = errorEnvelope("req_test", "invalid_gtin", "bad identifier");
    assert.deepEqual(assertEnvelopeMatchesOpenApi(err as unknown as Record<string, unknown>), []);
    assert.equal("stack" in err, false);
    assert.match(ok.data.dpp_alignment.notice, /not legal certification/i);
    assert.equal(ok.data.dpp_alignment.notice, DPP_ALIGNMENT_NOTICE);
  });
});

describe("Public demo and docs source safety", () => {
  it("keeps the public demo route free of database credentials", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/api/v1/demo/composition/[gtin]/route.ts"),
      "utf8"
    );
    assert.equal(/supabase|SERVICE_ROLE|createClient/i.test(route), false);
    assert.match(route, /lookupDemoRecord/);
    assert.match(route, /demoRateLimit/);
  });

  it("does not use a wildcard CORS policy on the production endpoint", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/api/v1/composition/[gtin]/route.ts"),
      "utf8"
    );
    assert.match(route, /https:\/\/www\.intertexe\.com/);
    assert.equal(/\*\s*["']/.test(route) && /Access-Control-Allow-Origin["']:\s*["']\*/.test(route), false);
    assert.doesNotMatch(route, /Access-Control-Allow-Origin": "\*"/);
  });

  it("does not select raw key hashes for the founder list endpoint", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/api/dashboard/material-api-clients/route.ts"),
      "utf8"
    );
    assert.match(route, /key_prefix, last_four/);
    assert.doesNotMatch(route, /select\("[^"]*key_hash/);
  });

  it("does not accept confidential catalog uploads on the public form", () => {
    const form = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformLeadForm.tsx"), "utf8");
    assert.doesNotMatch(form, /type=["']file["']/);
    assert.match(form, /Do not attach confidential catalogs/);
  });

  it("keeps the Material Intelligence migration additive and reversible", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260819_material_intelligence_api.sql"),
      "utf8"
    );
    assert.match(sql, /Additive only/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.material_api_clients/);
    assert.match(sql, /DROP TABLE IF EXISTS public\.material_evidence/);
    assert.doesNotMatch(sql, /^\s*ALTER TABLE public\.(products|barcode_compositions|upc_brand_prefixes)/m);
    assert.match(sql, /^--\s+DROP TABLE IF EXISTS public\.material_api_usage;/m);
    assert.doesNotMatch(sql, /^\s*DROP TABLE /m);
  });

  it("keeps documentation examples on the demo endpoint and OpenAPI URL", () => {
    const docs = fs.readFileSync(path.join(process.cwd(), "app/platform/docs/page.tsx"), "utf8");
    assert.match(docs, /\/api\/v1\/demo\/composition\//);
    assert.match(docs, /\/api\/openapi\.json/);
    assert.match(docs, /DEMO_GTIN_VERIFIED/);
    assert.doesNotMatch(docs, /0198765432104/);
    assert.match(docs, /unknown_legacy/);
    assert.match(docs, /Authorization: Bearer/);
  });
});

describe("Permanent 10-product demonstration catalog", () => {
  it("walks ten INTERTEXE sample products through the full workflow", () => {
    assert.equal(DEMO_CATALOG.length, 10);
    assert.equal(
      DEMO_WORKFLOW.map((step) => step.id).join("→"),
      "source→normalized→issues→intelligence→benchmark→passports"
    );
    assert.ok(DEMO_CATALOG.some((product) => product.name === "Dress 8721"));
    assert.ok(DEMO_CATALOG.some((product) => product.issues.includes("conflict")));
    assert.ok(DEMO_CATALOG.some((product) => product.issues.includes("invalid_total")));
    const stats = demoCatalogStats();
    assert.equal(stats.products, 10);
    assert.ok(stats.issueCount > 0);
    assert.ok(stats.readyCount > 0);
    assert.ok(demoIssueSummary().length > 0);
    const conflict = DEMO_CATALOG.find((product) => product.id === "dress-8721");
    assert.equal(conflict?.naturalFiberShare, null);
    assert.match(conflict?.normalized.shell || "", /Conflict/);
  });

  it("keeps the catalog walkthrough on /platform/demo without inventing missing fields", () => {
    const demo = fs.readFileSync(path.join(process.cwd(), "app/platform/demo/PlatformDemoClient.tsx"), "utf8");
    const walkthrough = fs.readFileSync(
      path.join(process.cwd(), "app/platform/demo/DemoCatalogWalkthrough.tsx"),
      "utf8"
    );
    const previews = fs.readFileSync(path.join(process.cwd(), "app/platform/workspace-previews.tsx"), "utf8");
    assert.match(demo, /DemoCatalogWalkthrough/);
    assert.match(walkthrough, /CatalogPreview/);
    assert.match(walkthrough, /IssuesPreview/);
    assert.match(walkthrough, /messy source data/i);
    assert.match(walkthrough, /does not overwrite the original string/i);
    assert.match(previews, /Coming \/ developing/);
    assert.match(previews, /INTERTEXE consumer signal/i);
    assert.doesNotMatch(walkthrough, /EU Certified/);
    assert.doesNotMatch(walkthrough, /Guaranteed Compliant/);
    assert.doesNotMatch(previews, /Official DPP Score/);
  });
});
