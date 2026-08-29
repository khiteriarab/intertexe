import assert from "node:assert/strict";
import { test } from "node:test";
import { productMatchesJeansListing } from "../lib/catalog-shop-mappings.ts";

test("jeans category accepts denim products", () => {
  assert.equal(
    productMatchesJeansListing({
      name: "Isabel Marant Etoile Blue Straight Jean",
      category: "Jeans",
    }),
    true
  );
  assert.equal(
    productMatchesJeansListing({
      name: "Elsie High Rise Wide Leg in Blue",
      category: "Jeans",
      fabricConstruction: "denim",
    }),
    true
  );
});

test("jeans category rejects linen and terry pants from broad departments", () => {
  assert.equal(
    productMatchesJeansListing({
      name: "Tailored Linen Trouser",
      category: "Pants & Jeans",
    }),
    false
  );
  assert.equal(
    productMatchesJeansListing({
      name: "Terry Wide Leg Pants",
      category: "Pants & Jeans",
    }),
    false
  );
  assert.equal(
    productMatchesJeansListing({
      name: "High Rise Wide Leg Trouser",
      category: "Bottoms",
    }),
    false
  );
});
