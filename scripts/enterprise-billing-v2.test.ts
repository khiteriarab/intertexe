import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import {
  checkUsageAllowance,
  canAddProducts,
  canPublishNewPassport,
  entitlementsForPlan,
  getOrganizationEntitlements,
  organizationCan,
  organizationLimit,
} from "../lib/enterprise/entitlements.ts";
import {
  billingAllowsNewResources,
  billingPreservesPublicPassports,
  isOverLimit,
} from "../lib/enterprise/billing-lifecycle.ts";
import { planDefinition, planLimit } from "../lib/enterprise/plans.ts";
import {
  paddlePlanByPriceId,
  verifyPaddleWebhookSignature,
} from "../lib/enterprise/paddle.ts";

describe("billing entitlements v2", () => {
  it("A — demo org can create products 1–10; 11th blocked", () => {
    const ent = entitlementsForPlan("demo");
    assert.equal(ent.productAllowance, 10);
    for (let i = 0; i < 10; i++) assert.equal(canAddProducts(ent, i), true);
    assert.equal(canAddProducts(ent, 10), false);
  });

  it("B — Intelligence (platform) org can create up to 10,000; 10,001st blocked", () => {
    const ent = entitlementsForPlan("platform");
    assert.equal(canAddProducts(ent, 9_999), true);
    assert.equal(canAddProducts(ent, 10_000), false);
  });

  it("C — Foundation (professional) org can create up to 2,500; 2,501st blocked", () => {
    const ent = entitlementsForPlan("professional");
    assert.equal(canAddProducts(ent, 2_499), true);
    assert.equal(canAddProducts(ent, 2_500), false);
  });

  it("D — republish does not consume extra hosted passport allowance", () => {
    const ent = entitlementsForPlan("demo");
    assert.equal(canPublishNewPassport(ent, 10, true), true);
    assert.equal(canPublishNewPassport(ent, 10, false), false);
  });

  it("F — wrong Paddle price cannot activate another plan", () => {
    const prev = {
      foundation: process.env.PADDLE_PRICE_FOUNDATION,
      intelligence: process.env.PADDLE_PRICE_INTELLIGENCE,
      platform: process.env.PADDLE_PRICE_PLATFORM,
      pro: process.env.PADDLE_PRICE_PROFESSIONAL,
    };
    delete process.env.PADDLE_PRICE_FOUNDATION;
    delete process.env.PADDLE_PRICE_INTELLIGENCE;
    process.env.PADDLE_PRICE_PLATFORM = "pri_platform_only";
    process.env.PADDLE_PRICE_PROFESSIONAL = "pri_pro_only";
    assert.equal(paddlePlanByPriceId("pri_platform_only")?.plan, "professional");
    assert.equal(paddlePlanByPriceId("pri_platform_only")?.publicName, "Foundation");
    assert.equal(paddlePlanByPriceId("pri_platform_only")?.productAllowance, 2_500);
    assert.equal(paddlePlanByPriceId("pri_pro_only")?.plan, "platform");
    assert.equal(paddlePlanByPriceId("pri_pro_only")?.publicName, "Intelligence");
    assert.equal(paddlePlanByPriceId("pri_pro_only")?.productAllowance, 10_000);
    assert.equal(paddlePlanByPriceId("pri_unknown"), null);
    process.env.PADDLE_PRICE_FOUNDATION = prev.foundation;
    process.env.PADDLE_PRICE_INTELLIGENCE = prev.intelligence;
    process.env.PADDLE_PRICE_PLATFORM = prev.platform;
    process.env.PADDLE_PRICE_PROFESSIONAL = prev.pro;
  });

  it("I — downgrade over limit preserves data semantics (overLimit flag)", () => {
    const ent = entitlementsForPlan("platform");
    const usage = checkUsageAllowance(ent, "products", 12_000, 1);
    assert.equal(usage.overLimit, true);
    assert.equal(usage.allowed, false);
    assert.equal(isOverLimit(12_000, 10_000), true);
  });

  it("J — past_due grace allows reads; restricted blocks new resources", () => {
    const graceEnd = new Date(Date.now() + 86400000).toISOString();
    assert.equal(billingAllowsNewResources({ billing_status: "past_due", grace_period_until: graceEnd }), true);
    assert.equal(
      billingAllowsNewResources({ billing_status: "grace_period", grace_period_until: graceEnd }),
      true
    );
    assert.equal(
      billingAllowsNewResources({
        billing_status: "past_due",
        grace_period_until: new Date(Date.now() - 86400000).toISOString(),
      }),
      false
    );
    assert.equal(billingAllowsNewResources({ billing_status: "restricted" }), false);
  });

  it("K — enterprise manual entitlement works without Paddle", () => {
    const ent = getOrganizationEntitlements({
      plan: "enterprise",
      productAllowance: 50_000,
      passportAllowance: 25_000,
    });
    assert.equal(planDefinition("enterprise").billingProvider, "manual");
    assert.equal(ent.productAllowance, 50_000);
    assert.equal(organizationCan(ent, "sso"), true);
    assert.equal(organizationCan(ent, "headless_api"), true);
  });

  it("L — demo works with no Paddle customer", () => {
    const def = planDefinition("demo");
    assert.equal(def.billingProvider, null);
    assert.equal(def.maxProducts, 10);
    assert.equal(def.maxHostedPassports, 10);
  });

  it("centralized helpers — organizationCan and organizationLimit", () => {
    const pro = entitlementsForPlan("professional");
    assert.equal(organizationCan(pro, "white_label"), false);
    assert.equal(organizationCan(pro, "circularity"), false);
    assert.equal(organizationCan(pro, "sso"), false);
    assert.equal(organizationCan(pro, "api_access"), false);
    assert.equal(organizationLimit(pro, "products"), 2_500);

    const platform = entitlementsForPlan("platform");
    assert.equal(organizationCan(platform, "white_label"), true);
    assert.equal(organizationCan(platform, "circularity"), true);
    assert.equal(organizationCan(platform, "api_access"), true);
    assert.equal(planLimit("platform", "hosted_passports"), 10_000);
  });

  it("N — public passports preserved during billing restriction policy", () => {
    assert.equal(billingPreservesPublicPassports({ billing_status: "restricted" }), true);
    assert.equal(billingPreservesPublicPassports({ billing_status: "past_due" }), true);
  });

  it("verifies Paddle webhook signatures", () => {
    const secret = "test_webhook_secret";
    const body = JSON.stringify({ event_type: "subscription.created", event_id: "evt_1" });
    const ts = "1234567890";
    const h1 = crypto.createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
    assert.equal(verifyPaddleWebhookSignature(body, `ts=${ts};h1=${h1}`, secret), true);
  });
});
