import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyGarment,
} from "../lib/catalog-rules.js";

test("lingerie bikini mis-tagged swimwear routes to lingerie", () => {
  assert.equal(classifyGarment("swimwear", "Top Stitch Bikini"), "lingerie");
});

test("beach swim bikini stays swimwear", () => {
  assert.equal(classifyGarment("Swimwear", "Beach Bikini Top"), "swim_resortwear");
});

test("pajama shirt routes to sleepwear not shirts", () => {
  assert.equal(classifyGarment("Shirt", "Asceno Striped Silk Satin Pajama Shirt"), "sleepwear");
});

test("French robe dress is not sleepwear", () => {
  assert.equal(classifyGarment("Dress", "Ba & Sh Robe Ilona Denim Dress"), "dresses");
});
