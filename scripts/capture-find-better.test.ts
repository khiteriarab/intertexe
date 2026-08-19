import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  preferredColorFromInput,
  preferredFiberFromInput,
  productMatchesFiber,
  rankTxMatchAlternatives,
  txMatchPriceBands,
} from "../lib/capture-find-better.ts";
import { buildTxMatchCopy, buildTxMatchLinks } from "../lib/tx-match-copy.ts";
import { unpublishedMaterialCopy } from "../lib/unpublished-material.ts";
import { safeInternalPath } from "../lib/public-match-set.ts";
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

  it("reads cotton from a jeans title when the page hid the formula", () => {
    assert.equal(
      preferredFiberFromInput({
        title: "Jeans Drayton High Boy Fit para mujer | Ralph Lauren® ES",
        garmentType: "trouser",
        category: "pants",
        subcategory: "jeans",
      }),
      "cotton"
    );
    assert.equal(
      preferredColorFromInput({
        title: "Jeans Drayton High Boy Fit para mujer | Ralph Lauren® ES",
        subcategory: "jeans",
      }),
      "blue"
    );
  });

  it("puts cotton blue jeans in the first 5, then related bottoms", () => {
    const affiliate = "https://click.linksynergy.com/deeplink?id=test";
    const products = [
      {
        id: "cheap",
        name: "Mid Rise Button Fly Boyfriend Jeans in Medium Blue cheap",
        brand_name: "Test",
        price: 84,
        currency: "USD",
        url: affiliate,
        composition: "93% cotton",
        natural_fiber_percent: 93,
        category: "pants_trousers",
        garment_type: "pants_trousers",
        color: "blue",
        fabric_construction: "denim",
      },
      {
        id: "sweat",
        name: "Weekend Park Loved Sweatpant",
        brand_name: "Test",
        price: 280,
        currency: "USD",
        composition: "100% cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "pants_trousers",
        color: "grey",
      },
      {
        id: "beige-pant",
        name: "Askk Ny Juniper Wide Leg",
        brand_name: "Test",
        price: 260,
        currency: "USD",
        composition: "100% cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "pants_trousers",
        color: "beige",
      },
      {
        id: "black-pant",
        name: "Theory Eyelet Pant",
        brand_name: "Test",
        price: 375,
        currency: "USD",
        composition: "100% cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "pants_trousers",
        color: "black",
      },
      {
        id: "black-jean",
        name: "Black High Rise Jeans",
        brand_name: "Test",
        price: 280,
        currency: "USD",
        composition: "100% cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "pants_trousers",
        color: "black",
        fabric_construction: "denim",
      },
    ];
    for (let i = 1; i <= 6; i++) {
      products.push({
        id: `blue-jean-${i}`,
        name: `Mid Rise Button Fly Boyfriend Jeans in Medium Blue ${i}`,
        brand_name: "Test",
        price: 260 + i * 20,
        currency: "USD",
        url: affiliate,
        composition: "93% cotton",
        natural_fiber_percent: 93,
        category: "pants_trousers",
        garment_type: "pants_trousers",
        color: "blue",
        fabric_construction: "denim",
      });
    }
    const ranked = rankTxMatchAlternatives(products, {
      title: "Jeans Drayton High Boy Fit para mujer | Ralph Lauren® ES",
      subcategory: "jeans",
      garmentType: "trouser",
      category: "pants",
      price: 350,
      currency: "EUR",
    });
    const firstFive = ranked.slice(0, 5);
    assert.equal(firstFive.length, 5);
    assert.equal(ranked.some((row) => row.id === "cheap"), false);
    assert.equal(firstFive[0]?.id, "blue-jean-6");
    for (const alt of firstFive) {
      assert.match(String(alt.name), /jeans/i);
      assert.match(String(alt.name), /blue/i);
      assert.doesNotMatch(String(alt.name), /sweatpant|eyelet|wide leg/i);
    }
    assert.ok(
      ranked.findIndex((row) => row.id === "black-jean") <
        ranked.findIndex((row) => row.id === "sweat")
    );
    assert.ok(!firstFive.some((row) => ["sweat", "beige-pant", "black-pant"].includes(row.id)));
  });

  it("ranks wide-leg blue jeans ahead of slim cotton trousers", () => {
    const products = [
      {
        id: "slim-cotton-pant",
        name: "Dede Pleated Cotton Slim Pants",
        brand_name: "Max Mara",
        price: 780,
        currency: "USD",
        url: "https://www.maxmara.com/dede",
        composition: "100% Cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "pants",
        color: "tan",
      },
      {
        id: "straight-jean",
        name: "Playback Horizon Mid Rise Straight Jeans in Denim",
        brand_name: "Ksubi",
        price: 240,
        currency: "USD",
        composition: "100% cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "jeans",
        color: "blue",
        fabric_construction: "denim",
      },
      {
        id: "wide-jean",
        name: "Super High Rise Wide Leg Denim Jeans in Light Blue",
        brand_name: "Bayeas",
        price: 138,
        currency: "USD",
        composition: "92% Cotton; 5% Polyester; 3% Elastane",
        natural_fiber_percent: 92,
        category: "pants_trousers",
        garment_type: "jeans",
        color: "light blue",
        fabric_construction: "denim",
      },
      {
        id: "wide-jean-2",
        name: "Light Blue Mid Rise Wide Leg Jeans",
        brand_name: "Agolde",
        price: 188,
        currency: "USD",
        composition: "99% cotton; 1% elastane",
        natural_fiber_percent: 99,
        category: "pants_trousers",
        garment_type: "jeans",
        color: "blue",
        fabric_construction: "denim",
      },
    ];
    const ranked = rankTxMatchAlternatives(products, {
      title: "Mid-waist wide-leg jeans",
      garmentType: "jeans",
      category: "pants",
      subcategory: "jeans",
      silhouette: "wide-leg",
      color: "light blue",
    });
    const ids = ranked.map((row) => row.id);
    assert.ok(ranked.length >= 3);
    assert.match(String(ranked[0]?.name), /jean/i);
    assert.match(String(ranked[0]?.name), /wide leg/i);
    assert.doesNotMatch(String(ranked[0]?.name), /slim pants/i);
    for (const jeanId of ["wide-jean", "wide-jean-2", "straight-jean"]) {
      assert.ok(
        ids.indexOf(jeanId) >= 0 && ids.indexOf(jeanId) < ids.indexOf("slim-cotton-pant"),
        `${jeanId} should outrank slim cotton trousers`
      );
    }
  });

  it("keeps matches in the shopper budget and allows at most two splurges", () => {
    const source = { title: "Mid-waist wide-leg jeans", price: 59.95, currency: "EUR" };
    const bands = txMatchPriceBands({ ...source, garmentType: "jeans", subcategory: "jeans" });
    assert.ok(bands.budgetMax != null && bands.splurgeMax != null);
    assert.ok(bands.budgetMax < 90);
    assert.ok(bands.splurgeMax < 170);

    const products = [
      {
        id: "budget-wide",
        name: "Light Blue Mid Rise Wide Leg Jeans",
        brand_name: "Weekday",
        price: 68,
        currency: "USD",
        composition: "99% cotton; 1% elastane",
        natural_fiber_percent: 99,
        category: "pants_trousers",
        garment_type: "jeans",
        color: "light blue",
        fabric_construction: "denim",
      },
      {
        id: "budget-wide-2",
        name: "Wide Leg Denim Jeans in Light Blue",
        brand_name: "Mango",
        price: 74,
        currency: "USD",
        composition: "100% cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "jeans",
        color: "blue",
        fabric_construction: "denim",
      },
      {
        id: "budget-straight",
        name: "Mid Rise Straight Jeans in Denim",
        brand_name: "Uniqlo",
        price: 62,
        currency: "USD",
        composition: "100% cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "jeans",
        color: "blue",
        fabric_construction: "denim",
      },
      {
        id: "splurge-1",
        name: "Super High Rise Wide Leg Denim Jeans in Light Blue",
        brand_name: "Bayeas",
        price: 138,
        currency: "USD",
        composition: "92% Cotton; 5% Polyester; 3% Elastane",
        natural_fiber_percent: 92,
        category: "pants_trousers",
        garment_type: "jeans",
        color: "light blue",
        fabric_construction: "denim",
      },
      {
        id: "splurge-2",
        name: "Wide Leg Cotton Jeans",
        brand_name: "Re/Done",
        price: 148,
        currency: "USD",
        composition: "100% cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "jeans",
        color: "blue",
        fabric_construction: "denim",
      },
      {
        id: "luxury-pant",
        name: "Dede Pleated Cotton Slim Pants",
        brand_name: "Max Mara",
        price: 780,
        currency: "USD",
        composition: "100% Cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "pants",
        color: "tan",
      },
      {
        id: "expensive-jean",
        name: "Ariel Mid Rise Wedgie Jeans in Luca",
        brand_name: "Eb Denim",
        price: 285,
        currency: "USD",
        composition: "100% cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "jeans",
        color: "blue",
        fabric_construction: "denim",
      },
      {
        id: "sweat",
        name: "Nash Sweatpants",
        brand_name: "Beach Riot",
        price: 138,
        currency: "USD",
        composition: "100% cotton",
        natural_fiber_percent: 100,
        category: "pants_trousers",
        garment_type: "sweatpants",
        color: "green",
      },
    ];
    const ranked = rankTxMatchAlternatives(products, {
      ...source,
      garmentType: "jeans",
      category: "pants",
      subcategory: "jeans",
      silhouette: "wide-leg",
      color: "light blue",
    });
    const ids = ranked.map((row) => row.id);
    assert.equal(ids.includes("luxury-pant"), false);
    assert.equal(ids.includes("expensive-jean"), false);
    const budgetIds = ["budget-wide", "budget-wide-2", "budget-straight"];
    for (const id of budgetIds) {
      assert.ok(ids.includes(id), `${id} should stay in the set`);
    }
    assert.ok(budgetIds.includes(String(ranked[0]?.id)));
    const splurgeIds = ranked
      .filter((row) => Number(row.price) > (bands.budgetMax || 0))
      .map((row) => row.id);
    assert.ok(splurgeIds.length <= 2);
    assert.ok(!splurgeIds.includes("sweat"));
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
    assert.equal(copy.alternativesTitle, "Better-material matches");
    assert.match(copy.compositionNote || "", /Silk detected/);
    assert.match(copy.compositionNote || "", /Exact composition not published/);
    assert.doesNotMatch(copy.compositionNote || "", /Material details unavailable/);
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
    assert.match(copy.compositionNote || "", /Exact composition not published/);
    assert.doesNotMatch(copy.compositionNote || "", /Material details unavailable/);
  });

  it("opens the original piece and TX Matches on a public /matches page", () => {
    const id = "cap-123";
    const links = buildTxMatchLinks(id);
    assert.ok(links);
    assert.match(links.viewAllMatchesUrl, /\/matches\/cap-123$/);
    assert.match(links.openInIntertexeUrl, /\/matches\/cap-123$/);
    assert.equal(links.viewAllMatchesUrl, links.openInIntertexeUrl);
    assert.doesNotMatch(links.openInIntertexeUrl, /\/open\?/);
    assert.doesNotMatch(links.openInIntertexeUrl, /\/inspirations\//);
    assert.doesNotMatch(links.openInIntertexeUrl, /\/capture\//);
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

describe("Unpublished material copy", () => {
  it("says denim detected when jeans are recognized without a formula", () => {
    const copy = unpublishedMaterialCopy({
      title: "Mid-waist wide-leg jeans",
      category: "trousers",
      altCount: 12,
    });
    assert.equal(copy.headline, "Denim detected");
    assert.equal(copy.detail, "Exact composition not published");
    assert.equal(copy.supporting, "We found better-material alternatives in cotton.");
  });

  it("does not invent percentages when the retailer listed none", () => {
    const copy = unpublishedMaterialCopy({ title: "Silk slip dress", altCount: 8 });
    assert.equal(copy.headline, "Silk detected");
    assert.doesNotMatch(copy.headline, /\d+%/);
    assert.match(copy.detail || "", /Exact composition not published/);
  });
});

describe("Public match return paths", () => {
  it("keeps internal next URLs and rejects off-site redirects", () => {
    assert.equal(safeInternalPath("/matches/abc?save=1"), "/matches/abc?save=1");
    assert.equal(safeInternalPath("https://evil.example/matches/abc"), null);
    assert.equal(safeInternalPath("//evil.example"), null);
  });
});
