import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { parseCsv } from "../lib/enterprise/csv.ts";
import {
  ENTERPRISE_LATER_NAV,
  ENTERPRISE_PILOT_NAV,
  enterpriseNavForActor,
} from "../lib/enterprise/constants.ts";
import {
  classifyIdentifierMatch,
  identifierClassLabel,
  planIdentifierRows,
  snapshotFromMapped,
} from "../lib/enterprise/identity-reconciliation.ts";
import { mappingForPreview, previewImportWithCatalog } from "../lib/enterprise/import-preview.ts";
import {
  displayReviewerName,
  looksLikeDatabaseId,
} from "../lib/enterprise/reviewer-display.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Identifier reconciliation", () => {
  it("auto-merges only deterministic same-product matches", () => {
    assert.equal(
      classifyIdentifierMatch(
        { name: "A", sku: "SKU-1", gtin: "123", style: "", variant: "" },
        { name: "A", sku: "SKU-1", gtin: "123", style: "", variant: "" }
      ),
      "same_product"
    );
    assert.equal(
      classifyIdentifierMatch(
        { name: "Dress A", sku: "ATL-DRS-008", gtin: "5601234567890", style: "ATL-08", variant: "Black" },
        { name: "Dress B", sku: "ATL-DRS-009", gtin: "5601234567890", style: "ATL-09", variant: "Black" }
      ),
      "ambiguous_collision"
    );
    assert.equal(
      classifyIdentifierMatch(
        { name: "Navy", sku: "SKU-NAVY", gtin: "1", style: "STYLE-1", variant: "Navy" },
        { name: "Black", sku: "SKU-BLK", gtin: "2", style: "STYLE-1", variant: "Black" }
      ),
      "possible_variant"
    );
  });

  it("does not auto-merge on style code alone", () => {
    const fates = planIdentifierRows(
      [
        snapshotFromMapped({ name: "One", sku: "A", style_code: "ST-1", variant: "Black" }, { rowIndex: 0 }),
        snapshotFromMapped({ name: "Two", sku: "B", style_code: "ST-1", variant: "Navy" }, { rowIndex: 1 }),
      ],
      []
    );
    assert.equal(fates[0].action, "create");
    assert.equal(fates[1].action, "create_with_collision");
    assert.equal(fates[1].classification, "possible_variant");
    assert.equal(fates[1].matchOn, "style");
  });

  it("keeps Atlas duplicate GTINs as two products with an ambiguous collision", () => {
    const csv = fs.readFileSync(path.join(ROOT, "scripts/fixtures/atlas-atelier-10-products.csv"), "utf8");
    const parsed = parseCsv(csv);
    const { mapping } = mappingForPreview(parsed.columns);
    const preview = previewImportWithCatalog(parsed.rows, mapping, new Set());
    assert.equal(preview.estimatedNewProducts, 10);
    assert.equal(preview.estimatedUpdates, 0);
    assert.equal(preview.duplicateRisk, 1);
    const collision = preview.reconciliations.find((row) => row.action === "create_with_collision");
    assert.ok(collision);
    assert.equal(collision?.classification, "ambiguous_collision");
    assert.equal(collision?.matchOn, "gtin");
    assert.equal(collision?.identifierValue, "5601234567890");
    assert.match(preview.parsingWarnings.join("\n"), /Ambiguous identifier collision/);
    assert.match(preview.parsingWarnings.join("\n"), /Kept as a separate product/);
  });
});

describe("Reviewer identity", () => {
  it("never uses a raw or truncated UUID as the display name", () => {
    assert.equal(looksLikeDatabaseId("b7dd87e0-a2e1-4312-aac8-35a52ae29fc1"), true);
    assert.equal(looksLikeDatabaseId("b7dd87e0"), true);
    assert.equal(displayReviewerName({ fullName: "Maya Chen", email: "maya@atlas-atelier.example.invalid" }), "Maya Chen");
    assert.equal(
      displayReviewerName({ fullName: "b7dd87e0-a2e1-4312-aac8-35a52ae29fc1", email: "maya@brand.example" }),
      "maya@brand.example"
    );
    assert.equal(displayReviewerName({ fullName: "b7dd87e0", email: null }), "Unknown reviewer");
    const productPage = fs.readFileSync(
      path.join(ROOT, "app/dashboard/(org)/[organization]/products/[productId]/page.tsx"),
      "utf8"
    );
    assert.doesNotMatch(productPage, /reviewer_id \? String\(field\.reviewer_id\)\.slice/);
    assert.match(productPage, /formatReviewerLine/);
  });
});

describe("Enterprise navigation", () => {
  it("exposes all platform modules without later badges", () => {
    const nav = enterpriseNavForActor(false).map((item) => item.label);
    assert.deepEqual(nav, [
      "Overview",
      "Products",
      "Issues",
      "Passports",
      "Settings",
      "Suppliers",
      "Regulations",
      "Benchmarking",
      "Analytics",
      "Integrations",
      "Developers",
      "Files",
      "Activity",
    ]);
    assert.equal(enterpriseNavForActor(true).length, nav.length);
    assert.equal(ENTERPRISE_PILOT_NAV.length, 5);
    assert.ok(ENTERPRISE_LATER_NAV.length >= 8);
    assert.equal(identifierClassLabel("ambiguous_collision"), "Ambiguous identifier collision");
  });
});
