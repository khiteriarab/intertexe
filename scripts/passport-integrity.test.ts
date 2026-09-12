import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditCustomerZeroFixtures, auditPassportIntegrity } from "../lib/enterprise/passport-integrity";

describe("passport integrity gate", () => {
  it("passes aligned ITX-LIVE-01 linen shirt fixture", () => {
    const result = auditPassportIntegrity({
      styleCode: "ITX-LIVE-01",
      sku: "P01152404-3",
      productName: "God's True Cashmere Brilliant Linen Shirt with Lapis Lazuli",
      brand: "God's True Cashmere",
      category: "Shirt",
      composition: "100% Linen",
      imageUrl: "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/33/P01152404.jpg",
      traceNodes: [
        { tier_label: "Raw material", facility_name: "European flax cultivation" },
        { tier_label: "Manufacturing", facility_name: "Shirt assembly" },
      ],
      journeyStages: [
        { title: "Flax cultivation", detail: "European flax" },
        { title: "Shirt assembly", detail: "Portugal" },
      ],
    });
    assert.equal(result.status, "valid");
    assert.equal(result.resaleEligible, true);
  });

  it("blocks silk journey on linen product", () => {
    const result = auditPassportIntegrity({
      styleCode: "ITX-LIVE-01",
      sku: "P01152404-3",
      productName: "Silk Evening Dress",
      brand: "God's True Cashmere",
      category: "Shirt",
      composition: "100% Linen",
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
