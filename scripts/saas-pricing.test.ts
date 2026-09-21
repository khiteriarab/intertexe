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
    assert.match(experience, /Implementation that gets your data ready to work/);
    assert.match(experience, /How billing works/);
    assert.match(brands, /Foundation, Intelligence, Enterprise/);
    assert.match(css, /\.saas-pricing-card/);
    assert.match(css, /\.saas-pricing-plan-tabs/);
    assert.match(config, /PRICING_IMPLEMENTATION_STAGES/);
    assert.match(config, /PRICING_BILLING_POINTS/);
    assert.match(config, /What counts as an active product record/);
  });
});
