import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { SHOP_SHOE_FIBER_OPTIONS, SHOP_SHOE_TYPES } from "../lib/catalog-filter-options.ts";
import {
  parseShoeMaterial,
  parseShoeType,
  resolveFootwearBrowseFilters,
  SHOE_MATERIAL_OPTIONS,
  SHOE_TYPE_OPTIONS,
  shoeMatchesMaterial,
  shoeMatchesType,
  shoeMaterialSearchTokens,
  shoesCatalogHref,
  shoeTypeSearchTokens,
} from "../lib/footwear-filters.ts";

describe("Footwear type + material contract", () => {
  it("reuses the shared shoe type and fiber lists", () => {
    assert.deepEqual([...SHOE_TYPE_OPTIONS], [...SHOP_SHOE_TYPES]);
    assert.deepEqual(
      SHOE_MATERIAL_OPTIONS.map((o) => o.key),
      SHOP_SHOE_FIBER_OPTIONS.map((o) => o.key)
    );
    assert.deepEqual([...SHOP_SHOE_TYPES], [
      "Boots",
      "Sandals",
      "Heels",
      "Sneakers",
      "Loafers",
      "Flats",
      "Mules",
      "Espadrilles",
    ]);
    assert.ok(SHOP_SHOE_FIBER_OPTIONS.some((o) => o.key === "leather"));
    assert.ok(SHOP_SHOE_FIBER_OPTIONS.some((o) => o.key === "suede"));
  });

  it("parses type and material from URL params", () => {
    assert.equal(parseShoeType("sandals"), "Sandals");
    assert.equal(parseShoeType("BOOTS"), "Boots");
    assert.equal(parseShoeType("pumps"), null);
    assert.equal(parseShoeMaterial("suede"), "suede");
    assert.equal(parseShoeMaterial("all"), null);
    assert.equal(parseShoeMaterial("silk"), null);
  });

  it("does not use %flat% so platform sandals stay out of Flats", () => {
    const tokens = shoeTypeSearchTokens("Flats");
    assert.equal(tokens.includes("flat"), false);
    assert.ok(tokens.includes("flats"));
    assert.ok(tokens.includes("ballet"));
    assert.equal(
      shoeMatchesType({ name: "Leather Platform Sandal", category: "Shoes" }, "Flats"),
      false
    );
    assert.equal(
      shoeMatchesType({ name: "Ballet Flats", category: "Shoes" }, "Flats"),
      true
    );
  });

  it("matches boot vs sandal names", () => {
    assert.equal(
      shoeMatchesType({ name: "Chelsea Boot", category: "Shoes" }, "Boots"),
      true
    );
    assert.equal(
      shoeMatchesType({ name: "Leather Slide Sandal", category: "Shoes" }, "Boots"),
      false
    );
    assert.equal(
      shoeMatchesType({ name: "Leather Slide Sandal", category: "Shoes" }, "Sandals"),
      true
    );
  });

  it("matches leather and suede from composition copy", () => {
    assert.ok(shoeMaterialSearchTokens("leather").includes("calfskin"));
    assert.equal(
      shoeMatchesMaterial({ name: "Chelsea Boot", composition: "100% Calfskin" }, "leather"),
      true
    );
    assert.equal(
      shoeMatchesMaterial({ name: "Suede Mule", composition: "100% Suede" }, "suede"),
      true
    );
    assert.equal(
      shoeMatchesMaterial({ name: "Canvas Trainer", composition: "100% Cotton canvas" }, "leather"),
      false
    );
    assert.equal(
      shoeMatchesMaterial({ name: "Canvas Trainer", composition: "100% Cotton canvas" }, "canvas"),
      true
    );
  });
});

describe("Shoes PLP wiring", () => {
  it("puts type and material menus on /shop/shoes and queries the footwear MV", () => {
    const client = fs.readFileSync(path.join(process.cwd(), "app/shop/shoes/ShoesClient.tsx"), "utf8");
    const page = fs.readFileSync(path.join(process.cwd(), "app/shop/shoes/page.tsx"), "utf8");
    const actions = fs.readFileSync(path.join(process.cwd(), "app/shop/shoes/actions.ts"), "utf8");
    const catalog = fs.readFileSync(path.join(process.cwd(), "lib/footwear-catalog.ts"), "utf8");
    assert.match(client, /data-testid="shoes-type-menu"/);
    assert.match(client, /data-testid="shoes-material-menu"/);
    assert.match(client, /SHOE_TYPE_OPTIONS/);
    assert.match(client, /SHOE_MATERIAL_OPTIONS/);
    assert.match(page, /parseShoeType/);
    assert.match(page, /parseShoeMaterial/);
    assert.match(actions, /type: opts\?\.type/);
    assert.match(actions, /material: opts\?\.material/);
    assert.match(catalog, /live_products_footwear/);
    assert.match(catalog, /applyFootwearFilters/);
    assert.doesNotMatch(catalog, /\.from\(["']products["']\)/);
  });

  it("maps iOS filter aliases onto type + material", () => {
    assert.deepEqual(
      resolveFootwearBrowseFilters({ subcategory: "sandals", fiber: "suede" }),
      { type: "Sandals", material: "suede" }
    );
    assert.deepEqual(
      resolveFootwearBrowseFilters({ shoeType: "Boots", materialSubtype: "leather" }),
      { type: "Boots", material: "leather" }
    );
    assert.deepEqual(
      resolveFootwearBrowseFilters({ search: "heels", material: "nubuck" }),
      { type: "Heels", material: "nubuck" }
    );
    assert.equal(shoesCatalogHref({ type: "sandals", material: "suede" }), "/shop/shoes?type=Sandals&material=suede");
  });

  it("sends iOS /api/shop and clothing shop onto the footwear catalog", () => {
    const shopApi = fs.readFileSync(path.join(process.cwd(), "app/api/shop/route.ts"), "utf8");
    const filters = fs.readFileSync(path.join(process.cwd(), "app/api/shop/filters/route.ts"), "utf8");
    const clothing = fs.readFileSync(path.join(process.cwd(), "app/shop/page.tsx"), "utf8");
    const client = fs.readFileSync(path.join(process.cwd(), "app/shop/ShopClient.tsx"), "utf8");
    const direct = fs.readFileSync(path.join(process.cwd(), "lib/catalog-direct-query.ts"), "utf8");
    assert.match(shopApi, /searchParams\.get\("type"\)/);
    assert.match(shopApi, /searchParams\.get\("material"\)/);
    assert.match(filters, /\/shop\/shoes/);
    assert.match(clothing, /shoesCatalogHref/);
    assert.match(clothing, /redirect\(/);
    assert.match(client, /shoesCatalogHref\(\)/);
    assert.match(direct, /fetchFootwearCatalogPage/);
    assert.match(direct, /shoesBrowse/);
  });
});
