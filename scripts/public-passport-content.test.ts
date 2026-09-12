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

  it("exposes sell action in next life when passport is valid", () => {
    const content = buildConsumerPassportContent({
      productName: "God's True Cashmere Brilliant Linen Shirt with Lapis Lazuli",
      brand: "God's True Cashmere",
      category: "Shirt",
      styleCode: "ITX-LIVE-01",
      sku: "P01152404-3",
      publicId: "itx_test",
      snapshotFields: [{ key: "composition", value: "100% Linen" }],
      traceNodes: [
        { tier_label: "Raw material", facility_name: "European flax cultivation" },
        { tier_label: "Manufacturing", facility_name: "Shirt assembly", country_code: "PT" },
      ],
    });
    const sell = content.nextLife.find((item) => item.title === "Sell this item");
    assert.ok(sell);
    assert.equal(sell?.kind, "action");
    assert.equal(sell?.primary, true);
    assert.equal(content.resaleEligible, true);
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

  it("builds full lifecycle from governed trace nodes and public fields", () => {
    const content = buildConsumerPassportContent({
      productName: "Linen Shirt",
      snapshotFields: [
        { key: "composition", value: "100% Linen" },
        { key: "manufacturing_country", value: "PT" },
        { key: "care_instructions", value: "Cold wash · Line dry" },
        { key: "distribution", value: "European distribution" },
        { key: "retail_market", value: "Barcelona" },
      ],
      traceNodes: [
        { tier: 4, tier_label: "Raw material", facility_name: "Flax cultivation", country_code: "FR" },
        { tier: 3, tier_label: "Processing", facility_name: "Linen scutching", country_code: "FR" },
        { tier: 2, tier_label: "Fabric", facility_name: "Woven linen mill", country_code: "IT" },
        { tier: 1, tier_label: "Manufacturing", facility_name: "Shirt assembly", country_code: "PT" },
      ],
    });
    const ids = content.journeyStages.map((s) => s.id);
    assert.ok(ids.includes("raw"));
    assert.ok(ids.includes("fabric"));
    assert.ok(ids.includes("distribution"));
    assert.ok(ids.includes("sale"));
    assert.ok(ids.includes("care"));
    assert.equal(content.journeyStages.find((s) => s.id === "sale")?.location, "Barcelona");
  });
});
