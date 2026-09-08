import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enrichAffiliateRow,
  normalizeAffiliateU1,
  rakutenSkuBase,
} from "../lib/dashboard/revenue-enrichment.ts";
import { parseAffiliateReport } from "../lib/dashboard/revenue.ts";

describe("normalizeAffiliateU1", () => {
  it("maps Rakuten literal null strings to database null", () => {
    assert.equal(normalizeAffiliateU1(null), null);
    assert.equal(normalizeAffiliateU1(""), null);
    assert.equal(normalizeAffiliateU1("null"), null);
    assert.equal(normalizeAffiliateU1("NULL"), null);
    assert.equal(normalizeAffiliateU1("undefined"), null);
    assert.equal(normalizeAffiliateU1("  n/a  "), null);
  });

  it("keeps real subids", () => {
    assert.equal(normalizeAffiliateU1("scanner-abc"), "scanner-abc");
  });
});

describe("rakutenSkuBase", () => {
  it("strips numeric suffix variants", () => {
    assert.equal(rakutenSkuBase("P01167887-2"), "P01167887");
    assert.equal(rakutenSkuBase("P01167887"), "P01167887");
  });

  it("keeps hyphenated style codes intact", () => {
    assert.equal(rakutenSkuBase("ABC-XYZ"), "ABC-XYZ");
  });
});

describe("parseAffiliateReport u1", () => {
  it("normalizes u1 at parse time", () => {
    const csv = [
      "Transaction ID,SKU,Sales,Commissions,u1",
      "US123,P01167887,100,10,null",
    ].join("\n");
    const { rows } = parseAffiliateReport(csv);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].u1, null);
  });
});

describe("enrichAffiliateRow catalog match", () => {
  it("matches suffixed catalog SKU from Rakuten base SKU", () => {
    const index = new Map([
      [
        "sku:P01167887",
        {
          catalogId: "uuid-1",
          catalogProductId: "pid-1",
          catalogSku: "P01167887-2",
          brandName: "Brand",
        },
      ],
    ]);
    const row = {
      external_transaction_id: "US1",
      order_id: null,
      transaction_date: null,
      process_date: null,
      click_date: null,
      advertiser_id: null,
      advertiser_name: null,
      sku: "P01167887",
      product_name: null,
      product_id: null,
      quantity: null,
      sales_amount: 100,
      commission_amount: 10,
      currency: "USD",
      status: null,
      u1: "null",
      raw: {},
    };
    const enriched = enrichAffiliateRow(row, index);
    assert.equal(enriched.sku, "P01167887-2");
    assert.equal(enriched.product_id, "uuid-1");
    assert.equal(enriched.u1, null);
    assert.equal(enriched.raw?.catalog_uuid, "uuid-1");
    assert.equal(enriched.raw?.rakuten_sku, "P01167887");
  });
});
