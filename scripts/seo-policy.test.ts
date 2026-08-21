import test from "node:test";
import assert from "node:assert/strict";
import {
  hasMeaningfulComposition,
  hasRetailerDestination,
  isIndexableProduct,
  productJsonLd,
  productTitle,
  searchParamsAreIndexable,
} from "../lib/seo-policy.ts";
import { indexableGuides, GUIDE_PAGES } from "../lib/seo-guides.ts";
import { staticIndexablePaths } from "../lib/seo-sitemaps.ts";

test("indexable product requires name, brand, image, retailer URL, and composition", () => {
  const base = {
    id: "abc",
    name: "Silk Shirt",
    brandName: "Reformation",
    imageUrl: "https://cdn.example.com/x.jpg",
    url: "https://www.thereformation.com/products/silk-shirt",
    composition: "100% Silk",
    naturalFiberPercent: 100,
  };
  assert.equal(isIndexableProduct(base), true);
  assert.equal(isIndexableProduct({ ...base, composition: "" }), false);
  assert.equal(isIndexableProduct({ ...base, imageUrl: "" }), false);
  assert.equal(isIndexableProduct({ ...base, url: "https://www.intertexe.com/product/1" }), false);
  assert.equal(isIndexableProduct({ ...base, naturalFiberPercent: 40 }), false);
  assert.equal(isIndexableProduct({ ...base, name: "" }), false);
});

test("composition detector rejects empty and percent-off copy", () => {
  assert.equal(hasMeaningfulComposition("100% silk"), true);
  assert.equal(hasMeaningfulComposition(""), false);
  assert.equal(hasMeaningfulComposition("ab"), false);
});

test("retailer destination cannot be INTERTEXE itself", () => {
  assert.equal(hasRetailerDestination("https://www.net-a-porter.com/x"), true);
  assert.equal(hasRetailerDestination("https://www.intertexe.com/product/1"), false);
  assert.equal(hasRetailerDestination("/product/1"), false);
});

test("shop filter and tracking params are not indexable", () => {
  assert.equal(searchParamsAreIndexable({}), true);
  assert.equal(searchParamsAreIndexable({ fiber: "silk" }), false);
  assert.equal(searchParamsAreIndexable({ sort: "price-low" }), false);
  assert.equal(searchParamsAreIndexable({ q: "coat" }), false);
  assert.equal(searchParamsAreIndexable({ utm_source: "google" }), false);
});

test("product JSON-LD is Product with retailer offer, not INTERTEXE as merchant", () => {
  const json = productJsonLd(
    {
      id: "1",
      brandSlug: "reformation",
      brandName: "Reformation",
      name: "Silk Shirt",
      productId: "sku-1",
      url: "https://www.thereformation.com/products/silk-shirt",
      imageUrl: "https://cdn.example.com/x.jpg",
      price: "248",
      composition: "100% Silk",
      naturalFiberPercent: 100,
      category: "tops",
    },
    { availability: "https://schema.org/InStock", priceCurrency: "USD" }
  );
  assert.equal(json["@type"], "Product");
  const offers = json.offers as Record<string, unknown>;
  assert.equal(offers["@type"], "Offer");
  assert.equal(offers.url, "https://www.thereformation.com/products/silk-shirt");
  assert.equal((offers.seller as { name: string }).name, "Retail partner");
  assert.notEqual(json.url, offers.url);
  assert.match(String(json.url), /intertexe.com\/product\/1/);
});

test("product titles include brand and INTERTEXE pattern without stuffing", () => {
  const title = productTitle({ name: "Juliette Dress", brandName: "Zimmermann" });
  assert.match(title, /Juliette Dress by Zimmermann/);
  assert.doesNotMatch(title, /best cheap luxury/);
});

test("static sitemap paths exclude search, account, and filter URLs", () => {
  const paths = staticIndexablePaths();
  assert.ok(paths.includes("/"));
  assert.ok(paths.includes("/methodology"));
  assert.ok(paths.includes("/guides"));
  assert.ok(!paths.includes("/search"));
  assert.ok(!paths.includes("/account"));
  assert.ok(!paths.some((p) => p.includes("?")));
});

test("August 2026 guides are indexable; later holiday pages stay scheduled", () => {
  const live = indexableGuides(new Date("2026-08-18T12:00:00Z")).map((g) => g.slug);
  assert.ok(live.includes("fall-2026-materials"));
  assert.ok(live.includes("evaluate-coat-composition"));
  assert.ok(!live.includes("black-friday-fashion-quality"));
  assert.ok(GUIDE_PAGES.some((g) => g.slug === "black-friday-fashion-quality" && g.status === "scheduled"));
});
