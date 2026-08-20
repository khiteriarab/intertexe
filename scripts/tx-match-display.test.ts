import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  editorialCompositionLine,
  fashionWhyReasons,
  matchHeroCopy,
  materialCardSignal,
  materialClassification,
  originalPieceLabel,
  sortTxMatches,
} from "../lib/tx-match-display.ts";

describe("TX Match editorial display", () => {
  it("sets composition as an editorial middot line", () => {
    assert.equal(
      editorialCompositionLine("55.7% Lyocell; 22.6% Cotton; 21.7% Cupro"),
      "55.7% Lyocell · 22.6% Cotton · 21.7% Cupro"
    );
  });

  it("classifies a lyocell-cotton-cupro mix as a natural-fiber blend", () => {
    assert.equal(
      materialClassification("55.7% Lyocell; 22.6% Cotton; 21.7% Cupro"),
      "Natural-Fiber Blend"
    );
  });

  it("does not call silk-and-nylon-lace mostly synthetic", () => {
    const listed = "100% Silk; lace: 65% Nylon; 35% Cotton";
    assert.equal(materialClassification(listed), "Silk with Nylon Lace");
    assert.equal(
      editorialCompositionLine(listed),
      "100% Silk · lace 65% Nylon · 35% Cotton"
    );
  });

  it("does not print 145% natural fibers for silk plus nylon/cotton lace", () => {
    const mashed = "100% Silk · 55% Nylon · 45% Cotton";
    assert.equal(materialCardSignal({ composition: mashed }), "Silk with Nylon Lace");
    assert.doesNotMatch(materialCardSignal({ composition: mashed }), /145/);
    assert.equal(
      editorialCompositionLine(mashed),
      "100% Silk · lace 55% Nylon · 45% Cotton"
    );
  });

  it("uses 100% cotton as the card signal when that is true", () => {
    assert.equal(materialCardSignal({ composition: "100% cotton" }), "100% Cotton");
  });

  it("says no polyester when the mix has none", () => {
    assert.equal(
      materialCardSignal({ composition: "55.7% Lyocell; 22.6% Cotton; 21.7% Cupro" }),
      "No Polyester"
    );
  });

  it("writes a jeans hero around the original find", () => {
    const copy = matchHeroCopy({
      title: "Mid Rise Flared Jeans",
      brandName: "Miss Sixty",
      altCount: 12,
    });
    assert.equal(copy.eyebrow, "Better material matches");
    assert.equal(copy.heading, "Better jeans, by material.");
    assert.match(copy.supporting, /12 alternatives to the Miss Sixty Mid Rise Flared Jeans/);
  });

  it("does not repeat the brand when the title already has it", () => {
    assert.equal(
      originalPieceLabel("Miss Sixty", "Miss Sixty Mid Rise Flared Jeans"),
      "Miss Sixty Mid Rise Flared Jeans"
    );
  });

  it("explains a match in fashion language", () => {
    const reasons = fashionWhyReasons({
      why: "Same garment type (trousers/pants) · Similar price band · 100% cotton",
      composition: "100% cotton",
      name: "Flared cotton jeans",
      originalTitle: "Mid Rise Flared Jeans",
      originalPrice: 250,
      price: 198,
      naturalFiberPercent: 100,
    });
    assert.ok(reasons.some((r) => /flared silhouette/i.test(r)));
    assert.ok(reasons.some((r) => /comparable price/i.test(r)));
    assert.ok(reasons.some((r) => /100% Cotton/i.test(r)));
    assert.equal(reasons.length <= 3, true);
  });

  it("reorders matches for more natural without changing best-match order", () => {
    const items = [
      { name: "Style jean", naturalFiberPercent: 70, price: 200 },
      { name: "Pure cotton jean", naturalFiberPercent: 100, price: 210 },
    ];
    assert.equal(sortTxMatches(items, "best")[0].name, "Style jean");
    assert.equal(sortTxMatches(items, "natural")[0].name, "Pure cotton jean");
    assert.equal(sortTxMatches(items, "pure").length, 1);
  });
});
