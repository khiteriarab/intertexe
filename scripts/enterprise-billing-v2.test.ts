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

  it("B — platform org can create up to 2,000; 2,001st blocked", () => {
    const ent = entitlementsForPlan("platform");
    assert.equal(canAddProducts(ent, 1999), true);
    assert.equal(canAddProducts(ent, 2000), false);
  });

  it("C — professional org can create up to 500; 501st blocked", () => {
    const ent = entitlementsForPlan("professional");
    assert.equal(canAddProducts(ent, 499), true);
    assert.equal(canAddProducts(ent, 500), false);
  });

  it("D — republish does not consume extra hosted passport allowance", () => {
    const ent = entitlementsForPlan("demo");
    assert.equal(canPublishNewPassport(ent, 10, true), true);
    assert.equal(canPublishNewPassport(ent, 10, false), false);
  });

  it("F — wrong Paddle price cannot activate another plan", () => {
    const prev = {
      platform: process.env.PADDLE_PRICE_PLATFORM,
      pro: process.env.PADDLE_PRICE_PROFESSIONAL,
    };
    process.env.PADDLE_PRICE_PLATFORM = "pri_platform_only";
    process.env.PADDLE_PRICE_PROFESSIONAL = "pri_pro_only";
    assert.equal(paddlePlanByPriceId("pri_platform_only")?.plan, "professional");
    assert.equal(paddlePlanByPriceId("pri_pro_only")?.plan, "platform");
    assert.equal(paddlePlanByPriceId("pri_unknown"), null);
    process.env.PADDLE_PRICE_PLATFORM = prev.platform;
    process.env.PADDLE_PRICE_PROFESSIONAL = prev.pro;
  });

  it("I — downgrade over limit preserves data semantics (overLimit flag)", () => {
    const ent = entitlementsForPlan("platform");
    const usage = checkUsageAllowance(ent, "products", 2500, 1);
    assert.equal(usage.overLimit, true);
    assert.equal(usage.allowed, false);
    assert.equal(isOverLimit(2500, 2000), true);
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
    assert.equal(organizationLimit(pro, "products"), 500);

    const platform = entitlementsForPlan("platform");
    assert.equal(organizationCan(platform, "white_label"), true);
    assert.equal(organizationCan(platform, "circularity"), true);
    assert.equal(planLimit("platform", "hosted_passports"), 2000);
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
