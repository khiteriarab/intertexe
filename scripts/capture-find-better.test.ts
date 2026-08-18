import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  preferredFiberFromInput,
  productMatchesFiber,
  rankTxMatchAlternatives,
} from "../lib/capture-find-better.ts";
import { buildTxMatchCopy } from "../lib/tx-match-copy.ts";

function skirt(id: string, fiber: string, price: number, color = "lilac") {
  return {
    id,
    name: `${color} ${fiber} skirt ${id}`,
    brand_name: "Test",
    brand_slug: "test",
    image_url: "https://example.com/x.jpg",
    price,
    currency: "USD",
    composition: `100% ${fiber}`,
    natural_fiber_percent: 100,
    category: "skirts",
    garment_type: "skirt",
    color,
  };
}

describe("TX Match fabric-first ranking", () => {
  it("reads silk from composition even when the page title has none", () => {
    assert.equal(
      preferredFiberFromInput({
        title: "Verbena Skirt Lilac",
        compositionText: "silk",
        garmentType: "skirt",
      }),
      "silk"
    );
  });

  it("reads silk from charmeuse/satin title hints", () => {
    assert.equal(
      preferredFiberFromInput({ title: "Printed Silk Charmeuse Maxi Skirt" }),
      "silk"
    );
  });

  it("puts at least the first 5 matches in the same fabric", () => {
    const products = [
      skirt("c1", "cotton", 120),
      skirt("c2", "cotton", 106),
      skirt("s1", "silk", 348),
      skirt("s2", "silk", 320),
      skirt("s3", "silk", 290),
      skirt("s4", "silk", 310),
      skirt("s5", "silk", 360),
      skirt("c3", "cotton", 90),
    ];
    const ranked = rankTxMatchAlternatives(products, {
      title: "Verbena Skirt Lilac",
      compositionText: "Looks like silk",
      garmentType: "skirt",
      category: "skirts",
      price: 280,
      color: "lilac",
    });
    const firstFive = ranked.slice(0, 5);
    assert.equal(firstFive.length, 5);
    for (const alt of firstFive) {
      assert.match(String(alt.composition), /silk/i);
    }
  });

  it("does not let a cheaper cotton skirt outrank silk", () => {
    const ranked = rankTxMatchAlternatives(
      [skirt("cheap-cotton", "cotton", 80), skirt("silk", "silk", 340)],
      {
        title: "Verbena Skirt Lilac",
        compositionText: "silk",
        garmentType: "skirt",
        category: "skirts",
        price: 300,
        color: "lilac",
      }
    );
    assert.equal(ranked[0].id, "silk");
  });

  it("matches catalog composition against the preferred fiber", () => {
    assert.equal(productMatchesFiber({ composition: "100% silk" }, "silk"), true);
    assert.equal(productMatchesFiber({ composition: "100% cotton" }, "silk"), false);
  });
});

describe("TX Match copy", () => {
  it("makes the action label say it opens more options", () => {
    const copy = buildTxMatchCopy({
      inferredFiber: "silk",
      garment: "skirt",
      altCount: 12,
      compositionListed: false,
    });
    assert.match(copy.decodeAction, /see/i);
    assert.match(copy.decodeAction, /silk/i);
    assert.doesNotMatch(copy.decodeAction, /^TX MATCH$/i);
    assert.equal(copy.alternativesTitle, "More silk options");
    assert.match(copy.compositionNote || "", /does not list a fabric label/i);
    assert.match(copy.compositionNote || "", /silk/i);
  });

  it("does not claim a fabric when none was inferred", () => {
    const copy = buildTxMatchCopy({ compositionListed: false, altCount: 8 });
    assert.equal(copy.decodeAction, "See more like this");
    assert.doesNotMatch(copy.alternativesTitle, /silk/i);
  });
});
