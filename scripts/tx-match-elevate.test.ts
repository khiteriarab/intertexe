import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogRegionFromShopMarket,
  parsePreferredSizes,
  preferredDesignerBoost,
  sizeSoftMatch,
  wardrobePairingHit,
} from "../lib/tx-match-elevate.ts";

describe("TX Match elevation helpers", () => {
  it("boosts preferred designers", () => {
    assert.ok(preferredDesignerBoost("Toteme", ["Toteme"]) > 0);
    assert.equal(preferredDesignerBoost("Other", ["Toteme"]), 0);
  });

  it("pairs tops with saved trousers", () => {
    const hit = wardrobePairingHit(
      { category: "tops", name: "Silk blouse", color: "ivory" },
      [{ title: "Wool trousers", category: "trousers" }]
    );
    assert.ok(hit);
    assert.match(hit!.label, /pairs with your/i);
    assert.ok(hit!.score >= 28);
  });

  it("soft-matches preferred sizes", () => {
    assert.equal(sizeSoftMatch(["S", "M", "L"], ["M"]), true);
    assert.equal(sizeSoftMatch(["S", "M"], ["XL"]), false);
    assert.equal(sizeSoftMatch(null, ["M"]), null);
  });

  it("reads sizes from catalog filter prefs", () => {
    assert.deepEqual(parsePreferredSizes({ sizes: ["S", "M"] }), ["S", "M"]);
    assert.deepEqual(parsePreferredSizes({ preferredSizes: "38,40" }), ["38", "40"]);
  });

  it("maps shop market to catalog region", () => {
    assert.equal(catalogRegionFromShopMarket("us-ca", "US"), "us");
    assert.equal(catalogRegionFromShopMarket("us-ca", "CA"), "ca");
    assert.equal(catalogRegionFromShopMarket("eu-uk-me", "GB"), "uk");
    assert.equal(catalogRegionFromShopMarket("eu-uk-me", "ES"), "eu");
  });
});
