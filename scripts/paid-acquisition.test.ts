import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  classifyPaidPlatform,
  creativeKey,
  type UserAttributionRow,
} from "../lib/dashboard/paid-acquisition.ts";

describe("classifyPaidPlatform", () => {
  it("detects TikTok via ttclid", () => {
    assert.equal(classifyPaidPlatform({ ttclid: "abc" }), "tiktok");
  });

  it("detects Meta via fbclid", () => {
    assert.equal(classifyPaidPlatform({ fbclid: "xyz" }), "meta");
  });

  it("detects TikTok via source", () => {
    assert.equal(classifyPaidPlatform({ first_touch_source: "tiktok" }), "tiktok");
  });

  it("detects paid medium with unknown source as other_paid", () => {
    assert.equal(
      classifyPaidPlatform({ first_touch_source: "newsletter", first_touch_medium: "paid" }),
      "other_paid"
    );
  });

  it("returns unknown when no signals", () => {
    assert.equal(classifyPaidPlatform({}), "unknown");
  });
});

describe("creativeKey", () => {
  it("uses utm_content as creative", () => {
    const row: UserAttributionRow = {
      userId: "1",
      registeredAt: null,
      firstTouchAt: null,
      source: "tiktok",
      medium: "paid",
      campaign: "promote_a",
      content: "creative_a",
      ttclid: null,
      fbclid: null,
      gclid: null,
      platform: "ios",
    };
    assert.deepEqual(creativeKey(row), {
      campaign: "promote_a",
      creative: "creative_a",
    });
  });
});

describe("HQ acquisition page", () => {
  it("imports PaidAcquisitionSection so the page does not crash", () => {
    const src = readFileSync("app/dashboard/(app)/acquisition/page.tsx", "utf8");
    assert.match(src, /import\s*\{\s*PaidAcquisitionSection\s*\}\s*from\s*"\.\.\/\.\.\/components\/PaidAcquisitionSection"/);
    assert.match(src, /<PaidAcquisitionSection\s+report=\{paidAcquisition\}\s*\/>/);
  });
});
