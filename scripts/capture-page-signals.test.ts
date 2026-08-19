import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countryFromPage,
  extractLabeledMaterial,
  extractVisibleOffer,
  formatCapturePrice,
  looksLikeListedMaterial,
  looksLikePercentageComposition,
  preferRetailerFacingOffer,
  shopAtLabel,
  titleCaseName,
  uniqueTitleCaseNames,
  collapseRepeatedMaterials,
  normalizeListedMaterial,
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
  });

  it("collapses repeated silk from a retailer dump", () => {
    assert.equal(collapseRepeatedMaterials("SILK, SILK, silk, silk, silk, SILK, SILK, SILK"), "Silk");
    assert.equal(normalizeListedMaterial("SILK, SILK, silk, silk"), "Silk");
    assert.equal(collapseRepeatedMaterials("Retailer lists: SILK, SILK, silk, silk"), "Retailer lists: Silk");
    assert.equal(collapseRepeatedMaterials("70% cotton, 30% silk"), "70% Cotton, 30% Silk");
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
    assert.equal(formatCapturePrice(0, "USD"), null);
    assert.equal(formatCapturePrice("0", "EUR"), null);
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
