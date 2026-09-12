import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGettingStartedSteps,
  isOnboardingComplete,
  onboardingStats,
  onboardingSkipCookieName,
} from "../lib/enterprise/getting-started";

describe("enterprise onboarding flow", () => {
  it("builds four steps for a new org", () => {
    const steps = buildGettingStartedSteps({
      productCount: 0,
      issueCount: 0,
      readyCount: 0,
      publishedCount: 0,
    });
    assert.equal(steps.length, 4);
    assert.equal(steps[0].done, false);
    assert.equal(steps[0].minutesEstimate, 15);
  });

  it("marks onboarding complete after first publish", () => {
    const steps = buildGettingStartedSteps({
      productCount: 10,
      issueCount: 0,
      readyCount: 2,
      publishedCount: 1,
    });
    assert.equal(isOnboardingComplete(steps), true);
  });

  it("computes remaining time and tasks", () => {
    const steps = buildGettingStartedSteps({
      productCount: 5,
      issueCount: 2,
      readyCount: 0,
      publishedCount: 0,
    });
    const stats = onboardingStats(steps);
    assert.ok(stats.remainingTasks >= 1);
    assert.ok(stats.remainingMinutes > 0);
    assert.equal(stats.progressPct, 25);
  });

  it("names skip cookie per org slug", () => {
    assert.match(onboardingSkipCookieName("acme"), /^ent_onboarding_skip_acme$/);
  });
});
