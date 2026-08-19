import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  preferredFiberFromInput,
  productMatchesFiber,
  rankTxMatchAlternatives,
} from "../lib/capture-find-better.ts";
import { buildTxMatchCopy, buildTxMatchLinks } from "../lib/tx-match-copy.ts";
import { materialInsightFromText, savingsPercent } from "../lib/material-insight.ts";

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

  it("does not let a cotton shirt match a silk slip dress", () => {
    const ranked = rankTxMatchAlternatives(
      [
        {
          id: "shirt",
          name: "Cotton Poplin Shirt",
          brand_name: "Test",
          price: 198,
          currency: "USD",
          composition: "70% cotton; 30% silk",
          natural_fiber_percent: 70,
          category: "tops",
          garment_type: "shirts",
        },
        {
          id: "dress",
          name: "Eden Silk Dress",
          brand_name: "Test",
          price: 248,
          currency: "USD",
          composition: "100% silk",
          natural_fiber_percent: 100,
          category: "dresses",
          garment_type: "dresses",
        },
      ],
      {
        title: "Rose Silk Slip Dress Sage",
        compositionText: "silk",
        price: 333,
        currency: "EUR",
      }
    );
    assert.equal(
      ranked.some((row) => row.id === "shirt"),
      false
    );
    assert.equal(ranked[0]?.id, "dress");
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
    assert.equal(copy.alternativesTitle, "12 better-material matches");
    assert.match(copy.compositionNote || "", /Material details unavailable/);
    assert.equal(copy.tagline, "Know the material before you buy.");
  });

  it("treats Material: silk without percentages as a retailer listing", () => {
    const copy = buildTxMatchCopy({
      inferredFiber: "silk",
      garment: "skirt",
      altCount: 12,
      compositionListed: true,
      listedWithoutPercentages: true,
      listedMaterial: "Silk",
    });
    assert.equal(copy.compositionHeadline, "Material: Silk — percentage not provided");
    assert.match(copy.compositionNote || "", /percentage not provided/i);
  });

  it("collapses a repeated retailer fiber list to one name", () => {
    const copy = buildTxMatchCopy({
      inferredFiber: "silk",
      garment: "dress",
      altCount: 12,
      compositionListed: true,
      listedWithoutPercentages: true,
      listedMaterial: "SILK, SILK, silk, silk, silk, SILK, SILK, SILK",
    });
    assert.equal(copy.compositionHeadline, "Material: Silk — percentage not provided");
  });

  it("does not claim a fabric when none was inferred", () => {
    const copy = buildTxMatchCopy({ compositionListed: false, altCount: 8 });
    assert.equal(copy.decodeAction, "See more like this");
    assert.doesNotMatch(copy.alternativesTitle, /silk/i);
    assert.match(copy.compositionNote || "", /Material details unavailable/);
    assert.match(copy.compositionNote || "", /verified compositions/i);
  });

  it("opens the saved piece and TX Matches on the same /capture page", () => {
    const id = "cap-123";
    const links = buildTxMatchLinks(id);
    assert.ok(links);
    assert.match(links.viewAllMatchesUrl, /\/capture\/cap-123$/);
    assert.match(links.openInIntertexeUrl, /\/capture\/cap-123$/);
    assert.equal(links.viewAllMatchesUrl, links.openInIntertexeUrl);
    assert.doesNotMatch(links.openInIntertexeUrl, /\/open\?/);
    assert.doesNotMatch(links.openInIntertexeUrl, /\/inspirations\//);
    const copy = buildTxMatchCopy({ captureId: id, altCount: 12, inferredFiber: "silk", garment: "skirt" });
    assert.equal(copy.viewAllMatchesUrl, links.viewAllMatchesUrl);
    assert.equal(copy.openInIntertexeUrl, links.openInIntertexeUrl);
  });
});

describe("Material insight", () => {
  it("labels a mostly synthetic listed mix without inventing percentages", () => {
    const insight = materialInsightFromText("20% cotton, 80% polyester");
    assert.equal(insight.share, 20);
    assert.equal(insight.tone, "synthetic");
    assert.match(insight.label, /mostly synthetic/i);
  });

  it("labels a mostly natural mix", () => {
    const insight = materialInsightFromText("96% silk, 4% elastane");
    assert.equal(insight.share, 96);
    assert.equal(insight.tone, "natural");
  });

  it("does not invent a share when percentages are missing", () => {
    const insight = materialInsightFromText("Silk");
    assert.equal(insight.share, null);
    assert.equal(insight.tone, "unknown");
  });

  it("does not treat a silk shell plus polyester lining as fully natural", () => {
    const insight = materialInsightFromText("100% silk; lining: 100% polyester");
    assert.equal(insight.tone, "mixed");
    assert.match(insight.label, /lining/i);
  });

  it("computes a savings percent only when the alternative is cheaper", () => {
    assert.equal(savingsPercent(890, 473), 47);
    assert.equal(savingsPercent(200, 250), null);
    assert.equal(savingsPercent(null, 100), null);
  });
});
