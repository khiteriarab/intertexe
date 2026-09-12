import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  USER_GROWTH_TARGET,
  buildMonthlyCheckpoints,
  buildWeeklyUserTrajectory,
  computeScoreboardTargets,
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

  it("computes even-growth scoreboard targets from zero", () => {
    const board = computeScoreboardTargets({ currentTotal: 0, asOfIso: "2026-09-12" });
    assert.equal(board.goal, USER_GROWTH_TARGET);
    assert.ok(board.perMonth >= 2000 && board.perMonth <= 2100);
    assert.ok(board.perWeek >= 450 && board.perWeek <= 490);
    assert.ok(board.perDay >= 65 && board.perDay <= 70);
  });

  it("builds monthly checkpoints through Sep 2027", () => {
    const rows = buildMonthlyCheckpoints("2026-09-12");
    assert.equal(rows.length, 12);
    assert.equal(rows[0]?.checkpoint, "Oct 2026");
    assert.equal(rows.at(-1)?.totalMembers, USER_GROWTH_TARGET);
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
