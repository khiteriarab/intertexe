/**
 * Founder Welcome Loops gate + identity fixtures (no live Loops/Resend sends).
 * Run: npm run test:founder-welcome
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  EMAIL_FROM,
  EMAIL_FROM_FOUNDER,
  EMAIL_REPLY_TO,
  EMAIL_REPLY_TO_FOUNDER,
  EMAIL_TYPES,
  founderWelcomeSubject,
} from "../lib/email-constants.ts";
import {
  getFounderWelcomeTransactionalId,
  isLoopsFounderWelcomeEnabled,
} from "../lib/loops.ts";
import { resolveWelcomeCtaUrl } from "../lib/founder-welcome.ts";
import { getAppSchemeOpenUrl } from "../lib/app-store.ts";

test("channel split identities", () => {
  assert.equal(EMAIL_FROM, "Intertexe <info@mail.intertexe.com>");
  assert.equal(EMAIL_REPLY_TO, "info@intertexe.com");
  assert.equal(EMAIL_FROM_FOUNDER, "Khiteri <khiteri@intertexe.com>");
  assert.equal(EMAIL_REPLY_TO_FOUNDER, "khiteri@intertexe.com");
  assert.equal(EMAIL_TYPES.FOUNDER_WELCOME, "founder_welcome");
});

test("founder welcome subject", () => {
  assert.equal(founderWelcomeSubject("Alex"), "Welcome to INTERTEXE, Alex 🤍");
  assert.equal(founderWelcomeSubject(""), "Welcome to INTERTEXE 🤍");
});

test("Loops founder welcome is gated off by default", () => {
  const prevEnabled = process.env.LOOPS_FOUNDER_WELCOME_ENABLED;
  const prevId = process.env.LOOPS_FOUNDER_WELCOME_TRANSACTIONAL_ID;
  delete process.env.LOOPS_FOUNDER_WELCOME_ENABLED;
  delete process.env.LOOPS_FOUNDER_WELCOME_TRANSACTIONAL_ID;

  assert.equal(isLoopsFounderWelcomeEnabled(), false);
  assert.equal(getFounderWelcomeTransactionalId(), null);

  process.env.LOOPS_FOUNDER_WELCOME_ENABLED = "1";
  process.env.LOOPS_FOUNDER_WELCOME_TRANSACTIONAL_ID = "cl_test_tx";
  assert.equal(isLoopsFounderWelcomeEnabled(), true);
  assert.equal(getFounderWelcomeTransactionalId(), "cl_test_tx");

  if (prevEnabled === undefined) delete process.env.LOOPS_FOUNDER_WELCOME_ENABLED;
  else process.env.LOOPS_FOUNDER_WELCOME_ENABLED = prevEnabled;
  if (prevId === undefined) delete process.env.LOOPS_FOUNDER_WELCOME_TRANSACTIONAL_ID;
  else process.env.LOOPS_FOUNDER_WELCOME_TRANSACTIONAL_ID = prevId;
});

test("welcome CTA opens the installed app via /open", () => {
  const url = resolveWelcomeCtaUrl();
  assert.equal(
    url,
    "https://www.intertexe.com/open?itx_cta=email_founder_welcome&utm_source=loops&utm_medium=email&utm_campaign=founder_welcome"
  );
});

test("custom scheme opens the installed app when Gmail swallows Universal Links", () => {
  assert.equal(getAppSchemeOpenUrl(), "intertexe://");
  assert.equal(getAppSchemeOpenUrl("/scanner"), "intertexe://open?next=%2Fscanner");
});

test("Loops template dataVariables include lowercase firstname", () => {
  // Production failure 2026-08-14: "Missing required data variable(s): firstname."
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../lib/founder-welcome.ts"),
    "utf8"
  );
  assert.match(src, /firstname:/);
  assert.match(src, /firstName:/);
  assert.match(src, /ctaUrl/);
});
