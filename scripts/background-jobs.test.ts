/**
 * Background job protection fixtures.
 * Run: npm run test:background-jobs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertWarmRoutesAllowed,
  isWarmPathForbidden,
  isWarmPathAllowed,
} from "../lib/background-jobs/warm-policy.ts";
import {
  expectedVercelCrons,
  BACKGROUND_JOBS,
  MAX_MONTHLY_INVOCATIONS_WITHOUT_FOUNDER_REVIEW,
} from "../lib/background-jobs/registry.ts";
import { warmCronEnabled, expensiveJobsEnabled } from "../lib/job-guard.ts";

test("warm defaults off", () => {
  const prev = process.env.WARM_CRON_ENABLED;
  delete process.env.WARM_CRON_ENABLED;
  assert.equal(warmCronEnabled(), false);
  if (prev === undefined) delete process.env.WARM_CRON_ENABLED;
  else process.env.WARM_CRON_ENABLED = prev;
});

test("expensive background jobs default off", () => {
  const prev = process.env.EXPENSIVE_BACKGROUND_JOBS_ENABLED;
  const prevBg = process.env.BACKGROUND_JOBS_ENABLED;
  delete process.env.EXPENSIVE_BACKGROUND_JOBS_ENABLED;
  delete process.env.BACKGROUND_JOBS_ENABLED;
  assert.equal(expensiveJobsEnabled(), false);
  if (prev === undefined) delete process.env.EXPENSIVE_BACKGROUND_JOBS_ENABLED;
  else process.env.EXPENSIVE_BACKGROUND_JOBS_ENABLED = prev;
  if (prevBg === undefined) delete process.env.BACKGROUND_JOBS_ENABLED;
  else process.env.BACKGROUND_JOBS_ENABLED = prevBg;
});

test("catalog-snapshot is registered but not scheduled", () => {
  const snap = BACKGROUND_JOBS.find((j) => j.id === "catalog-snapshot");
  assert.ok(snap);
  assert.equal(snap!.scheduledInProduction, false);
  assert.equal(snap!.schedule, null);
  assert.equal(
    expectedVercelCrons().some((c) => c.path.includes("/catalog-snapshot")),
    false
  );
});

test("gmail outreach sync is scheduled hourly and not expensive", () => {
  const job = BACKGROUND_JOBS.find((j) => j.id === "gmail-outreach-sync");
  assert.ok(job);
  assert.equal(job!.scheduledInProduction, true);
  assert.equal(job!.expensive, false);
  assert.equal(job!.schedule, "15 * * * *");
});

test("contacts sheet sync is retired after one-time import", () => {
  const job = BACKGROUND_JOBS.find((j) => j.id === "hq-contacts-sheet-sync");
  assert.ok(job);
  assert.equal(job!.scheduledInProduction, false);
  assert.equal(job!.schedule, null);
});

test("catalog/sale/scan/recommend are forbidden warm targets", () => {
  assert.equal(isWarmPathForbidden("/api/catalog?region=us"), true);
  assert.equal(isWarmPathForbidden("/api/sale"), true);
  assert.equal(isWarmPathForbidden("/api/scan"), true);
  assert.equal(isWarmPathForbidden("/api/recommend/products"), true);
  assert.equal(isWarmPathAllowed("/api/health"), true);
  assert.equal(assertWarmRoutesAllowed(["/api/health"]).ok, true);
  assert.equal(assertWarmRoutesAllowed(["/api/catalog"]).ok, false);
});

test("warm job is registered but not scheduled", () => {
  const warm = BACKGROUND_JOBS.find((j) => j.id === "warm");
  assert.ok(warm);
  assert.equal(warm!.scheduledInProduction, false);
  assert.equal(warm!.schedule, null);
  assert.equal(
    expectedVercelCrons().some((c) => c.path.includes("/warm")),
    false
  );
});

test("no scheduled job exceeds founder monthly invocation ceiling", () => {
  for (const job of BACKGROUND_JOBS.filter((j) => j.scheduledInProduction)) {
    assert.ok(
      job.expectedMonthlyInvocations <= MAX_MONTHLY_INVOCATIONS_WITHOUT_FOUNDER_REVIEW,
      `${job.id} too frequent`
    );
  }
});

test("every scheduled job has cost-review justification", () => {
  for (const job of BACKGROUND_JOBS.filter((j) => j.scheduledInProduction)) {
    assert.ok(job.justification.length >= 20, job.id);
    assert.ok(job.expectedMonthlyInvocations >= 0, job.id);
    assert.ok(job.estimatedRuntimeSeconds >= 0, job.id);
  }
});
