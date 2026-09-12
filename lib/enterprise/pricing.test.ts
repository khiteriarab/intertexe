import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOUNDING_PILOT_PRICE_USD,
  PLATFORM_MONTHLY_USD,
  PROFESSIONAL_MONTHLY_USD,
  SAAS_ARR_600K_MODEL,
  saasTierByKey,
} from "./pricing.ts";
import { entitlementsForPlan } from "./entitlements.ts";

describe("enterprise pricing model", () => {
  it("defines onboarding fee and three SaaS tiers", () => {
    assert.equal(FOUNDING_PILOT_PRICE_USD, 5000);
    assert.equal(PLATFORM_MONTHLY_USD, 499);
    assert.equal(PROFESSIONAL_MONTHLY_USD, 1250);
    assert.equal(saasTierByKey("platform").productAllowance, 500);
    assert.equal(saasTierByKey("professional").passportAllowance, 250);
  });

  it("gates headless API to enterprise only", () => {
    assert.equal(entitlementsForPlan("platform").canUseHeadlessApi, false);
    assert.equal(entitlementsForPlan("professional").canWhiteLabel, true);
    assert.equal(entitlementsForPlan("professional").canUseHeadlessApi, false);
    assert.equal(entitlementsForPlan("enterprise").canUseHeadlessApi, true);
  });

  it("models ~58 customers for $600K ARR", () => {
    const mrr = SAAS_ARR_600K_MODEL.mix.reduce((s, r) => s + r.customers * r.monthlyUsd, 0);
    assert.equal(mrr, 49970);
    assert.equal(SAAS_ARR_600K_MODEL.totalCustomers, 58);
  });
});
