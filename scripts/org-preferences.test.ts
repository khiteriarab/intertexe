import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultMassUnitForCountry,
  formatMassFromGrams,
  parseMassInputToGrams,
} from "../lib/enterprise/org-preferences";

describe("organization measurement preferences", () => {
  it("defaults US to imperial and FR to metric", () => {
    assert.equal(defaultMassUnitForCountry("US"), "imperial");
    assert.equal(defaultMassUnitForCountry("FR"), "metric");
  });

  it("formats grams in metric and imperial", () => {
    assert.equal(formatMassFromGrams(240, "metric"), "240g");
    assert.equal(formatMassFromGrams(240, "imperial"), "8.47 oz");
    assert.equal(formatMassFromGrams(1200, "metric"), "1.20 kg");
  });

  it("parses mixed mass inputs to grams", () => {
    assert.equal(parseMassInputToGrams("240g"), 240);
    assert.equal(parseMassInputToGrams("1 kg"), 1000);
    assert.ok(Math.abs((parseMassInputToGrams("8.47 oz") || 0) - 240) < 0.5);
  });
});
