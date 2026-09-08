import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { entitlementsForPlan } from "../lib/enterprise/entitlements.ts";
import { publicResolverUrl } from "../lib/enterprise/carriers.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Enterprise data carriers Phase B", () => {
  it("extends data_carriers in migration 021 (no new table)", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "enterprise/supabase/migrations/021_data_carriers_lifecycle.sql"),
      "utf8"
    );
    assert.match(sql, /ALTER TABLE public\.data_carriers/);
    assert.match(sql, /state text NOT NULL DEFAULT 'active'/);
    assert.match(sql, /data_carriers_one_active_per_type/);
    assert.doesNotMatch(sql, /CREATE TABLE.*product_data_carriers/i);
  });

  it("adds Stripe-ready columns on billing_accounts", () => {
    const sql = fs.readFileSync(
      path.join(ROOT, "enterprise/supabase/migrations/021_data_carriers_lifecycle.sql"),
      "utf8"
    );
    assert.match(sql, /stripe_customer_id/);
    assert.match(sql, /stripe_subscription_id/);
  });

  it("publish.ts uses billing gate and carrier sync (not blind insert)", () => {
    const publish = fs.readFileSync(path.join(ROOT, "lib/enterprise/publish.ts"), "utf8");
    assert.match(publish, /assertCanPublishPassport/);
    assert.match(publish, /syncQrCarrierOnPublish/);
    assert.match(publish, /recordPassportPublished/);
    assert.doesNotMatch(publish, /\.from\("data_carriers"\)\.insert\(/);
  });

  it("product page includes carrier panel in sidebar", () => {
    const page = fs.readFileSync(
      path.join(ROOT, "app/dashboard/(org)/[organization]/products/[productId]/page.tsx"),
      "utf8"
    );
    assert.match(page, /ProductCarriersPanel/);
  });

  it("public resolver accepts carrier attribution", () => {
    const resolver = fs.readFileSync(path.join(ROOT, "lib/enterprise/public-resolver.ts"), "utf8");
    assert.match(resolver, /carrierId/);
  });

  it("free_snapshot cannot publish; founding_pilot can", () => {
    assert.equal(entitlementsForPlan("free_snapshot").canPublishPassports, false);
    assert.equal(entitlementsForPlan("founding_pilot").canPublishPassports, true);
    assert.equal(entitlementsForPlan("founding_pilot").passportAllowance, 100);
  });

  it("builds resolver URLs from site origin", () => {
    const url = publicResolverUrl("itx_demo123");
    assert.match(url, /\/p\/itx_demo123$/);
  });
});
