import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { filterFieldsForAccess, isPublicAccessClass } from "../lib/enterprise/access-classes.ts";
import { fieldEvidenceSummary } from "../lib/enterprise/evidence.ts";
import { buildIdentifierBundle } from "../lib/enterprise/identifiers.ts";
import { integrityHash } from "../lib/enterprise/integrity.ts";
import { ManualRegistryProvider } from "../lib/enterprise/registry/manual-provider.ts";
import {
  ESPR_FOUNDATION_RULESET,
  evaluateRegulatoryRequirements,
} from "../lib/enterprise/regulatory-evaluator.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("EU DPP foundations migration", () => {
  it("defines registry, evidence, economic operator, and integrity columns in 018", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "enterprise/supabase/migrations/018_eu_dpp_foundations.sql"),
      "utf8"
    );
    assert.match(sql, /dpp_registry_registrations/);
    assert.match(sql, /evidence_records/);
    assert.match(sql, /economic_operators/);
    assert.match(sql, /passport_backup_packages/);
    assert.match(sql, /integrity_hash/);
    assert.match(sql, /espr-foundation\.v1/);
    assert.match(sql, /economic_operator/);
    assert.match(sql, /repair_recycling/);
  });
});

describe("Access classification", () => {
  it("filters public resolver fields server-side", () => {
    const fields = [
      { key: "name", access_class: "public" },
      { key: "origin", access_class: "supply_chain" },
      { key: "internal_note", access_class: "internal" },
    ];
    const publicFields = filterFieldsForAccess(fields);
    assert.equal(publicFields.length, 1);
    assert.equal(publicFields[0]?.key, "name");
    assert.equal(isPublicAccessClass("authority"), false);
  });
});

describe("Identifier bundle", () => {
  it("keeps resolver ID separate from EU registration ID", () => {
    const bundle = buildIdentifierBundle({
      productId: "prod-1",
      sku: "SKU-1",
      publicResolverId: "itx_abc123",
      euRegistrationId: "eu-uri-999",
    });
    assert.equal(bundle.public_resolver_id, "itx_abc123");
    assert.equal(bundle.eu_registry_registration_identifier, "eu-uri-999");
    assert.notEqual(bundle.public_resolver_id, bundle.eu_registry_registration_identifier);
  });
});

describe("Integrity hash", () => {
  it("is stable for canonical JSON", () => {
    const a = integrityHash({ b: 1, a: 2 });
    const b = integrityHash({ a: 2, b: 1 });
    assert.equal(a, b);
    assert.match(a, /^[a-f0-9]{64}$/);
  });
});

describe("Manual registry provider", () => {
  it("does not claim automated submission", () => {
    const provider = new ManualRegistryProvider("sandbox");
    assert.equal(provider.automatedSubmissionAvailable, false);
    const payload = provider.buildRegistrationPayload({
      schema_version: "intertexe.registry-ready.v1",
      registry_environment: "sandbox",
      product_unique_identifier: "SKU-1",
      economic_operator_identifier: null,
      commodity_code: null,
      public_resolver_id: "itx_test",
      public_resolver_url: "https://www.intertexe.com/p/itx_test",
      passport_version: 1,
      integrity_hash: "abc",
      identifier_bundle: {},
      submission_note: "test",
    });
    assert.equal(payload.public_resolver_id, "itx_test");
    assert.ok(String(payload.disclaimer).includes("separate"));
  });

  it("validates EU registration identifier format", () => {
    const provider = new ManualRegistryProvider("sandbox");
    assert.equal(provider.validateEuRegistrationIdentifier("").valid, false);
    assert.equal(provider.validateEuRegistrationIdentifier("urn:eu:dpp:abc-123").valid, true);
  });
});

describe("Regulatory evaluator", () => {
  it("evaluates ESPR foundation without inventing textile obligations", () => {
    const result = evaluateRegulatoryRequirements({
      rulesetVersion: ESPR_FOUNDATION_RULESET,
      frameworkName: "ESPR",
      requirements: [
        {
          id: "1",
          requirement_key: "product.identity.name",
          field_key: "name",
          required: true,
          authoritative_source: "ESPR",
          source_reference: "Art. 10",
          source_url: null,
          access_class: "public",
          severity: "high",
          obligation_kind: "espr_base",
          applicability: null,
        },
        {
          id: "2",
          requirement_key: "textile.care.label",
          field_key: "care_instructions",
          required: true,
          authoritative_source: null,
          source_reference: null,
          source_url: null,
          access_class: null,
          severity: null,
          obligation_kind: "textile_delegated_act",
          applicability: null,
        },
      ],
      product: { name: "Shirt", sku: "SH-1" },
      fields: [{ field_key: "composition", normalized_value: "100% cotton", state: "approved", access_class: "public" }],
      identifiers: [],
      passportPublicId: "itx_demo",
    });
    assert.equal(result.requirements[0]?.status, "satisfied");
    assert.equal(result.requirements[1]?.status, "awaiting_rule");
  });
});

describe("Evidence workflow", () => {
  it("does not treat missing evidence as verified", () => {
    const summary = fieldEvidenceSummary("country_of_origin", [], [
      { issue_type: "missing_data", title: "Country of origin evidence missing", status: "open" },
    ]);
    assert.equal(summary.status, "missing");
  });
});
