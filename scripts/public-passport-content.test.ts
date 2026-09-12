import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildConsumerPassportContent } from "../lib/enterprise/public-passport-content";

describe("public passport content — data integrity", () => {
  it("does not invent care instructions when absent", () => {
    const content = buildConsumerPassportContent({
      productName: "Test Shirt",
      sku: "P01161440-7",
      styleCode: "ITX-LIVE-10",
      snapshotFields: [{ key: "composition", value: "100% cotton" }],
    });
    assert.equal(content.careInstructions, null);
  });

  it("uses explicit care instructions when present", () => {
    const content = buildConsumerPassportContent({
      productName: "Test",
      snapshotFields: [{ key: "care_instructions", value: "Hand wash cold. Line dry." }],
    });
    assert.ok(content.careInstructions?.includes("Hand wash cold"));
  });

  it("resolves pilot product image from fixture", () => {
    const content = buildConsumerPassportContent({
      styleCode: "ITX-LIVE-08",
      sku: "P01060555-4",
    });
    assert.ok(content.imageUrl?.includes("mytheresa.com"));
  });

  it("labels next life as guidance not brand programs", () => {
    const content = buildConsumerPassportContent({ productName: "Test" });
    assert.ok(content.nextLife.every((item) => item.kind === "guidance"));
  });

  it("marks unavailable manufacturing when no data", () => {
    const content = buildConsumerPassportContent({
      productName: "Test",
      snapshotFields: [],
      traceNodes: [],
    });
    const mfg = content.journeyStages.find((s) => s.id === "manufacturing");
    assert.equal(mfg?.status, "unavailable");
  });
});
