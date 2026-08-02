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
import { warmCronEnabled } from "../lib/job-guard.ts";

test("warm defaults off", () => {
  const prev = process.env.WARM_CRON_ENABLED;
  delete process.env.WARM_CRON_ENABLED;
  assert.equal(warmCronEnabled(), false);
  if (prev === undefined) delete process.env.WARM_CRON_ENABLED;
  else process.env.WARM_CRON_ENABLED = prev;
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
