import { describe, expect, it } from "vitest";
import {
  COMPANY_HORIZON_PLANS,
  computeKpiSnapshot,
  computeRevenueStreams,
  forecastHitDate,
  buildWeeklyReview,
} from "./company-plan";

describe("computeKpiSnapshot", () => {
  it("computes gap and required pace from current vs target", () => {
    const kpi = computeKpiSnapshot({
      key: "members",
      label: "Members",
      current: 1000,
      target: 25_000,
      deadlineIso: COMPANY_HORIZON_PLANS.year1.deadlineIso,
      asOfIso: "2026-10-01",
      weeklyActual: 600,
    });
    expect(kpi.gap).toBe(24_000);
    expect(kpi.progressPct).toBeCloseTo(4, 0);
    expect(kpi.requiredPerMonth).toBeGreaterThan(0);
    expect(["ahead", "on_track"]).toContain(kpi.pace);
  });
});

describe("computeRevenueStreams", () => {
  it("maps company revenue into Year 1 stream targets", () => {
    const streams = computeRevenueStreams({
      saas: 50_000,
      affiliate: 25_000,
      pilots: 10_000,
      otherB2b: 5_000,
    });
    expect(streams).toHaveLength(4);
    expect(streams[0]?.gap).toBe(550_000);
    expect(streams[1]?.progressPct).toBeCloseTo(10, 0);
  });
});

describe("forecastHitDate", () => {
  it("returns null when already at target or no weekly rate", () => {
    expect(forecastHitDate(25_000, 25_000, 100)).toBeNull();
    expect(forecastHitDate(1000, 25_000, 0)).toBeNull();
  });

  it("returns a future month when pace is positive", () => {
    const date = forecastHitDate(1000, 25_000, 500, "2026-10-01");
    expect(date).toMatch(/20\d{2}/);
  });
});

describe("buildWeeklyReview", () => {
  it("includes variance when targets exist", () => {
    const rows = buildWeeklyReview({
      membersWeek: 80,
      membersWeekTarget: 100,
      revenueWeek: 5000,
      revenueWeekTarget: 4000,
      affiliateOrders: 12,
      affiliateRevenue: 500,
      b2bLeads: 3,
      meetings: 2,
      proposals: 1,
      newClients: 0,
      pressWins: 0,
      speakingOps: 0,
    });
    expect(rows[0]?.variance).toBe(-20);
    expect(rows[1]?.variance).toBe(1000);
  });
});
