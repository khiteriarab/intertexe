import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGettingStartedSteps,
  isOnboardingComplete,
  onboardingStats,
  onboardingSkipCookieName,
} from "../lib/enterprise/getting-started";

describe("enterprise onboarding flow", () => {
  it("builds five steps for a new org, starting with region and units", () => {
    const steps = buildGettingStartedSteps({
      productCount: 0,
      issueCount: 0,
      readyCount: 0,
      publishedCount: 0,
      measurementConfigured: false,
    });
    assert.equal(steps.length, 5);
    assert.equal(steps[0].id, "region");
    assert.equal(steps[0].kind, "region_units");
    assert.equal(steps[0].done, false);
    assert.equal(steps[0].minutesEstimate, 3);
  });

  it("marks onboarding complete after region prefs and first publish", () => {
    const steps = buildGettingStartedSteps({
      productCount: 10,
      issueCount: 0,
      readyCount: 2,
      publishedCount: 1,
      measurementConfigured: true,
    });
    assert.equal(isOnboardingComplete(steps), true);
  });

  it("computes remaining time and tasks", () => {
    const steps = buildGettingStartedSteps({
      productCount: 5,
      issueCount: 2,
      readyCount: 0,
      publishedCount: 0,
      measurementConfigured: true,
    });
    const stats = onboardingStats(steps);
    assert.ok(stats.remainingTasks >= 1);
    assert.ok(stats.remainingMinutes > 0);
    // region done + import done = 2/5
    assert.equal(stats.progressPct, 40);
  });

  it("names skip cookie per org slug", () => {
    assert.match(onboardingSkipCookieName("acme"), /^ent_onboarding_skip_acme$/);
  });
});
