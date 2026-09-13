import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  commercialStatusLabel,
  resolveCommercialAccountStatus,
} from "../lib/enterprise/account-status.ts";

describe("commercial account status", () => {
  it("maps pilot and paid plans for customer SaaS workspaces", () => {
    assert.equal(resolveCommercialAccountStatus({ plan: "demo" }), "pilot");
    assert.equal(resolveCommercialAccountStatus({ plan: "free_snapshot" }), "pilot");
    assert.equal(
      resolveCommercialAccountStatus({ plan: "professional", billingStatus: "active" }),
      "active"
    );
    assert.equal(
      resolveCommercialAccountStatus({ plan: "platform", billingStatus: "past_due" }),
      "past_due"
    );
    assert.equal(resolveCommercialAccountStatus({ plan: "enterprise" }), "enterprise_sales");
  });

  it("labels statuses for billing UI", () => {
    assert.equal(commercialStatusLabel("pilot"), "10-product pilot");
    assert.equal(commercialStatusLabel("active"), "Active subscription");
  });
});
