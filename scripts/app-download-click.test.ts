/**
 * App download click channel classifier fixtures.
 * Run: node --import tsx --test scripts/app-download-click.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { classifyAppDownloadChannel } from "../lib/app-download-channel.ts";
import { getUniversalOpenUrl } from "../lib/app-store.ts";

test("classifyAppDownloadChannel maps paid + email + qr tags", () => {
  assert.equal(classifyAppDownloadChannel({ utm_source: "facebook", utm_medium: "paid" }), "meta");
  assert.equal(classifyAppDownloadChannel({ fbclid: "abc" }), "meta");
  assert.equal(classifyAppDownloadChannel({ utm_source: "tiktok", utm_medium: "paid" }), "tiktok");
  assert.equal(classifyAppDownloadChannel({ ttclid: "tt" }), "tiktok");
  assert.equal(
    classifyAppDownloadChannel({ utm_source: "loops", utm_medium: "email", cta_location: "email_founder_welcome" }),
    "email"
  );
  assert.equal(
    classifyAppDownloadChannel({ utm_source: "desktop_qr", utm_medium: "qr", cta_location: "scanner_desktop_qr" }),
    "qr"
  );
  assert.equal(classifyAppDownloadChannel({ utm_source: "sticker", utm_medium: "qr" }), "qr");
  assert.equal(classifyAppDownloadChannel({}), "website");
  assert.equal(classifyAppDownloadChannel({ utm_source: "newsletter_partner" }), "email");
  assert.equal(classifyAppDownloadChannel({ utm_source: "reddit", utm_medium: "social" }), "other");
});

test("getUniversalOpenUrl preserves itx_cta and utm params", () => {
  const url = getUniversalOpenUrl("/scanner", {
    cta: "home_banner",
    params: { utm_source: "website", utm_medium: "cta" },
  });
  assert.match(url, /^https:\/\/www\.intertexe\.com\/open\?/);
  assert.match(url, /next=%2Fscanner/);
  assert.match(url, /itx_cta=home_banner/);
  assert.match(url, /utm_source=website/);
  assert.match(url, /utm_medium=cta/);
});
