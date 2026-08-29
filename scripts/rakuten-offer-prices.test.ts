import test from "node:test";
import assert from "node:assert/strict";
import { resolveOfferPrices } from "../lib/feed-sync/rakuten-sync.js";

test("resolveOfferPrices keeps retail and sale separate", () => {
  const out = resolveOfferPrices({ sale_price: "450", retail_price: "890" });
  assert.equal(out.price, "450");
  assert.equal(out.originalPrice, "890");
});

test("resolveOfferPrices infers original from discount amount", () => {
  const out = resolveOfferPrices({ price: "400", discount_amount: "100" });
  assert.equal(out.price, "400");
  assert.equal(out.originalPrice, "500");
});

test("resolveOfferPrices does not collapse single price field", () => {
  const out = resolveOfferPrices({ price: "275" });
  assert.equal(out.price, "275");
  assert.equal(out.originalPrice, "275");
});
