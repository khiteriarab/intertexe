import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  fiberOptionsForCategory,
  isFiberAllowedForCategory,
  resolveShopMaterialQuery,
  SHOP_FILTER_SECTION_ORDER,
  SHOP_SHOE_TYPES,
} from "../lib/catalog-filter-options.ts";
import { shopDisplayedCount } from "../lib/shop-displayed-count.ts";

describe("Shop displayed count", () => {
  it("does not show 0 when products are on screen", () => {
    assert.equal(
      shopDisplayedCount({ resultTotal: 0, productsOnPage: 2, filtersActive: true }),
      2
    );
  });

  it("does not keep the unfiltered 300k after a filter is on", () => {
    assert.equal(
      shopDisplayedCount({
        resultTotal: null,
        productsOnPage: 2,
        filtersActive: true,
        unfilteredKnownTotal: 300_000,
      }),
      2
    );
  });

  it("uses the live filtered total when the RPC returns one", () => {
    assert.equal(
      shopDisplayedCount({
        resultTotal: 14_854,
        productsOnPage: 24,
        filtersActive: true,
        unfilteredKnownTotal: 300_000,
      }),
      14_854
    );
  });
});

describe("Shoe filter sheet", () => {
  it("puts color above price and shoe type before fiber", () => {
    assert.deepEqual([...SHOP_FILTER_SECTION_ORDER], [
      "category",
      "shoeType",
      "fiber",
      "color",
      "price",
    ]);
    assert.ok(SHOP_SHOE_TYPES.includes("Boots"));
  });

  it("swaps apparel fibers for shoe fibers when category is shoes", () => {
    const shoes = fiberOptionsForCategory("shoes").map((o) => o.key);
    const apparel = fiberOptionsForCategory("dresses").map((o) => o.key);
    assert.ok(shoes.includes("suede"));
    assert.ok(shoes.includes("canvas"));
    assert.equal(shoes.includes("silk"), false);
    assert.ok(apparel.includes("silk"));
    assert.equal(isFiberAllowedForCategory("silk", "shoes"), false);
    assert.equal(isFiberAllowedForCategory("suede", "shoes"), true);
  });

  it("maps shoe fibers onto browse RPC params", () => {
    assert.deepEqual(resolveShopMaterialQuery("suede"), {
      fiber: "leather",
      materialSubtype: "suede",
    });
    assert.deepEqual(resolveShopMaterialQuery("canvas"), { fabricConstruction: "canvas" });
    assert.deepEqual(resolveShopMaterialQuery("leather"), { fiber: "leather" });
  });

  it("keeps the shop page and iOS filter contract aligned", () => {
    const home = fs.readFileSync(path.join(process.cwd(), "app/shop/ShopClient.tsx"), "utf8");
    const options = fs.readFileSync(path.join(process.cwd(), "lib/catalog-filter-options.ts"), "utf8");
    const actions = fs.readFileSync(path.join(process.cwd(), "app/shop/actions.ts"), "utf8");
    assert.match(home, /fiberOptionsForCategory/);
    assert.match(home, /Shoe type/);
    assert.match(home, /shopDisplayedCount/);
    assert.match(options, /Color is above Price/);
    assert.match(actions, /total: result.total == null \? null : result.total/);
    assert.doesNotMatch(
      home,
      /result\.total < prev \? prev : result\.total/
    );
  });
});
