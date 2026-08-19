import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountAuthHref,
  accountRedirectFromSearch,
  safeLoginReturnPath,
} from "../lib/auth-return-path.ts";
import { safeInternalPath } from "../lib/public-match-set.ts";

describe("safeLoginReturnPath", () => {
  it("returns to a match set and keeps save=1", () => {
    assert.equal(safeLoginReturnPath("/matches/abc?save=1"), "/matches/abc?save=1");
  });

  it("rejects the id-less /matches path that 404s", () => {
    assert.equal(safeLoginReturnPath("/matches"), null);
    assert.equal(safeLoginReturnPath("/matches/"), null);
    assert.equal(safeInternalPath("/matches"), "/matches");
  });

  it("maps legacy inspiration and capture ids onto /matches", () => {
    assert.equal(safeLoginReturnPath("/inspirations/abc"), "/matches/abc");
    assert.equal(safeLoginReturnPath("/capture/abc?save=1"), "/matches/abc?save=1");
    assert.equal(safeLoginReturnPath("/inspirations"), null);
  });

  it("does not bounce auth pages, home, or off-site URLs", () => {
    assert.equal(safeLoginReturnPath("/"), null);
    assert.equal(safeLoginReturnPath("/account"), null);
    assert.equal(safeLoginReturnPath("/login"), null);
    assert.equal(safeLoginReturnPath("/signin"), null);
    assert.equal(safeLoginReturnPath("/auth/callback"), null);
    assert.equal(safeLoginReturnPath("https://evil.example/matches/abc"), null);
  });

  it("sends favorites aliases to account instead of a 404", () => {
    assert.equal(safeLoginReturnPath("/favorites"), "/account");
    assert.equal(safeLoginReturnPath("/wishlist"), "/account");
  });
});

describe("accountAuthHref", () => {
  it("carries the current match set back after header sign-in", () => {
    assert.equal(
      accountAuthHref("login", "/matches/abc"),
      "/account?mode=login&next=%2Fmatches%2Fabc"
    );
  });

  it("does not send shoppers to /matches with no id", () => {
    assert.equal(accountAuthHref("login", "/matches"), "/account?mode=login");
    assert.equal(accountRedirectFromSearch({ next: "/matches" }), "/account?mode=login");
  });
});
