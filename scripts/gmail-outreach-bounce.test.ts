/**
 * Gmail bounce matching + outreach status transitions.
 * Run: node --import tsx --test scripts/gmail-outreach-bounce.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { extractBouncedRecipients, isBounceMessage } from "../lib/dashboard/gmail-outreach.ts";
import { nextStatusForEvent } from "../lib/hq-contacts.ts";

test("isBounceMessage detects mailer-daemon and undeliverable subjects", () => {
  assert.equal(
    isBounceMessage({ from: ["mailer-daemon@googlemail.com"], subject: "Delivery Status Notification (Failure)" }),
    true
  );
  assert.equal(isBounceMessage({ from: ["alex@example.com"], subject: "Re: INTERTEXE" }), false);
  assert.equal(
    isBounceMessage({ from: ["postmaster@cfda.com"], subject: "Undeliverable: You might love what we built" }),
    true
  );
});

test("extractBouncedRecipients prefers X-Failed-Recipients that are known contacts", () => {
  const known = ["membership@cfda.com", "hello@intertexe.com"];
  assert.deepEqual(
    extractBouncedRecipients({
      failedRecipientsHeader: "membership@cfda.com",
      snippet: "Address not found hello@intertexe.com",
      subject: "Undeliverable",
      selfEmail: "hello@intertexe.com",
      knownEmails: known,
    }),
    ["membership@cfda.com"]
  );
});

test("extractBouncedRecipients falls back to snippet emails in hq_contacts", () => {
  assert.deepEqual(
    extractBouncedRecipients({
      failedRecipientsHeader: "",
      snippet: "The following address was not found: nataliejensen2005@gmail.com",
      subject: "Mail delivery failed",
      selfEmail: "hello@intertexe.com",
      knownEmails: ["nataliejensen2005@gmail.com"],
    }),
    ["nataliejensen2005@gmail.com"]
  );
});

test("nextStatusForEvent marks bounce as undeliverable unless converted", () => {
  assert.equal(nextStatusForEvent("contacted", "email_bounced"), "undeliverable");
  assert.equal(nextStatusForEvent("not_contacted", "email_bounced"), "undeliverable");
  assert.equal(nextStatusForEvent("converted", "email_bounced"), "converted");
  assert.equal(nextStatusForEvent("undeliverable", "email_sent"), "contacted");
});
