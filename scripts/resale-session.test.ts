import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildListingDraftFromPassport } from "../lib/resale/listing-draft";
import { buildResaleIntelligence } from "../lib/resale/intelligence";
import { buildResaleRoutes } from "../lib/resale/routes";
import type { ConsumerPassportContent } from "../lib/enterprise/public-passport-content";

const sampleConsumer: ConsumerPassportContent = {
  productName: "Signature Wool Coat",
  brand: "Toteme",
  category: "Coat",
  color: "Camel",
  identifier: "TX-WOOL-001",
  composition: "100% wool",
  materialBreakdown: [{ fiber: "wool", pct: 100 }],
  manufacturingCountry: "Portugal",
  manufacturer: null,
  facility: null,
  imageUrl: null,
  passportStatus: "published",
  careInstructions: null,
  journeyStages: [],
  nextLife: [],
  timeline: [],
  publicFields: [{ key: "original_retail", value: "790" }],
  integrityStatus: "valid",
  resaleEligible: true,
};

describe("resale intelligence", () => {
  it("estimates value with retention for wool coat", () => {
    const v = buildResaleIntelligence(sampleConsumer);
    assert.ok(v.estimatedValue > 0);
    assert.ok(v.valueLow <= v.estimatedValue);
    assert.ok(v.valueHigh >= v.estimatedValue);
    assert.equal(v.originalRetail, 790);
    assert.ok(v.valueRetentionPct != null && v.valueRetentionPct > 0);
  });

  it("builds compared resale routes", () => {
    const v = buildResaleIntelligence(sampleConsumer);
    const routes = buildResaleRoutes(v, sampleConsumer.brand);
    assert.ok(routes.length >= 3);
    assert.ok(routes.some((r) => r.routeKind === "marketplace_listing"));
    assert.ok(routes.some((r) => r.routeKind === "instant_buyout"));
    assert.ok(routes.some((r) => r.routeKind === "brand_trade_in"));
    assert.equal(routes.filter((r) => r.recommended).length, 1);
  });

  it("generates passport-backed listing draft", () => {
    const v = buildResaleIntelligence(sampleConsumer);
    const draft = buildListingDraftFromPassport({
      consumer: sampleConsumer,
      publicId: "abc123",
      conditionGrade: "excellent",
      askingPrice: v.estimatedValue,
      currency: v.currency,
      consumerPhotos: ["https://example.com/photo.jpg"],
    });
    assert.match(draft.title, /Toteme/);
    assert.match(draft.description, /100% wool/);
    assert.match(draft.description, /Portugal/);
    assert.match(draft.description, /Passport/);
    assert.equal(draft.publicId, "abc123");
  });
});
