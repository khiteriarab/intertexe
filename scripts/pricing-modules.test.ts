import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  PRICING_MODULES,
  estimateModules,
  formatEur,
  paddlePriceIdForModule,
  pricingModuleByKey,
} from "../lib/enterprise/pricing-modules";

describe("Modular license pricing", () => {
  it("publishes the six license modules with annual starting figures in EUR", () => {
    assert.equal(PRICING_MODULES.length, 6);
    assert.equal(pricingModuleByKey("product_intelligence")?.startingEur, 3_000);
    assert.equal(pricingModuleByKey("traceability_compliance")?.startingEur, 5_000);
    assert.equal(pricingModuleByKey("environmental_intelligence")?.startingEur, 5_000);
    assert.equal(pricingModuleByKey("digital_product_passport")?.startingEur, 3_000);
    assert.equal(pricingModuleByKey("connected_lifecycle")?.startingEur, null);
    assert.equal(pricingModuleByKey("supplier_scorecards")?.startingEur, 3_000);
    assert.equal(formatEur(11_000), "€11,000");
  });

  it("totals only priced modules and flags proposal-scoped selections", () => {
    const empty = estimateModules([]);
    assert.equal(empty.totalEur, 0);
    assert.equal(empty.requiresProposal, false);

    const priced = estimateModules(["product_intelligence", "traceability_compliance"]);
    assert.equal(priced.totalEur, 8_000);
    assert.equal(priced.requiresProposal, false);

    const mixed = estimateModules(["product_intelligence", "connected_lifecycle"]);
    assert.equal(mixed.totalEur, 3_000);
    assert.equal(mixed.requiresProposal, true);
    assert.deepEqual(mixed.customKeys, ["connected_lifecycle"]);

    assert.equal(estimateModules(["not_a_module"]).totalEur, 0);
  });

  it("resolves Paddle price IDs from env without inventing them", () => {
    delete process.env.PADDLE_PRICE_MODULE_PRODUCT_INTELLIGENCE;
    delete process.env.PADDLE_PRICE_MODULE_MAP_JSON;
    assert.equal(paddlePriceIdForModule("product_intelligence"), null);

    process.env.PADDLE_PRICE_MODULE_PRODUCT_INTELLIGENCE = "pri_test_direct";
    assert.equal(paddlePriceIdForModule("product_intelligence"), "pri_test_direct");
    delete process.env.PADDLE_PRICE_MODULE_PRODUCT_INTELLIGENCE;

    process.env.PADDLE_PRICE_MODULE_MAP_JSON = JSON.stringify({ product_intelligence: "pri_test_map" });
    assert.equal(paddlePriceIdForModule("product_intelligence"), "pri_test_map");
    delete process.env.PADDLE_PRICE_MODULE_MAP_JSON;
  });

  it("renders a stackable selector rather than a tiered table", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/platform/pricing/page.tsx"), "utf8");
    const selector = fs.readFileSync(
      path.join(process.cwd(), "app/platform/pricing/PricingModuleSelector.tsx"),
      "utf8",
    );
    const css = fs.readFileSync(path.join(process.cwd(), "app/platform/pricing/pricing.css"), "utf8");
    const nav = fs.readFileSync(path.join(process.cwd(), "app/platform/PlatformNav.tsx"), "utf8");

    assert.match(page, /PricingModuleSelector/);
    assert.match(page, /isPaddleConfigured/);
    assert.match(selector, /aria-checked/);
    assert.match(selector, /Get custom proposal/);
    assert.match(selector, /estimateModules/);
    assert.doesNotMatch(selector, /SAAS_TIERS/);
    assert.match(css, /\.pricing-config-row\.is-selected \{[\s\S]*?var\(--platform-accent-soft\)/);
    assert.match(nav, /\/platform\/pricing/);
  });

  it("guards the public checkout route", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/api/platform/pricing/checkout/route.ts"),
      "utf8",
    );
    assert.match(route, /isPaddleConfigured/);
    assert.match(route, /requiresProposal/);
    assert.match(route, /paddlePriceIdForModule/);
    assert.match(route, /createPaddleModuleCheckout/);
  });
});
