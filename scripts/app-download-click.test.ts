/**
 * App download click channel classifier fixtures.
 * Run: node --import tsx --test scripts/app-download-click.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { classifyAppDownloadChannel } from "../lib/app-download-channel.ts";
import { getUniversalOpenUrl } from "../lib/app-store.ts";
import { shouldSkipAppOpenLanding, webPathFromOpenNext } from "../lib/app-open-landing.ts";

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

test("desktop capture links skip the /open waiting page", () => {
  assert.equal(webPathFromOpenNext("/capture/abc"), "/matches/abc");
  assert.equal(webPathFromOpenNext("/inspirations/abc"), "/matches/abc");
  assert.equal(webPathFromOpenNext("/matches/abc"), "/matches/abc");
  assert.equal(
    shouldSkipAppOpenLanding({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120",
      next: "/capture/abc",
      cta: "chrome_extension_open",
    }),
    true
  );
  assert.equal(
    shouldSkipAppOpenLanding({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      next: "/capture/abc",
    }),
    false
  );
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
