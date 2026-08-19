/**
 * Gmail prepare-drafts fixtures (no live Gmail).
 * Run: node --import tsx --test scripts/gmail-prepare-drafts.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  connectionHasComposeScope,
  personalizeTemplate,
  resolveContactFirstName,
  subjectMatchesTemplate,
} from "../lib/dashboard/gmail-prepare-drafts.ts";

test("subjectMatchesTemplate is case/punctuation tolerant", () => {
  assert.equal(
    subjectMatchesTemplate("You might love what we built", "you might love what we built"),
    true
  );
  assert.equal(
    subjectMatchesTemplate("I think you’d love the INTERTEXE clothing app", "i think you'd love the intertexe clothing"),
    true
  );
  assert.equal(
    subjectMatchesTemplate("Founding Material Data Pilot — {firstname}", "founding material data pilot"),
    true
  );
  assert.equal(subjectMatchesTemplate("Something else", "you might love what we built"), false);
});

test("personalizeTemplate replaces {firstname}", () => {
  assert.equal(personalizeTemplate("Hi {firstname},", "Alex"), "Hi Alex,");
  assert.equal(personalizeTemplate("Hi {first_name},", "Sam"), "Hi Sam,");
  assert.equal(personalizeTemplate("Hi {{firstname}},", "Jo"), "Hi Jo,");
  assert.equal(personalizeTemplate("Hi {firstname},", ""), "Hi there,");
});

test("resolveContactFirstName prefers first_name", () => {
  assert.equal(resolveContactFirstName({ first_name: "Khiteri", full_name: "Khiteri Arab" }), "Khiteri");
  assert.equal(resolveContactFirstName({ first_name: null, full_name: "Alex Rivera" }), "Alex");
  assert.equal(resolveContactFirstName({}), "there");
});

test("compose scope detection", () => {
  assert.equal(connectionHasComposeScope(["https://www.googleapis.com/auth/gmail.readonly"]), false);
  assert.equal(
    connectionHasComposeScope([
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
    ]),
    true
  );
});
