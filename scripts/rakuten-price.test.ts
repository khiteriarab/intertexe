import test from "node:test";
import assert from "node:assert/strict";
import {
  flattenRakutenXMLProduct,
  normalizeRakutenProduct,
} from "../lib/feed-sync/rakuten-sync.js";

test("Rakuten XML uses sale price as current price", () => {
  const row = flattenRakutenXMLProduct({
    "@_product_id": "50745-test",
    "@_mid": "50745",
    name: "Rewind High Rise Cotton Jeans",
    category: { primary: "Clothing > Jeans" },
    URL: {
      product: "https://click.linksynergy.com/deeplink?id=test&mid=50745&murl=https%3A%2F%2Fexample.com%2Fjeans",
      productImage: "https://example.com/jeans.jpg",
    },
    price: { retail: "425.00", sale: "238.00", "@_currency": "USD" },
    attributeClass: { Material: "100% Cotton", Gender: "Female" },
  });

  assert.equal(row.price, "238.00");
  assert.equal(row.sale_price, "238.00");
  assert.equal(row.retail_price, "425.00");
});

test("normalized Rakuten product preserves current and original prices", () => {
  const product = normalizeRakutenProduct(
    {
      product_id: "50745-test",
      mid: "50745",
      name: "Rewind High Rise Cotton Jeans",
      brand: "RE/DONE",
      category: "Clothing > Jeans",
      material: "100% Cotton",
      gender: "Female",
      product_url:
        "https://click.linksynergy.com/deeplink?id=test&mid=50745&murl=https%3A%2F%2Fexample.com%2Fjeans",
      image_url: "https://example.com/jeans.jpg",
      price: "425.00",
      sale_price: "238.00",
      retail_price: "425.00",
      availability: "in stock",
    },
    "ftp://aftp.linksynergy.com/50745-test.xml"
  );

  assert.ok(product);
  assert.equal(product.price, "238.00");
  assert.equal(product.original_price, "425.00");
  assert.equal(product.is_sale, true);
  assert.equal(product.discount_percent, 44);
});
