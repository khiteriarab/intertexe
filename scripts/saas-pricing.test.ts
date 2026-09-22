import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  PUBLIC_PRICING_PLANS,
  PUBLIC_TO_LEGACY_PLAN,
  LEGACY_TO_PUBLIC_PLAN,
  PRICING_FEATURE_GROUPS,
  formatMonthlyPrice,
  approximateEurFromUsd,
  formatUsd,
} from "../lib/enterprise-marketing/saas-pricing";

describe("Public SaaS pricing presentation", () => {
  it("publishes Foundation, Intelligence, and Enterprise with legacy plan aliases", () => {
    assert.deepEqual(
      PUBLIC_PRICING_PLANS.map((p) => p.id),
      ["foundation", "intelligence", "enterprise"],
    );
    assert.equal(PUBLIC_TO_LEGACY_PLAN.foundation, "professional");
    assert.equal(PUBLIC_TO_LEGACY_PLAN.intelligence, "platform");
    assert.equal(LEGACY_TO_PUBLIC_PLAN.professional, "foundation");
    assert.equal(PUBLIC_PRICING_PLANS[0].monthlyUSD, 499);
    assert.equal(PUBLIC_PRICING_PLANS[1].monthlyUSD, 1_250);
    assert.equal(PUBLIC_PRICING_PLANS[2].monthlyUSD, null);
    assert.equal(PUBLIC_PRICING_PLANS[0].implementationFeeUSD, 1_500);
    assert.equal(PUBLIC_PRICING_PLANS[1].implementationFeeUSD, 3_500);
    assert.match(formatMonthlyPrice(PUBLIC_PRICING_PLANS[0], "USD"), /\$499/);
    assert.equal(formatUsd(1_250), "$1,250");
    assert.equal(approximateEurFromUsd(100), 92);
  });

  it("keeps request CTAs on legacy entitlement keys", () => {
    for (const plan of PUBLIC_PRICING_PLANS) {
      assert.match(plan.cta.href, /\/brands\/request/);
      if (plan.id === "enterprise") {
        assert.match(plan.cta.href, /intent=enterprise/);
      } else {
        assert.match(plan.cta.href, new RegExp(`tier=${plan.legacyPlanKey}`));
      }
    }
  });

  it("includes a multi-category comparison matrix", () => {
    assert.ok(PRICING_FEATURE_GROUPS.length >= 10);
    for (const group of PRICING_FEATURE_GROUPS) {
      for (const row of group.rows) {
        assert.ok("foundation" in row.values);
        assert.ok("intelligence" in row.values);
        assert.ok("enterprise" in row.values);
      }
    }
  });

  it("wires the pricing page to PricingExperience, not the module selector", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/platform/pricing/page.tsx"), "utf8");
    const experience = fs.readFileSync(
      path.join(process.cwd(), "app/platform/pricing/PricingExperience.tsx"),
      "utf8",
    );
    const brands = fs.readFileSync(path.join(process.cwd(), "app/brands/pricing/page.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/platform/pricing/pricing.css"), "utf8");
    const config = fs.readFileSync(
      path.join(process.cwd(), "lib/enterprise-marketing/saas-pricing.ts"),
      "utf8",
    );

    assert.match(page, /PricingExperience/);
    assert.doesNotMatch(page, /PricingModuleSelector/);
    assert.doesNotMatch(page, /isPaddleConfigured/);
    assert.match(experience, /PUBLIC_PRICING_PLANS/);
    assert.match(experience, /PRICING_FEATURE_GROUPS/);
    assert.match(experience, /Show differences only/);
    assert.match(experience, /saas-pricing-plan-tabs/);
    assert.doesNotMatch(experience, /We configure INTERTEXE around your business/);
    assert.doesNotMatch(experience, /saas-pricing-impl/);
    assert.doesNotMatch(experience, /PRICING_IMPLEMENTATION_STAGES/);
    assert.match(experience, /How billing works/);
    assert.equal(PUBLIC_PRICING_PLANS[2].commitmentMonths, 12);
    assert.match(brands, /Foundation, Intelligence, Enterprise/);
    assert.match(css, /\.saas-pricing-card/);
    assert.match(css, /\.saas-pricing-plan-tabs/);
    assert.match(config, /PRICING_IMPLEMENTATION_STAGES/);
    assert.match(config, /Architect & connect/);
    assert.match(config, /not to manually enter your catalogue/);
    assert.match(config, /It is not a fee for us to manually type in your catalogue/);
    assert.match(config, /PRICING_BILLING_POINTS/);
    assert.match(config, /What counts as an active product record/);
    // Implementation fees remain in the comparison matrix, not a separate narrative block.
    assert.match(config, /label: "Implementation & Support"/);
    assert.match(config, /One-time implementation/);
  });
});
