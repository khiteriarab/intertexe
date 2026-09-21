import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { LIFECYCLE_STAGES, SOLUTIONS } from "../app/platform/solutions/solutions-data";

describe("Platform solutions page", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "app/platform/solutions/page.tsx"), "utf8");
  const css = fs.readFileSync(path.join(process.cwd(), "app/platform/solutions/solutions.css"), "utf8");
  const nav = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformNav.tsx"), "utf8");

  it("presents six solutions built on the same governed record", () => {
    assert.equal(SOLUTIONS.length, 6);
    assert.deepEqual(
      SOLUTIONS.map((s) => s.label),
      [
        "Product intelligence",
        "Traceability + compliance",
        "Environmental intelligence",
        "Digital Product Passport",
        "Connected product lifecycle",
        "Supplier data + scorecards",
      ],
    );
    for (const solution of SOLUTIONS) {
      assert.ok(solution.tags.length >= 4, `${solution.key} needs capability tags`);
      assert.ok(solution.description.length < 260, `${solution.key} copy should stay short`);
      assert.ok(solution.icon, `${solution.key} needs a dashboard icon`);
    }
    assert.deepEqual(
      SOLUTIONS.map((s) => s.icon),
      ["core", "issues", "intelligence", "passports", "workflows", "suppliers"],
    );
    assert.deepEqual(
      LIFECYCLE_STAGES.map((s) => s.stage),
      ["Create", "Prove", "Understand", "Publish", "Extend"],
    );
  });

  it("leads with an asymmetric grid rather than six identical boxes", () => {
    assert.match(page, /solution-card--feature|size="feature"/);
    assert.match(page, /solutions-grid-stack/);
    assert.match(page, /solutions-grid--rest/);
    assert.match(page, /solution-card-icon/);
    assert.match(page, /SOLUTION_ICONS|ENT_NAV_ITEM_ICONS|ENT_NAV_GROUP_ICONS/);
    assert.match(css, /\.solutions-grid--rest \{[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(css, /\.solution-card-icon/);
  });

  it("keeps white dominant with beige reserved for the hover accent", () => {
    assert.match(css, /\.solution-card \{[\s\S]*?background: #ffffff/);
    assert.match(css, /\.solution-card:hover \{[\s\S]*?rgba\(244, 239, 230/);
    assert.match(css, /\.solution-card:hover \{[\s\S]*?translateY\(-3px\)/);
    assert.match(css, /\.solution-card:hover \.solution-card-arrow \{[\s\S]*?translateX\(5px\)/);
    assert.match(css, /prefers-reduced-motion/);
  });

  it("closes with conversion CTAs and places consumer delivery on Solutions", () => {
    const close = fs.readFileSync(path.join(process.cwd(), "app/platform/SolutionsClose.tsx"), "utf8");
    assert.match(page, /SolutionsClose/);
    assert.match(page, /SalesDeliverySection/);
    assert.doesNotMatch(page, /One governed record\. Every stage connected\./);
    assert.doesNotMatch(page, /solutions-governed-record\.png/);
    assert.match(close, /One product record\. Every use case connected\./);
    assert.match(close, /Know more/);
    assert.match(close, /Prove more/);
    assert.match(close, /Do more/);
    assert.match(close, /Book a demo/);
    assert.match(close, /Explore pricing/);
    assert.doesNotMatch(page, /Start with the problem you need to solve\./);
    assert.ok(fs.existsSync(path.join(process.cwd(), "public/platform/solutions-governed-record.png")));
    assert.doesNotMatch(page, /workspace-product-record\.png/);
    assert.doesNotMatch(page, /solutions-shot-overlay/);
  });

  it("keeps the public page free of module pricing language", () => {
    const close = fs.readFileSync(path.join(process.cwd(), "app/platform/SolutionsClose.tsx"), "utf8");
    assert.doesNotMatch(page, /module/i);
    assert.doesNotMatch(page, /€/);
    assert.match(close, /Explore pricing/);
  });

  it("keeps navigation to Solutions, Pricing, See it live and Success Stories", () => {
    assert.match(nav, /marketingPath\("solutions"\)|\/brands\/solutions/);
    assert.match(nav, /marketingPath\("pricing"\)|\/brands\/pricing/);
    assert.match(nav, /marketingPath\("demo"\)|\/brands\/demo/);
    assert.match(nav, /marketingPath\("success-stories"\)|\/brands\/success-stories/);
    assert.doesNotMatch(nav, /label: "Platform"/);
    assert.doesNotMatch(nav, /Digital Product Passport/);
    assert.doesNotMatch(nav, /label: "API"/);
  });
});
