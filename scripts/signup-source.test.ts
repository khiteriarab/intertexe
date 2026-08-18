/**
 * Signup source + Chrome extension Founder Welcome wiring (no live sends).
 * Run: npm run test:founder-welcome
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  applySignupSourceToFirstTouch,
  isDuplicateSupabaseSignUp,
  parseSignupSource,
  welcomeSourceForSignup,
} from "../lib/signup-source.ts";
import {
  extractFirstTouchFromRequest,
  firstTouchToPreferenceColumns,
} from "../lib/dashboard/attribution.ts";

test("parseSignupSource maps chrome extension and defaults to web", () => {
  assert.equal(parseSignupSource("chrome_extension"), "chrome_extension");
  assert.equal(parseSignupSource("extension"), "chrome_extension");
  assert.equal(parseSignupSource("ios"), "ios");
  assert.equal(parseSignupSource(undefined), "web_signup");
  assert.equal(parseSignupSource("shop"), "web_signup");
});

test("welcome metadata source follows signup channel", () => {
  assert.equal(welcomeSourceForSignup("chrome_extension"), "chrome_extension");
  assert.equal(welcomeSourceForSignup("ios"), "ios_signup");
  assert.equal(welcomeSourceForSignup("web_signup"), "web_signup");
});

test("duplicate supabase signup is identities=[] fake success", () => {
  assert.equal(isDuplicateSupabaseSignUp({ identities: [] }), true);
  assert.equal(isDuplicateSupabaseSignUp({ identities: [{ id: "1" }] }), false);
  assert.equal(isDuplicateSupabaseSignUp({ identities: null }), false);
  assert.equal(isDuplicateSupabaseSignUp(null), false);
});

test("chrome_extension first-touch records signup_source and platform", () => {
  const ft = applySignupSourceToFirstTouch(
    extractFirstTouchFromRequest(new Request("https://www.intertexe.com/api/auth/signup")),
    "chrome_extension"
  );
  assert.equal(ft.acquisition_platform, "chrome_extension");
  assert.equal(ft.utm_source, "chrome_extension");
  assert.equal(ft.utm_medium, "extension");
  assert.equal(ft.attribution_extra?.signup_source, "chrome_extension");
  const cols = firstTouchToPreferenceColumns(ft);
  assert.equal(cols.acquisition_platform, "chrome_extension");
  assert.equal((cols.attribution_extra as { signup_source: string }).signup_source, "chrome_extension");
  assert.ok(cols.first_touch_at);
});

test("clickout body.source shop does not become chrome_extension", () => {
  const ft = extractFirstTouchFromRequest(
    new Request("https://www.intertexe.com/api/account/product-clickout"),
    { source: "shop" }
  );
  assert.equal(ft.acquisition_platform, "website");
});
