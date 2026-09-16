import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
});
