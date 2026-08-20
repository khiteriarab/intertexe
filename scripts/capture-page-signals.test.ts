import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCompositionDisplay } from "../lib/composition-display.ts";
import {
  countryFromPage,
  extractLabeledMaterial,
  extractCompositionFromPageText,
  extractVisibleOffer,
  formatCapturePrice,
  looksLikeListedMaterial,
  looksLikePercentageComposition,
  preferPercentageComposition,
  preferRetailerFacingOffer,
  shopAtLabel,
  titleCaseName,
  uniqueTitleCaseNames,
} from "../lib/capture-page-signals.ts";
import {
  normalizeRetailerClickSource,
  resolveAuthenticatedUserId,
} from "../lib/retailer-click-source.ts";

describe("retailer material capture", () => {
  it("reads Material: silk without a percentage", () => {
    const html = `
      <h1>Verbena Skirt Lilac</h1>
      <p>Price: €465</p>
      <p>Material: silk</p>
    `;
    assert.equal(extractLabeledMaterial(html), "Silk");
    assert.equal(looksLikeListedMaterial("Silk"), true);
    assert.equal(looksLikePercentageComposition("Silk"), false);
  });

  it("still prefers percentage compositions when they exist", () => {
    const html = `<p>Composition: 100% silk</p><p>Material: silk</p>`;
    assert.match(extractLabeledMaterial(html) || "", /100%\s*silk/i);
  });

  it("does not treat a sale banner as composition", () => {
    assert.equal(looksLikePercentageComposition("20% off silk dresses"), false);
    assert.equal(extractLabeledMaterial("Spring sale, silk-like drape, 20% off"), null);
    assert.equal(extractCompositionFromPageText("20% off silk dresses"), null);
  });

  it("reads a semicolon mix that is already on the product page", () => {
    const html = `<h1>Mid Rise Flared Jeans</h1><p>Composition: 55.7% Lyocell; 22.6% Cotton; 21.7% Cupro</p>`;
    assert.equal(
      extractCompositionFromPageText(html),
      "55.7% Lyocell; 22.6% Cotton; 21.7% Cupro"
    );
  });

  it("reads European comma decimals and space-separated clauses", () => {
    const html = `<div>Composición 55,7% lyocell 22,6% cotton 21,7% cupro</div>`;
    assert.equal(
      extractCompositionFromPageText(html),
      "55.7% Lyocell; 22.6% Cotton; 21.7% Cupro"
    );
  });

  it("reads fiber-then-percent tables", () => {
    const html = `<table><tr><td>Lyocell</td><td>55.7%</td></tr><tr><td>Cotton</td><td>22.6%</td></tr></table>`;
    assert.match(extractCompositionFromPageText(html) || "", /55\.7%\s*Lyocell/i);
    assert.match(extractCompositionFromPageText(html) || "", /22\.6%\s*Cotton/i);
  });

  it("does not let a JSON-LD Denim label hide a listed formula", () => {
    const html = `Denim. Composition 55.7% Lyocell; 22.6% Cotton; 21.7% Cupro`;
    assert.equal(
      extractCompositionFromPageText(html),
      "55.7% Lyocell; 22.6% Cotton; 21.7% Cupro"
    );
    assert.equal(
      preferPercentageComposition("Denim", extractCompositionFromPageText(html)),
      "55.7% Lyocell; 22.6% Cotton; 21.7% Cupro"
    );
  });

  it("reads 100% premium stretch silk as silk, not a silk-cotton mix", () => {
    const html = `<p>100% premium stretch silk dress</p><p>breathable silk</p>`;
    assert.equal(extractCompositionFromPageText(html), "100% Silk");
    assert.equal(looksLikePercentageComposition("100% Silk"), true);
  });

  it("keeps lace nylon/cotton separate from 100% silk satin", () => {
    const html = `
      <h2>Material & laundrycare</h2>
      <p>Materials: Lace, silk satin, eyelash lace</p>
      <p>Lace composition: 65% Nylon, 35% Cotton</p>
      <p>Satin silk composition: 100% Silk</p>
    `;
    assert.equal(
      extractCompositionFromPageText(html),
      "100% Silk; lace: 65% Nylon; 35% Cotton"
    );
    const display = formatCompositionDisplay("100% Silk; lace: 65% Nylon; 35% Cotton");
    assert.equal(display.shellLine, "100% Silk");
    assert.equal(display.laceLine, "65% Nylon; 35% Cotton");
    assert.equal(display.hasSyntheticLace, true);
    assert.match(display.headline, /100%\s*Silk/i);
    assert.doesNotMatch(display.headline, /65%\s*Nylon\s*[·;].*35%\s*Silk/i);
  });

  it("shows the listed mix instead of unpublished/unknown", () => {
    const display = formatCompositionDisplay("55.7% Lyocell; 22.6% Cotton; 21.7% Cupro");
    assert.equal(display.hasPercentages, true);
    assert.equal(display.headline, "55.7% Lyocell; 22.6% Cotton; 21.7% Cupro");
    assert.notEqual(display.headline, "Material details unavailable");
  });
});

describe("price and currency trust", () => {
  it("keeps the visible euro price instead of a USD JSON-LD amount", () => {
    const html = `<p class="price">€465</p><span>$454.00</span>`;
    const visible = extractVisibleOffer(html);
    assert.equal(visible.currency, "EUR");
    assert.equal(visible.price, 465);
    const preferred = preferRetailerFacingOffer(
      { price: 454, currency: "USD" },
      visible
    );
    assert.equal(preferred.currency, "EUR");
    assert.equal(preferred.price, 465);
  });

  it("does not invent USD when currency is missing", () => {
    const preferred = preferRetailerFacingOffer(
      { price: 465, currency: null },
      { price: null, currency: null }
    );
    assert.equal(preferred.currency, null);
    assert.equal(preferred.price, 465);
    assert.equal(formatCapturePrice(465, null), "465");
    assert.equal(formatCapturePrice(465, "EUR"), "€465");
  });

  it("reads country from og:locale, not from a generic .com host", () => {
    const html = `<meta property="og:locale" content="fr_FR" />`;
    assert.equal(countryFromPage(html, "hanamer.com"), "FR");
    assert.equal(countryFromPage("", "hanamer.com"), null);
  });
});

describe("display consistency", () => {
  it("shows the brand once, title-cased", () => {
    assert.deepEqual(uniqueTitleCaseNames("hanamer", "hanamer"), ["Hanamer"]);
    assert.deepEqual(uniqueTitleCaseNames("hanamer", "hanamer.com"), ["Hanamer"]);
    assert.equal(titleCaseName("VERBENA SKIRT LILAC"), "Verbena Skirt Lilac");
    assert.equal(titleCaseName("Rag & Bone"), "Rag & Bone");
    assert.equal(shopAtLabel("go by go silk"), "Shop at Go By Go Silk →");
  });
});

describe("cross-platform identity helpers", () => {
  it("never trusts a body user id without a JWT", () => {
    assert.equal(resolveAuthenticatedUserId(null, "attacker-id"), null);
    assert.equal(resolveAuthenticatedUserId("real-user", "attacker-id"), "real-user");
  });

  it("maps capture source_app onto retailer click channels", () => {
    assert.equal(normalizeRetailerClickSource("chrome_extension"), "chrome_extension");
    assert.equal(normalizeRetailerClickSource("ios_app"), "ios_product_detail");
    assert.equal(normalizeRetailerClickSource("saved_inspiration"), "saved_inspiration");
    assert.equal(normalizeRetailerClickSource("unknown", "website"), "website");
  });
});
