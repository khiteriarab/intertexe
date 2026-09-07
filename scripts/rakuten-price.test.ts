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

test("Bloomingdale's MID 13867 maps designer brand, retailer, and sale flag", () => {
  const product = normalizeRakutenProduct(
    {
      product_id: "1386710571345825183064491",
      mid: "13867",
      name: "Olina Silk Pants",
      brand: "Reformation",
      category: "Pants",
      secondary_category: "Sale",
      material: "100% Silk",
      gender: "Female",
      product_url:
        "https://click.linksynergy.com/link?id=test&offerid=1170371.138671057&type=15&murl=https%3A%2F%2Fwww.bloomingdales.com%2Fshop%2Fproduct%2Freformation-olina-silk-pants",
      image_url: "https://images.bloomingdalesassets.com/x.jpg",
      sale_price: "178",
      retail_price: "248",
      availability: "in stock",
    },
    "ftp://aftp.linksynergy.com/13867_4668007_mp.xml.gz"
  );

  assert.ok(product);
  assert.equal(product.brand_name, "Reformation");
  assert.equal(product.retailer, "Bloomingdale's");
  assert.equal(product.feed_source, "bloomingdales");
  assert.equal(product.retailer_mid, "13867");
  assert.equal(product.is_sale, true);
  assert.equal(product.price, "178");
  assert.equal(product.original_price, "248");
});

test("Bloomingdale's UK MID 37206 maps GBP region and sale flag", () => {
  const product = normalizeRakutenProduct(
    {
      product_id: "3720612345678901234567890",
      mid: "37206",
      name: "Silk Midi Dress",
      brand: "Reformation",
      category: "Dresses",
      secondary_category: "Sale",
      material: "100% Silk",
      gender: "Female",
      product_url:
        "https://click.linksynergy.com/deeplink?id=test&mid=37206&murl=https%3A%2F%2Fwww.bloomingdales.co.uk%2Fshop%2Fproduct%2Freformation-silk-midi-dress",
      image_url: "https://images.bloomingdalesassets.com/x.jpg",
      sale_price: "145",
      retail_price: "210",
      currency: "GBP",
      availability: "in stock",
    },
    "ftp://aftp.linksynergy.com/37206_4668007_mp.xml.gz"
  );

  assert.ok(product);
  assert.equal(product.brand_name, "Reformation");
  assert.equal(product.retailer, "Bloomingdale's");
  assert.equal(product.feed_source, "bloomingdales");
  assert.equal(product.retailer_mid, "37206");
  assert.equal(product.region, "uk");
  assert.equal(product.currency, "GBP");
  assert.equal(product.retailer_country, "GB");
  assert.equal(product.is_sale, true);
  assert.match(String(product.product_id), /-uk$/);
});
