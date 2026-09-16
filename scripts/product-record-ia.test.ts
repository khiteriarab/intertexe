import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { resolveProductRecordTab } from "../lib/enterprise/product-record-tabs";
import { buildProductLifecycleState } from "../lib/enterprise/product-lifecycle";

describe("product record IA", () => {
  it("maps old product tabs onto the recovered IA", () => {
    assert.equal(resolveProductRecordTab("materials"), "traceability");
    assert.equal(resolveProductRecordTab("suppliers"), "traceability");
    assert.equal(resolveProductRecordTab("history"), "compliance");
    assert.equal(resolveProductRecordTab("circularity"), "circularity");
  });

  it("resolves Create → Prove → Market → Own → Next life", () => {
    assert.equal(buildProductLifecycleState({ hasIdentity: true }).currentId, "create");
    assert.equal(buildProductLifecycleState({ traceabilityPct: 50 }).currentId, "prove");
    assert.equal(buildProductLifecycleState({ passportState: "ready" }).currentId, "market");
    assert.equal(buildProductLifecycleState({ isPublished: true }).currentId, "own");
    assert.equal(buildProductLifecycleState({ resaleEligible: true }).currentId, "next_life");
  });

  it("keeps dashboard CSS balanced and scores on one line", () => {
    const premium = fs.readFileSync(path.join(process.cwd(), "app/dashboard/enterprise-premium.css"), "utf8");
    const intel = fs.readFileSync(path.join(process.cwd(), "app/dashboard/enterprise-product-intel.css"), "utf8");
    assert.equal(premium.split("{").length, premium.split("}").length);
    assert.equal(intel.split("{").length, intel.split("}").length);
    assert.match(premium, /--ent-canvas: #ffffff/);
    assert.match(premium, /--ent-canvas-muted: #fbfbf9/);
    assert.match(premium, /\.ent-key-indicator-score \{[\s\S]*white-space: nowrap/);
    assert.match(intel, /\.ent-product-metric-value \{[\s\S]*white-space: nowrap/);
  });
});
