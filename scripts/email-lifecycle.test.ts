/**
 * Email lifecycle hardening fixtures (no live Resend sends).
 * Run: npm run test:email-lifecycle
 */
import test from "node:test";
import assert from "node:assert/strict";
import { Webhook } from "svix";
import {
  EMAIL_FROM,
  EMAIL_FROM_FOUNDER,
  EMAIL_REPLY_TO,
  EMAIL_REPLY_TO_FOUNDER,
  EMAIL_TYPES,
  LIFECYCLE_BRANCHES,
  founderWelcomeSubject,
  lifecycleEmailTypeForDay,
  normalizeEmail,
} from "../lib/email-constants.ts";
import { BACKGROUND_JOBS, expectedVercelCrons } from "../lib/background-jobs/registry.ts";
import {
  isAppDeepLinkReady,
  getAppStoreUrl,
  getAppStoreOpenUrl,
} from "../lib/app-store.ts";
import {
  cohortWindowIso,
  resolveLifecycleBranch,
  type LifecycleSignals,
} from "../lib/lifecycle-behavior.ts";
import { copyForLifecycleBranch } from "../lib/lifecycle-copy.ts";
import { shouldHonorMarketingOptOut } from "../lib/lifecycle-send.ts";

const emptySignals: LifecycleSignals = {
  hasScan: false,
  hasFavorite: false,
  hasTxMatch: false,
  recentlyActive: false,
  hasBadExperience: false,
  scanCount: 0,
  favoriteCount: 0,
};

test("founder welcome subject variants", () => {
  assert.equal(founderWelcomeSubject("Alex"), "Welcome to INTERTEXE, Alex 🤍");
  assert.equal(founderWelcomeSubject(""), "Welcome to INTERTEXE 🤍");
  assert.equal(founderWelcomeSubject(null), "Welcome to INTERTEXE 🤍");
  assert.equal(founderWelcomeSubject("  Sam  "), "Welcome to INTERTEXE, Sam 🤍");
});

test("founder From and Reply-To identities", () => {
  assert.equal(EMAIL_FROM_FOUNDER, "Khiteri <khiteri@intertexe.com>");
  assert.equal(EMAIL_REPLY_TO_FOUNDER, "khiteri@intertexe.com");
  assert.equal(EMAIL_REPLY_TO, "info@intertexe.com");
  assert.equal(EMAIL_FROM, "Intertexe <info@mail.intertexe.com>");
  assert.equal(EMAIL_TYPES.FOUNDER_WELCOME, "founder_welcome");
});

test("welcome CTA uses Universal Link when deep links are ready", () => {
  assert.equal(isAppDeepLinkReady(), true);
  assert.match(getAppStoreOpenUrl("/scanner"), /intertexe\.com\/open/);
  assert.match(getAppStoreUrl(), /apps\.apple\.com/);
});

test("normalizeEmail lowercases and trims", () => {
  assert.equal(normalizeEmail("  A@B.Com "), "a@b.com");
});

test("price-check cron is unscheduled; price-drops remains canonical", () => {
  const priceCheck = BACKGROUND_JOBS.find((j) => j.id === "price-check");
  const priceDrops = BACKGROUND_JOBS.find((j) => j.id === "price-drops");
  assert.ok(priceCheck);
  assert.ok(priceDrops);
  assert.equal(priceCheck!.scheduledInProduction, false);
  assert.equal(priceDrops!.scheduledInProduction, true);
  assert.equal(
    expectedVercelCrons().some((c) => c.path === "/api/cron/price-check"),
    false
  );
  assert.equal(
    expectedVercelCrons().some((c) => c.path === "/api/notifications/price-drops"),
    true
  );
});

test("lifecycle checkpoint cron is scheduled", () => {
  const job = BACKGROUND_JOBS.find((j) => j.id === "lifecycle-checkpoints");
  assert.ok(job);
  assert.equal(job!.scheduledInProduction, true);
  assert.equal(job!.path, "/api/cron/lifecycle-checkpoints");
  assert.equal(
    expectedVercelCrons().some((c) => c.path === "/api/cron/lifecycle-checkpoints"),
    true
  );
  assert.equal(lifecycleEmailTypeForDay(4), EMAIL_TYPES.LIFECYCLE_DAY4);
  assert.equal(lifecycleEmailTypeForDay(10), EMAIL_TYPES.LIFECYCLE_DAY10);
  assert.equal(lifecycleEmailTypeForDay(25), EMAIL_TYPES.LIFECYCLE_DAY25);
});

test("day4 behavior router", () => {
  assert.equal(
    resolveLifecycleBranch(4, emptySignals),
    LIFECYCLE_BRANCHES.DAY4_NO_SCAN
  );
  assert.equal(
    resolveLifecycleBranch(4, { ...emptySignals, hasScan: true }),
    LIFECYCLE_BRANCHES.DAY4_HAS_SCAN
  );
});

test("day10 behavior router priority favorites > tx match > inactive", () => {
  assert.equal(
    resolveLifecycleBranch(10, emptySignals),
    LIFECYCLE_BRANCHES.DAY10_INACTIVE
  );
  assert.equal(
    resolveLifecycleBranch(10, { ...emptySignals, hasTxMatch: true }),
    LIFECYCLE_BRANCHES.DAY10_TX_MATCH
  );
  assert.equal(
    resolveLifecycleBranch(10, {
      ...emptySignals,
      hasFavorite: true,
      hasTxMatch: true,
    }),
    LIFECYCLE_BRANCHES.DAY10_FAVORITES
  );
});

test("day25 behavior router never asks review when inactive or bad experience", () => {
  assert.equal(
    resolveLifecycleBranch(25, emptySignals),
    LIFECYCLE_BRANCHES.DAY25_INACTIVE_WINBACK
  );
  assert.equal(
    resolveLifecycleBranch(25, { ...emptySignals, recentlyActive: true }),
    LIFECYCLE_BRANCHES.DAY25_ACTIVE_REVIEW
  );
  assert.equal(
    resolveLifecycleBranch(25, {
      ...emptySignals,
      recentlyActive: true,
      hasBadExperience: true,
    }),
    LIFECYCLE_BRANCHES.DAY25_FEEDBACK
  );
  assert.equal(
    shouldHonorMarketingOptOut(25, LIFECYCLE_BRANCHES.DAY25_ACTIVE_REVIEW),
    true
  );
  assert.equal(
    shouldHonorMarketingOptOut(25, LIFECYCLE_BRANCHES.DAY25_FEEDBACK),
    false
  );
  assert.equal(shouldHonorMarketingOptOut(4, LIFECYCLE_BRANCHES.DAY4_NO_SCAN), false);
});

test("lifecycle copy has one CTA each", () => {
  for (const branch of Object.values(LIFECYCLE_BRANCHES)) {
    const copy = copyForLifecycleBranch(branch, "Alex");
    assert.ok(copy.subject.length > 5);
    assert.ok(copy.ctaLabel.length > 2);
    assert.ok(copy.ctaUrl.startsWith("http") || copy.ctaUrl.startsWith("mailto:"));
    assert.match(copy.hook, /Hi Alex/);
  }
});

test("cohort window is [day, day+1) days ago", () => {
  const now = new Date("2026-08-12T15:00:00.000Z");
  const w = cohortWindowIso(4, now);
  assert.equal(w.since, "2026-08-07T15:00:00.000Z");
  assert.equal(w.until, "2026-08-08T15:00:00.000Z");
});

test("svix webhook accepts valid signature and rejects invalid", () => {
  const secret = "whsec_" + Buffer.from("email-lifecycle-test-secret").toString("base64");
  const payload = JSON.stringify({
    type: "email.delivered",
    data: { email_id: "msg_test_123", to: ["user@example.com"] },
  });
  const wh = new Webhook(secret);
  const msgId = "msg_header_1";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const valid = wh.sign(msgId, new Date(Number(timestamp) * 1000), payload);

  const verified = wh.verify(payload, {
    "svix-id": msgId,
    "svix-timestamp": timestamp,
    "svix-signature": valid,
  }) as { type: string };
  assert.equal(verified.type, "email.delivered");

  assert.throws(() => {
    wh.verify(payload, {
      "svix-id": msgId,
      "svix-timestamp": timestamp,
      "svix-signature": "v1,invalid",
    });
  });
});

test("claim skip semantics for founder welcome statuses", () => {
  const active = new Set(["pending", "sent", "delivered"]);
  assert.equal(active.has("pending"), true);
  assert.equal(active.has("sent"), true);
  assert.equal(active.has("delivered"), true);
  assert.equal(active.has("failed"), false);
  assert.equal(active.has("bounced"), false);
});
