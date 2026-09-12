import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  USER_GROWTH_TARGET,
  buildWeeklyUserTrajectory,
  computeUserGrowthPace,
  targetUsersOnDate,
} from "../lib/dashboard/user-growth-plan";

describe("user growth plan", () => {
  it("targets 25,000 users by end of 2027", () => {
    assert.equal(targetUsersOnDate("2027-12-31"), USER_GROWTH_TARGET);
    assert.equal(targetUsersOnDate("2026-12-31"), 5000);
  });

  it("computes pace from current totals", () => {
    const pace = computeUserGrowthPace({
      currentTotal: 1200,
      signups7d: 45,
      asOfIso: "2026-09-12",
    });
    assert.ok(pace.weeksRemaining > 0);
    assert.ok(pace.requiredWeekly > 0);
    assert.ok(pace.progressPct > 0 && pace.progressPct < 10);
  });

  it("builds weekly trajectory with actuals", () => {
    const points = buildWeeklyUserTrajectory({
      currentTotal: 500,
      weeklyActual: [
        { weekStart: "2026-08-04", signups: 10 },
        { weekStart: "2026-08-11", signups: 12 },
      ],
      asOfIso: "2026-09-12",
    });
    assert.ok(points.length > 10);
    const withActual = points.filter((p) => p.actual != null);
    assert.ok(withActual.length > 0);
  });
});
