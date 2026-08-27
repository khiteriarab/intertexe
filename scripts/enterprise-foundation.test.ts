import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  HQ_RESERVED_SLUGS,
  isReservedHqSlug,
  isValidOrgSlug,
} from "../lib/enterprise/constants.ts";
import { evaluatePublishability } from "../lib/enterprise/publishability.ts";
import { buildWorkspaceContexts, resolvePostLoginPath } from "../lib/enterprise/memberships.ts";
import {
  compositionPercentTotal,
  detectIdentifierCollision,
  previewImport,
} from "../lib/enterprise/import-preview.ts";
import { entitlementsForPlan } from "../lib/enterprise/entitlements.ts";
import { slugifyOrganizationName } from "../lib/enterprise/ids.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = path.join(ROOT, "enterprise/supabase/migrations");

function readMigration(name: string) {
  return fs.readFileSync(path.join(MIGRATIONS, name), "utf8");
}

describe("Enterprise foundation files", () => {
  it("keeps Enterprise schema out of the consumer HQ migrations folder", () => {
    const hq = fs.readdirSync(path.join(ROOT, "supabase/migrations"));
    assert.equal(hq.some((file) => file.includes("enterprise_foundation")), false);
    const files = fs.readdirSync(MIGRATIONS).sort();
    assert.deepEqual(
      files.filter((file) => file.endsWith(".sql")),
      [
        "001_enterprise_foundation.sql",
        "002_organizations.sql",
        "003_catalog_products.sql",
        "004_material_intelligence.sql",
        "005_issues.sql",
        "006_passports.sql",
        "007_suppliers.sql",
        "008_regulatory_rules.sql",
        "009_benchmarking.sql",
        "010_audit_security.sql",
        "011_tenant_hardening.sql",
        "012_source_delete_for_org_removal.sql",
        "013_environment_and_benchmarks.sql",
      ]
    );
  });

  it("seeds INTERTEXE and Demo Brand without confidential catalog rows", () => {
    const seed = fs.readFileSync(path.join(ROOT, "enterprise/supabase/seed.sql"), "utf8");
    assert.match(seed, /'intertexe'/);
    assert.match(seed, /'intertexe-demo'/);
    assert.match(seed, /is_customer_zero/);
    assert.match(seed, /approved_for_public_demo/);
    assert.doesNotMatch(seed, /password/i);
    assert.doesNotMatch(seed, /service_role/);
  });
});

describe("Reserved HQ URLs", () => {
  it("keeps founder routes from being captured as organization slugs", () => {
    for (const slug of [
      "command-center",
      "products",
      "settings",
      "enterprise",
      "login",
      "supplier",
    ]) {
      assert.equal(isReservedHqSlug(slug), true, slug);
    }
    assert.equal(isReservedHqSlug("intertexe"), false);
    assert.equal(isValidOrgSlug("acme-fashion"), true);
    assert.equal(isValidOrgSlug("products"), false);
    assert.equal(HQ_RESERVED_SLUGS.has("commerce"), true);
  });
});

describe("Auth routing", () => {
  it("sends founders to HQ and brands to their org", () => {
    const memberships = [
      {
        organizationId: "1",
        slug: "acme-fashion",
        name: "Acme",
        role: "owner",
        kind: "customer",
        plan: "saas",
        isDemo: false,
      },
    ];
    assert.equal(resolvePostLoginPath({ hq: true, memberships }), "/dashboard");
    assert.equal(resolvePostLoginPath({ hq: false, memberships }), "/dashboard/acme-fashion");
    const contexts = buildWorkspaceContexts({
      hq: true,
      memberships: [
        {
          organizationId: "0",
          slug: "intertexe",
          name: "INTERTEXE",
          role: "owner",
          kind: "customer_zero",
          plan: "internal",
          isDemo: false,
        },
      ],
    });
    assert.deepEqual(
      contexts.map((c) => c.label),
      ["INTERTEXE HQ", "INTERTEXE — DPP Workspace"]
    );
  });
});

describe("Publishability is server-side", () => {
  it("blocks publication when required checks fail", () => {
    const blocked = evaluatePublishability({
      identityPresent: false,
      requiredFieldsPresent: false,
      criticalConflicts: 1,
      criticalValidations: 1,
      requiredApprovalsComplete: false,
      passportIdentifier: null,
      resolverDestination: null,
    });
    assert.equal(blocked.status, "blocked");
    if (blocked.status === "blocked") {
      assert.equal(blocked.blockers.length >= 6, true);
    }
    const ready = evaluatePublishability({
      identityPresent: true,
      requiredFieldsPresent: true,
      criticalConflicts: 0,
      criticalValidations: 0,
      requiredApprovalsComplete: true,
      passportIdentifier: "itx_abc",
      resolverDestination: "https://www.intertexe.com/p/itx_abc",
    });
    assert.equal(ready.status, "ready");
  });
});

describe("SQL security invariants", () => {
  it("enables RLS and tenant helpers on customer tables", () => {
    const orgs = readMigration("002_organizations.sql");
    assert.match(orgs, /ENABLE ROW LEVEL SECURITY/);
    assert.match(orgs, /is_org_member/);
    assert.match(orgs, /can_mutate_org/);
    const products = readMigration("003_catalog_products.sql");
    assert.match(products, /organization_id uuid NOT NULL/);
    assert.match(products, /is_org_member\(organization_id\)/);
  });

  it("keeps source records and published passport versions immutable", () => {
    const mi = readMigration("004_material_intelligence.sql");
    assert.match(mi, /source_records are immutable/);
    assert.match(mi, /BEFORE UPDATE ON public.source_records/);
    const passports = readMigration("006_passports.sql");
    assert.match(passports, /published passport versions are immutable/);
  });

  it("restricts suppliers to assigned requests and assigned products", () => {
    const suppliers = readMigration("007_suppliers.sql");
    assert.match(suppliers, /supplier_contributor/);
    assert.match(suppliers, /current_profile_id\(\)/);
    const harden = readMigration("011_tenant_hardening.sql");
    assert.match(harden, /can_view_org_records/);
    assert.match(harden, /supplier_assigned_product/);
    assert.match(harden, /execute_organization_deletion/);
  });

  it("stores API secrets as hashes and separates public passport storage", () => {
    const audit = readMigration("010_audit_security.sql");
    assert.match(audit, /secret_hash/);
    assert.match(audit, /enterprise-passport-public/);
    assert.match(audit, /CREATE TABLE IF NOT EXISTS public.audit_logs/);
    assert.match(audit, /CREATE TABLE IF NOT EXISTS public.activity_events/);
  });

  it("does not let AI interpretations auto-activate regulatory rules", () => {
    const rules = readMigration("008_regulatory_rules.sql");
    assert.match(rules, /interpretation_status/);
    assert.match(rules, /'draft', 'reviewed', 'active', 'superseded'/);
  });
});

describe("Entitlements and snapshot upgrade-in-place", () => {
  it("limits free snapshot to 10 products without full SaaS capabilities", () => {
    const snap = entitlementsForPlan("free_snapshot");
    assert.equal(snap.productAllowance, 10);
    assert.equal(snap.canPublishPassports, false);
    assert.equal(snap.canUseSuppliers, false);
    assert.equal(snap.canUseApi, false);
    const pilot = entitlementsForPlan("founding_pilot");
    assert.equal(pilot.canPublishPassports, true);
    assert.equal(pilot.productAllowance, 500);
  });

  it("does not use reserved HQ slugs for new organizations", () => {
    assert.equal(slugifyOrganizationName("Products"), "products-org");
    assert.equal(slugifyOrganizationName("Acme Fashion"), "acme-fashion");
  });
});

describe("Import preview and validations", () => {
  it("maps messy customer columns and previews 500 rows", () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({
      STYLE_NO: `ST-${i}`,
      MATERIAL_1: i % 2 ? "cotton" : "polyester",
      "MAT%": i % 17 === 0 ? "40" : "100",
      FACTORY_CNTRY: "PT",
      SKU: i % 50 === 0 ? "DUP-1" : `SKU-${i}`,
    }));
    const preview = previewImport(rows);
    assert.equal(preview.rowsDetected, 500);
    assert.equal(preview.mappings.some((m) => m.canonicalField === "style_code"), true);
    assert.equal(preview.mappings.some((m) => m.canonicalField === "composition"), true);
    assert.equal(preview.duplicateRisk > 0, true);
    assert.equal(preview.estimatedNewProducts, 500 - preview.duplicateRisk);
  });

  it("detects invalid percentage totals and identifier collisions", () => {
    assert.equal(compositionPercentTotal([60, 40]).valid, true);
    assert.equal(compositionPercentTotal([60, 30]).valid, false);
    assert.equal(detectIdentifierCollision(["001", "002"], "001"), true);
    assert.equal(detectIdentifierCollision(["001"], "003"), false);
  });
});

describe("Read-only and founder isolation (policy text)", () => {
  it("read-only cannot mutate via can_mutate_org", () => {
    const sql = readMigration("002_organizations.sql");
    assert.match(sql, /NOT IN \('read_only', 'supplier_contributor'\)/);
  });
});
