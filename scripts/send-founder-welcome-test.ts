#!/usr/bin/env node
/**
 * Internal Founder Welcome test via Loops.
 *
 * Usage (after Loops template is published + domain verified):
 *   LOOPS_API_KEY=… \
 *   LOOPS_FOUNDER_WELCOME_TRANSACTIONAL_ID=… \
 *   LOOPS_FOUNDER_WELCOME_ENABLED=1 \
 *   FOUNDER_WELCOME_TEST_EMAIL=you+test@intertexe.com \
 *   node --import tsx --env-file=.env.vercel.local scripts/send-founder-welcome-test.ts
 *
 * Does NOT fall back to Resend. Requires explicit LOOPS_FOUNDER_WELCOME_ENABLED=1.
 */
import { verifyLoopsApiKey, getFounderWelcomeTransactionalId, isLoopsFounderWelcomeEnabled } from "../lib/loops.ts";
import { sendWelcomeEmail } from "../lib/founder-welcome.ts";

async function main() {
  const email = (process.env.FOUNDER_WELCOME_TEST_EMAIL || "").trim().toLowerCase();
  if (!email) {
    console.error("Set FOUNDER_WELCOME_TEST_EMAIL to an internal address.");
    process.exit(1);
  }

  console.log("1) Verifying Loops API key…");
  const keyCheck = await verifyLoopsApiKey();
  if (!keyCheck.ok) {
    console.error("LOOPS_API_KEY invalid:", keyCheck.error);
    console.error("Get a key from https://app.loops.so/settings?page=api");
    process.exit(1);
  }
  console.log("   OK — team:", keyCheck.teamName || "(unnamed)");

  if (!isLoopsFounderWelcomeEnabled()) {
    console.error("LOOPS_FOUNDER_WELCOME_ENABLED must be 1 for this test.");
    process.exit(1);
  }
  const txId = getFounderWelcomeTransactionalId();
  if (!txId) {
    console.error("LOOPS_FOUNDER_WELCOME_TRANSACTIONAL_ID missing.");
    process.exit(1);
  }
  console.log("2) Transactional ID:", txId);
  console.log("3) Sending Founder Welcome to", email);

  const result = await sendWelcomeEmail({
    email,
    firstName: "Test",
    source: "internal_founder_welcome_test",
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok && !result.skipped) process.exit(1);
  console.log("Check inbox + HQ /dashboard/email for provider=loops row.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
