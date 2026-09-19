import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditCustomerZeroFixtures, auditPassportIntegrity } from "../lib/enterprise/passport-integrity";

describe("passport integrity gate", () => {
  it("passes aligned ITX-LIVE-01 turtleneck fixture", () => {
    const result = auditPassportIntegrity({
      styleCode: "ITX-LIVE-01",
      sku: "P01103203",
      productName: "Turtleneck Wool and Cashmere Top",
      brand: "Róhe",
      category: "Knitwear",
      composition: "70% Wool, 30% Cashmere",
      imageUrl: "/khiteri/live/itx-live-01.jpg",
      traceNodes: [
        { tier_label: "Raw material", facility_name: "Wool and cashmere fiber" },
        { tier_label: "Manufacturing", facility_name: "Knitwear assembly" },
      ],
      journeyStages: [
        { title: "Wool and cashmere fiber", detail: "Natural fiber blend" },
        { title: "Knitwear assembly", detail: "Portugal" },
      ],
    });
    assert.equal(result.status, "valid");
    assert.equal(result.resaleEligible, true);
  });

  it("blocks silk journey on wool product", () => {
    const result = auditPassportIntegrity({
      styleCode: "ITX-LIVE-01",
      sku: "P01103203",
      productName: "Silk Evening Dress",
      brand: "Róhe",
      category: "Knitwear",
      composition: "70% Wool, 30% Cashmere",
      traceNodes: [{ tier_label: "Raw material", facility_name: "Mulberry silk cultivation" }],
      journeyStages: [{ title: "Silk reeling", detail: "Mulberry silk" }],
    });
    assert.equal(result.resaleEligible, false);
    assert.notEqual(result.status, "valid");
  });

  it("audits all 10 Customer Zero fixtures offline", () => {
    const rows = auditCustomerZeroFixtures();
    assert.equal(rows.length, 10);
    const invalid = rows.filter((r) => !r.resaleEligible);
    assert.equal(invalid.length, 0, `Fixtures with conflicts: ${invalid.map((r) => r.fixture.style).join(", ")}`);
  });
});
