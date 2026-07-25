import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computePeriodDelta, formatPeriodDelta } from "../lib/dashboard/period-delta.ts";

describe("computePeriodDelta", () => {
  it("returns incomplete when either side is missing", () => {
    const d = computePeriodDelta(10, null);
    assert.equal(d.complete, false);
    assert.equal(d.percent, null);
    assert.match(d.label || "", /incomplete/i);
  });

  it("does not invent percent when prior is zero", () => {
    const d = computePeriodDelta(12, 0);
    assert.equal(d.percent, null);
    assert.equal(d.absolute, 12);
    assert.match(d.label || "", /no prior baseline/i);
  });

  it("reports flat when unchanged", () => {
    const d = computePeriodDelta(5, 5, { periodLabel: "vs prior 7d" });
    assert.equal(d.percent, 0);
    assert.equal(d.label, "flat vs prior 7d");
  });

  it("computes percent when prior is non-zero", () => {
    const d = computePeriodDelta(47, 40, { periodLabel: "vs prior 7d" });
    assert.equal(d.absolute, 7);
    assert.ok(d.percent != null && Math.abs(d.percent - 17.5) < 0.01);
    assert.match(formatPeriodDelta(47, 40, { periodLabel: "vs prior 7d" }) || "", /\+7/);
  });
});
