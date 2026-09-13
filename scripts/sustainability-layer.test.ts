import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ConsumerPassportContent } from "../lib/enterprise/public-passport-content";
import { buildEnvironmentalImpact } from "../lib/sustainability/environmental-impact";
import { buildRegulatoryScores } from "../lib/sustainability/regulatory/france-ecobalyse";
import { buildIntertexeProductPassport } from "../lib/sustainability/passport-structure";
import { buildTraceabilityScore } from "../lib/sustainability/traceability-score";

const sampleConsumer: ConsumerPassportContent = {
  productName: "Signature Wool Coat",
  brand: "Toteme",
  category: "Coat",
  color: "Camel",
  identifier: "TX-WOOL-001",
  composition: "100% wool",
  materialBreakdown: [{ fiber: "wool", pct: 100 }],
  manufacturingCountry: "Portugal",
  manufacturer: "Atelier Norte",
  facility: null,
  imageUrl: null,
  passportStatus: "published",
  careInstructions: ["Professional repair available"],
  journeyStages: [],
  nextLife: [],
  timeline: [],
  publicFields: [{ key: "certifications", value: "GOTS" }],
  integrityStatus: "valid",
  resaleEligible: true,
};

describe("sustainability layer", () => {
  it("scores traceability from supply-chain evidence, not vague sustainability", () => {
    const score = buildTraceabilityScore({
      traceNodes: [
        { tier: 4, facility_name: "Wool farm", country_code: "IT", data_status: "provided" },
        { tier: 3, facility_name: "Spinner", country_code: "IT", data_status: "provided" },
        { tier: 2, facility_name: "Weaver Prato", country_code: "IT", data_status: "provided" },
        { tier: 1, facility_name: "Porto assembly", country_code: "PT", data_status: "provided" },
      ],
      publicFields: [{ key: "distribution", value: "France" }],
    });
    assert.ok(score.score >= 50);
    assert.equal(score.methodology, "intertexe_traceability_v1");
    assert.ok(score.verifiedStages.length >= 4);
  });

  it("preserves France Ecobalyse as regulatory score, not custom green score", () => {
    const regulatory = buildRegulatoryScores([
      {
        jurisdiction: "FR",
        regime: "ecobalyse",
        total_points: 742,
        points_per_100g: 215,
        methodology_version: "7.0",
        verification_status: "declared",
      },
    ]);
    assert.equal(regulatory.franceEnvironmentalCost?.totalImpactPoints, 742);
    assert.equal(regulatory.franceEnvironmentalCost?.methodology, "ecobalyse");
  });

  it("builds full passport structure with separate environmental, traceability, circularity", () => {
    const passport = buildIntertexeProductPassport({
      consumer: sampleConsumer,
      publicId: "abc12345",
      traceNodes: [
        { tier: 4, facility_name: "Farm", country_code: "IT", data_status: "provided" },
        { tier: 1, facility_name: "Factory", country_code: "PT", data_status: "provided" },
      ],
      impactInputs: [
        {
          metric_key: "carbon_footprint_kg_co2e",
          value: 18.4,
          unit: "kg CO₂e",
          data_status: "declared",
          methodology: "ecobalyse",
        },
      ],
      regulatoryScores: [
        {
          jurisdiction: "FR",
          regime: "ecobalyse",
          total_points: 742,
          points_per_100g: 215,
          methodology_version: "7.0",
          verification_status: "declared",
        },
      ],
      ownershipCount: 1,
    });

    assert.equal(passport.product.publicId, "abc12345");
    assert.ok(passport.traceability.score > 0);
    assert.equal(passport.environmentalImpact.carbonFootprint?.value, 18.4);
    assert.equal(passport.regulatoryScores.franceEnvironmentalCost?.totalImpactPoints, 742);
    assert.equal(passport.circularity.resaleEligible, true);
    assert.ok(passport.sustainabilityProfile.dimensions.length >= 4);
    assert.ok(passport.materials.naturalFiberShare === 100);
  });

  it("does not invent environmental metrics when inputs are missing", () => {
    const env = buildEnvironmentalImpact({ impactInputs: [], composition: null, category: null });
    assert.equal(env.carbonFootprint, null);
    assert.equal(env.verificationStatus, "missing");
  });
});
