import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  paddlePlanByPriceId,
  verifyPaddleWebhookSignature,
  defaultCheckoutPriceForPlan,
} from "../lib/enterprise/paddle.ts";
import { canAddProducts, entitlementsForPlan } from "../lib/enterprise/entitlements.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Enterprise Paddle billing Phase C", () => {
  it("migration 022 adds Paddle columns on billing_accounts", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "enterprise/supabase/migrations/022_paddle_billing.sql"),
      "utf8"
    );
    assert.match(sql, /paddle_customer_id/);
    assert.match(sql, /paddle_subscription_id/);
  });

  it("maps configured price IDs to plan entitlements", () => {
    const prev = process.env.PADDLE_PRICE_FOUNDING_PILOT;
    process.env.PADDLE_PRICE_FOUNDING_PILOT = "pri_test_founding";
    const meta = paddlePlanByPriceId("pri_test_founding");
    process.env.PADDLE_PRICE_FOUNDING_PILOT = prev;
    assert.equal(meta?.plan, "founding_pilot");
    assert.equal(meta?.passportAllowance, 100);
  });

  it("verifies Paddle webhook signatures", () => {
    const secret = "test_webhook_secret";
    const body = JSON.stringify({ event_type: "subscription.created" });
    const ts = "1234567890";
    const h1 = crypto.createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
    assert.equal(
      verifyPaddleWebhookSignature(body, `ts=${ts};h1=${h1}`, secret),
      true
    );
    assert.equal(verifyPaddleWebhookSignature(body, `ts=${ts};h1=bad`, secret), false);
  });

  it("wires product allowance gate in pipeline import", () => {
    const pipeline = fs.readFileSync(path.join(ROOT, "lib/enterprise/pipeline.ts"), "utf8");
    assert.match(pipeline, /assertCanAddProducts/);
    assert.match(pipeline, /recordProductsImported/);
  });

  it("free_snapshot blocks new products at allowance", () => {
    const ent = entitlementsForPlan("free_snapshot");
    assert.equal(canAddProducts(ent, 10), false);
    assert.equal(canAddProducts(ent, 9), true);
  });

  it("exposes default checkout price helper", () => {
    const prev = process.env.PADDLE_PRICE_FOUNDING_PILOT;
    process.env.PADDLE_PRICE_FOUNDING_PILOT = "pri_founding";
    assert.equal(defaultCheckoutPriceForPlan("founding_pilot"), "pri_founding");
    process.env.PADDLE_PRICE_FOUNDING_PILOT = prev;
  });
});
