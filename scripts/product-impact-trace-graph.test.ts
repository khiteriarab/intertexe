import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProductTraceabilityGraph } from "../lib/enterprise/product-traceability-graph";
import {
  buildProductImpactScores,
  simulateProductImpactScores,
  DEFAULT_SIMULATION_INPUTS,
} from "../lib/enterprise/product-impact-scores";
import type { ProductTraceability } from "../lib/enterprise/traceability";

const sampleTraceability: ProductTraceability = {
  productId: "p1",
  completenessPct: 25,
  knownTierCount: 1,
  missingTierLabels: ["Tier 2", "Tier 3", "Tier 4"],
  warnings: ["Upstream tiers missing"],
  tiers: [
    {
      tier: 1,
      label: "Tier 1 · Manufacturer",
      role: "Garment assembly",
      status: "known",
      facility: "Factory A",
      country: "PT",
      countryCode: "PT",
      supplierId: null,
      supplierName: null,
      evidenceStatus: "verified",
      sourceRecordId: null,
      confidence: 0.9,
      nodeId: "n1",
    },
    {
      tier: 2,
      label: "Tier 2 · Supplier",
      role: "Fabric",
      status: "not_provided",
      facility: null,
      country: null,
      countryCode: null,
      supplierId: null,
      supplierName: null,
      evidenceStatus: null,
      sourceRecordId: null,
      confidence: null,
      nodeId: null,
    },
    {
      tier: 3,
      label: "Tier 3 · Material processor",
      role: "Processing",
      status: "not_provided",
      facility: null,
      country: null,
      countryCode: null,
      supplierId: null,
      supplierName: null,
      evidenceStatus: null,
      sourceRecordId: null,
      confidence: null,
      nodeId: null,
    },
    {
      tier: 4,
      label: "Tier 4 · Raw material",
      role: "Fiber",
      status: "not_provided",
      facility: null,
      country: null,
      countryCode: null,
      supplierId: null,
      supplierName: null,
      evidenceStatus: null,
      sourceRecordId: null,
      confidence: null,
      nodeId: null,
    },
  ],
};

describe("product traceability graph", () => {
  it("orders upstream tiers above the finished product", () => {
    const graph = buildProductTraceabilityGraph(sampleTraceability, "Down Jacket");
    assert.equal(graph.nodes[0].tier, 4);
    assert.equal(graph.nodes[graph.nodes.length - 1].kind, "product");
    assert.equal(graph.nodes[graph.nodes.length - 1].label, "Down Jacket");
    assert.ok(graph.edges.length >= 4);
  });
});

describe("product impact scores", () => {
  it("builds PEF, French cost, climate, and stacked segments", () => {
    const scores = buildProductImpactScores({
      productName: "Down Jacket",
      weightGrams: 900,
      traceability: sampleTraceability,
      impactReadiness: null,
      composition: "70% polyamide",
    });
    assert.ok(scores.pefSingleScore > 0);
    assert.ok(scores.frenchEnvironmentalCost > 0);
    assert.ok(scores.climateKgCo2e > 0);
    assert.equal(scores.segments.length, 7);
    assert.equal(
      scores.segments.reduce((sum, s) => sum + s.sharePct, 0),
      100
    );
    assert.match(scores.insights[0], /largest contributor/i);
  });

  it("simulation changes climate impact for recycled blend", () => {
    const baseline = buildProductImpactScores({
      traceability: sampleTraceability,
      impactReadiness: null,
    });
    const simulated = simulateProductImpactScores(baseline, {
      ...DEFAULT_SIMULATION_INPUTS,
      materialComposition: "recycled_blend",
    });
    assert.ok(simulated.climateKgCo2e < baseline.climateKgCo2e);
    assert.ok(simulated.pefSingleScore < baseline.pefSingleScore);
  });
});
