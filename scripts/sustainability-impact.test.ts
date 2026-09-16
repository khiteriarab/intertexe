import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHeadlessProductPayload } from "../lib/enterprise/headless-product-payload";
import { providerAttribution } from "../lib/sustainability/providers";
import { worldlyProvider } from "../lib/sustainability/providers/worldly";

describe("sustainability impact architecture", () => {
  it("worldly attribution references Higg", () => {
    assert.equal(worldlyProvider.sourceAttribution("Higg MSI"), "Source: Worldly / Higg MSI");
  });

  it("headless payload separates traceability from environmental scores", () => {
    const payload = buildHeadlessProductPayload({
      product: {
        id: "p1",
        name: "Linen Shirt",
        sku: "SKU-1",
        style_code: "ITX-LIVE-01",
        category: "Shirt",
        passport_state: "ready",
      },
      impact: {
        productId: "p1",
        environmentalImpact: { carbon: { value: 8.4, unit: "kg CO2e" } },
        impactAssessments: [
          {
            provider: "green_story",
            methodology: "Product LCA",
            methodologyVersion: "2024.1",
            score: 8.4,
            unit: "kg CO2e",
            scope: "Cradle-to-gate",
            measuredShare: 74,
            estimatedShare: 26,
            confidence: 88,
            calculatedAt: "2026-03-10T09:00:00Z",
            sourceReference: "gs-001",
          },
        ],
        sustainabilityScores: [
          {
            type: "french_environmental_cost",
            provider: "green_story",
            value: 451,
            unit: "pts",
            market: "FR",
            status: "verified",
            label: "French Coût Environnemental",
          },
          {
            type: "intertexe_traceability",
            provider: "intertexe",
            value: 82,
            unit: "/100",
            status: "verified",
            label: "INTERTEXE Traceability Score",
          },
        ],
      },
      traceabilityScore: {
        score: 82,
        supplyChainRecordCount: 4,
        certificateCount: 2,
        verifiedStages: [],
        unverifiedStages: [],
      },
    });

    assert.equal(payload.environmentalImpact?.carbon?.value, 8.4);
    assert.equal(payload.sustainabilityScores.length, 2);
    assert.equal(payload.traceabilityScore?.score, 82);
    assert.notEqual(
      payload.sustainabilityScores.find((s) => s.type === "intertexe_traceability")?.value,
      payload.environmentalImpact?.carbon?.value
    );
  });

  it("provider attribution is never generic INTERTEXE score for external providers", () => {
    assert.match(providerAttribution("green_story", "Product LCA"), /Green Story/);
  });
});
