import test from "node:test";
import assert from "node:assert/strict";
import { isFootwearOfferOnSale } from "../lib/sale-footwear";

test("isFootwearOfferOnSale detects markdown from original price", () => {
  assert.equal(isFootwearOfferOnSale({ price: "$100", originalPrice: "$200" }), true);
  assert.equal(isFootwearOfferOnSale({ price: "$100", originalPrice: "$100", is_sale: false }), false);
  assert.equal(isFootwearOfferOnSale({ price: "$100", is_sale: true }), true);
});
