import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDuplicateSale, planSoldSync, webhookIdempotencyKey } from "../lib/resale/sync";
import { providerSummaries } from "../lib/resale/providers";

describe("resale sync", () => {
  it("plans deactivation of other published listings on sold event", () => {
    const plan = planSoldSync(
      [
        { id: "1", provider: "ebay", external_listing_id: "e1", status: "published" },
        { id: "2", provider: "vinted", external_listing_id: "v1", status: "published" },
        { id: "3", provider: "poshmark", external_listing_id: "p1", status: "handoff" },
      ],
      "ebay"
    );
    assert.equal(plan.toDeactivate.length, 1);
    assert.equal(plan.toDeactivate[0].provider, "vinted");
    assert.deepEqual(plan.handoffActionRequired, ["poshmark"]);
  });

  it("prevents duplicate sale when already sold", () => {
    assert.equal(isDuplicateSale("sold"), true);
    assert.equal(isDuplicateSale("transfer_pending"), true);
    assert.equal(isDuplicateSale("listed"), false);
  });

  it("builds stable webhook idempotency keys", () => {
    const key = webhookIdempotencyKey("ebay", "evt-1", "order.completed");
    assert.match(key, /^ebay:evt-1:order.completed$/);
  });

  it("reports honest provider integration statuses", () => {
    const providers = providerSummaries();
    const poshmark = providers.find((p) => p.id === "poshmark");
    assert.equal(poshmark?.integrationStatus, "handoff");
    assert.equal(poshmark?.capabilities.listing_handoff, true);
    assert.equal(poshmark?.capabilities.listing_publish, false);
  });
});
