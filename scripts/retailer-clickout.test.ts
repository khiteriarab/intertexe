import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanRetailerDestinationUrl,
  extractAffiliateDestination,
  extractRakutenMid,
  improveRetailerClickoutUrl,
  retailerOpenDestinationUrl,
  toRakutenDeeplink,
} from "../lib/retailer-clickout";

const OFFER_URL =
  "https://click.linksynergy.com/link?id=*8b0zWDyXo0&offerid=2033543.4317214617962429727242379&type=15&murl=https%3A%2F%2Fwww.mytheresa.com%2Fus%2Fen%2Fwomen%2Fsaint-laurent-lace-trimmed-ribbed-knit-silk-camisole-yellow-p01128200%3Ffeed_num%3DP01128200%26feed_des%3DSaintLaurent%26feed_mwg%3Dclothing";

test("extracts MyTheresa destination from offer link", () => {
  const dest = extractAffiliateDestination(OFFER_URL);
  assert.ok(dest);
  assert.match(dest!, /mytheresa\.com.*p01128200/i);
  assert.match(dest!, /feed_num=/);
});

test("extractRakutenMid reads 43172 from offerid prefix", () => {
  assert.equal(extractRakutenMid(OFFER_URL), "43172");
});

test("cleanRetailerDestinationUrl strips feed tracking params", () => {
  const dest = extractAffiliateDestination(OFFER_URL)!;
  const cleaned = cleanRetailerDestinationUrl(dest);
  assert.equal(
    cleaned,
    "https://www.mytheresa.com/us/en/women/saint-laurent-lace-trimmed-ribbed-knit-silk-camisole-yellow-p01128200"
  );
  assert.doesNotMatch(cleaned, /feed_num/);
});

test("improveRetailerClickoutUrl rebuilds as deeplink with clean murl", () => {
  const improved = improveRetailerClickoutUrl(OFFER_URL);
  assert.match(improved, /click\.linksynergy\.com\/deeplink/);
  assert.match(improved, /mid=43172/);
  const dest = extractAffiliateDestination(improved)!;
  assert.equal(
    dest,
    "https://www.mytheresa.com/us/en/women/saint-laurent-lace-trimmed-ribbed-knit-silk-camisole-yellow-p01128200"
  );
});

test("retailerOpenDestinationUrl returns clean PDP for app open", () => {
  assert.equal(
    retailerOpenDestinationUrl(OFFER_URL),
    "https://www.mytheresa.com/us/en/women/saint-laurent-lace-trimmed-ribbed-knit-silk-camisole-yellow-p01128200"
  );
});

test("toRakutenDeeplink is stable when already a deeplink", () => {
  const once = toRakutenDeeplink(OFFER_URL);
  const twice = toRakutenDeeplink(once);
  assert.equal(once, twice);
});
