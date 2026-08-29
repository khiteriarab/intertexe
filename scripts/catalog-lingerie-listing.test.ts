import test from "node:test";
import assert from "node:assert/strict";
import { productMatchesLingerieListing } from "../lib/catalog-shop-mappings";

test("FDM cheeky hipster with mislabeled trousers category passes", () => {
  assert.equal(
    productMatchesLingerieListing({
      name: "Cheeky Hipster",
      category: "Trousers",
      garment_type: "lingerie",
    }),
    true
  );
});

test("bra category passes without lingerie keyword in name", () => {
  assert.equal(
    productMatchesLingerieListing({
      name: "Magnolia Lace Plunge",
      category: "Bras",
    }),
    true
  );
});

test("under-dress slip skirt passes", () => {
  assert.equal(
    productMatchesLingerieListing({
      name: "Silk Slip Skirt",
      category: "Skirts",
      garment_type: "lingerie",
    }),
    true
  );
});

test("fashion midi skirt without lingerie signals is excluded", () => {
  assert.equal(
    productMatchesLingerieListing({
      name: "Pleated Midi Skirt",
      category: "Skirts",
    }),
    false
  );
});

test("denim skirt is excluded from lingerie", () => {
  assert.equal(
    productMatchesLingerieListing({
      name: "Denim Slip Skirt",
      category: "Skirts",
    }),
    false
  );
});
