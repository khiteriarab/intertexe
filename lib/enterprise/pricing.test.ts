import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ONBOARDING_FEE_USD_DEFAULT,
  PLATFORM_MONTHLY_USD,
  PROFESSIONAL_MONTHLY_USD,
  SAAS_ARR_600K_MODEL,
  resolveOnboardingFeeUsd,
  saasTierByKey,
} from "./pricing.ts";
import { entitlementsForPlan } from "./entitlements.ts";

describe("enterprise pricing model", () => {
  it("defines onboarding fee and three SaaS tiers", () => {
    assert.equal(resolveOnboardingFeeUsd(), ONBOARDING_FEE_USD_DEFAULT);
    assert.equal(PROFESSIONAL_MONTHLY_USD, 499);
    assert.equal(PLATFORM_MONTHLY_USD, 1250);
    assert.equal(saasTierByKey("professional").productAllowance, 500);
    assert.equal(saasTierByKey("platform").productAllowance, 2000);
    assert.equal(saasTierByKey("platform").passportAllowance, 2000);
  });

  it("gates headless API to enterprise only", () => {
    assert.equal(entitlementsForPlan("platform").canUseHeadlessApi, false);
    assert.equal(entitlementsForPlan("professional").canWhiteLabel, false);
    assert.equal(entitlementsForPlan("platform").canWhiteLabel, true);
    assert.equal(entitlementsForPlan("professional").canUseHeadlessApi, false);
    assert.equal(entitlementsForPlan("enterprise").canUseHeadlessApi, true);
  });

  it("models ~58 customers for $600K ARR", () => {
    const mrr = SAAS_ARR_600K_MODEL.mix.reduce((s, r) => s + r.customers * r.monthlyUsd, 0);
    assert.equal(mrr, 49970);
    assert.equal(SAAS_ARR_600K_MODEL.totalCustomers, 58);
  });
});
