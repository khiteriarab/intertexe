import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_FUNNEL_TARGETS,
  DEFAULT_MILESTONES,
  DEFAULT_STAGES,
  DEFAULT_STREAM_TARGETS,
  DECEMBER_MILESTONE_ISO,
  FUNNEL_STAGES,
  PLAN_START_ISO,
  REVENUE_STREAMS,
  SEPTEMBER_MILESTONE_ISO,
  buildFunnel,
  composeBooked,
  computeBookedRevenue,
  computeCashCollected,
  computeForecast,
  computeGap,
  computeOutstandingInvoiced,
  computeWeightedPipeline,
  interpolateTarget,
  nextMilestone,
  paceStatus,
  scopeOfStream,
  stageProbability,
  startOfWeekUtc,
  weakestFunnelStage,
  weekStartsBetween,
  type DealRow,
  type FunnelStageKey,
  type PaymentRow,
} from "../lib/dashboard/revenue-plan.ts";
import { buildNextActions } from "../lib/dashboard/revenue-command-center.ts";

const STAGES = DEFAULT_STAGES;

function deal(over: Partial<DealRow> & { id: string }): DealRow {
  return {
    companyName: "Test Brand",
    opportunity: null,
    revenueStream: "api_pilot",
    scope: "company",
    amount: 5000,
    stage: "qualified",
    probabilityOverride: null,
    expectedCloseDate: null,
    bookedAt: null,
    nextAction: null,
    nextActionAt: null,
    entryMode: "manual",
    ...over,
  };
}

function payment(over: Partial<PaymentRow> & { id: string }): PaymentRow {
  return {
    dealId: null,
    scope: "company",
    revenueStream: "api_pilot",
    amount: 5000,
    kind: "payment",
    status: "cleared",
    paidAt: "2026-09-15T00:00:00Z",
    ...over,
  };
}

describe("Plan targets", () => {
  it("seeds the stacked September and December milestones, not four equal months", () => {
    const cumulative = DEFAULT_MILESTONES.map((m) => m.cumulative);
    assert.deepEqual(cumulative, [0, 5000, 15000, 30000, 50000]);
    const increments = DEFAULT_MILESTONES.slice(1).map((m) => m.increment);
    assert.deepEqual(increments, [5000, 10000, 15000, 20000]);
    assert.ok(!increments.includes(12500), "12500 is a deal size, never a monthly target");
  });

  it("keeps the September milestone at $5,000 and December at $50,000", () => {
    const september = DEFAULT_MILESTONES.find((m) => m.targetDate === SEPTEMBER_MILESTONE_ISO);
    const december = DEFAULT_MILESTONES.find((m) => m.targetDate === DECEMBER_MILESTONE_ISO);
    assert.equal(september?.cumulative, 5000);
    assert.equal(december?.cumulative, 50000);
  });

  it("seeds a December stream mix that totals $50,000", () => {
    const total = DEFAULT_STREAM_TARGETS.reduce((s, t) => s + t.target, 0);
    assert.equal(total, 50000);
    const byStream = Object.fromEntries(DEFAULT_STREAM_TARGETS.map((t) => [t.stream, t.target]));
    assert.equal(byStream.api_pilot, 25000);
    assert.equal(byStream.api_integration, 12500);
    assert.equal(byStream.creator_partnership, 9000);
    assert.equal(byStream.affiliate, 3500);
  });

  it("seeds the September leading targets and December funnel targets", () => {
    assert.equal(DEFAULT_FUNNEL_TARGETS.qualified_account.september, 100);
    assert.equal(DEFAULT_FUNNEL_TARGETS.snapshot_sent.september, 20);
    assert.equal(DEFAULT_FUNNEL_TARGETS.meeting.september, 12);
    assert.equal(DEFAULT_FUNNEL_TARGETS.proposal.september, 3);
    assert.equal(DEFAULT_FUNNEL_TARGETS.won.september, 1);
    assert.equal(DEFAULT_FUNNEL_TARGETS.snapshot_sent.december, 40);
    assert.equal(DEFAULT_FUNNEL_TARGETS.meeting.december, 20);
    assert.equal(DEFAULT_FUNNEL_TARGETS.proposal.december, 10);
    assert.equal(DEFAULT_FUNNEL_TARGETS.won.december, 5);
    assert.equal(DEFAULT_FUNNEL_TARGETS.api_integration.december, 1);
  });

  it("does not assign app or extension revenue to a stream", () => {
    const keys = REVENUE_STREAMS.map((s) => s.key);
    assert.ok(!keys.some((k) => /app|extension/i.test(k)));
  });
});

describe("Accounting scopes", () => {
  const deals = [
    deal({ id: "a", stage: "won", amount: 5000, scope: "company", revenueStream: "api_pilot" }),
    deal({ id: "b", stage: "won", amount: 3000, scope: "personal", revenueStream: "creator_partnership" }),
    deal({ id: "c", stage: "proposal", amount: 5000, scope: "company" }),
  ];

  it("separates company, personal and combined booked revenue", () => {
    assert.equal(computeBookedRevenue(deals, STAGES, "company"), 5000);
    assert.equal(computeBookedRevenue(deals, STAGES, "personal"), 3000);
    assert.equal(computeBookedRevenue(deals, STAGES, "combined"), 8000);
  });

  it("never reports personal creator revenue inside company scope", () => {
    const companyOnly = computeBookedRevenue(deals, STAGES, "company");
    const personalOnly = computeBookedRevenue(deals, STAGES, "personal");
    assert.equal(companyOnly + personalOnly, computeBookedRevenue(deals, STAGES, "combined"));
    assert.notEqual(companyOnly, computeBookedRevenue(deals, STAGES, "combined"));
  });

  it("files creator partnerships as personal and API revenue as company", () => {
    assert.equal(scopeOfStream("creator_partnership"), "personal");
    assert.equal(scopeOfStream("api_pilot"), "company");
    assert.equal(scopeOfStream("api_integration"), "company");
    assert.equal(scopeOfStream("affiliate"), "company");
    assert.equal(scopeOfStream("intertexe_partnership"), "company");
  });

  it("excludes affiliate commission from the personal view", () => {
    assert.equal(composeBooked(3000, 500, "personal"), 3000);
    assert.equal(composeBooked(5000, 500, "company"), 5500);
    assert.equal(composeBooked(8000, 500, "combined"), 8500);
  });
});

describe("Booked versus collected", () => {
  const deals = [deal({ id: "a", stage: "won", amount: 5000 })];

  it("does not derive cash collection from deal status", () => {
    assert.equal(computeBookedRevenue(deals, STAGES, "combined"), 5000);
    assert.equal(computeCashCollected([], "combined"), 0);
    assert.equal(computeOutstandingInvoiced(deals, [], STAGES, "combined"), 5000);
  });

  it("counts only cleared payments", () => {
    const payments = [
      payment({ id: "p1", amount: 2500, status: "cleared" }),
      payment({ id: "p2", amount: 2500, status: "pending" }),
      payment({ id: "p3", amount: 900, status: "failed" }),
    ];
    assert.equal(computeCashCollected(payments, "combined"), 2500);
    assert.equal(computeOutstandingInvoiced(deals, payments, STAGES, "combined"), 2500);
  });

  it("reduces collected cash on a refund without changing booked revenue", () => {
    const payments = [
      payment({ id: "p1", amount: 5000 }),
      payment({ id: "p2", amount: -1500, kind: "refund" }),
    ];
    assert.equal(computeCashCollected(payments, "combined"), 3500);
    assert.equal(computeBookedRevenue(deals, STAGES, "combined"), 5000);
  });

  it("supports partial payments across multiple invoice rows", () => {
    const payments = [
      payment({ id: "p1", amount: 2000, invoiceReference: "INV-1" } as never),
      payment({ id: "p2", amount: 1500, invoiceReference: "INV-2" } as never),
    ];
    assert.equal(computeCashCollected(payments, "combined"), 3500);
  });

  it("filters collected cash by period", () => {
    const payments = [
      payment({ id: "p1", amount: 1000, paidAt: "2026-09-10T00:00:00Z" }),
      payment({ id: "p2", amount: 4000, paidAt: "2026-11-10T00:00:00Z" }),
    ];
    const collected = computeCashCollected(payments, "combined", {
      from: new Date("2026-09-01T00:00:00Z"),
      to: new Date("2026-09-30T23:59:59Z"),
    });
    assert.equal(collected, 1000);
  });
});

describe("Weighted pipeline", () => {
  it("multiplies open deal value by stage probability", () => {
    const deals = [
      deal({ id: "a", stage: "proposal", amount: 5000 }),
      deal({ id: "b", stage: "meeting", amount: 10000 }),
      deal({ id: "c", stage: "qualified", amount: 5000 }),
    ];
    // 5000*0.6 + 10000*0.35 + 5000*0.10
    assert.equal(computeWeightedPipeline(deals, STAGES, "combined"), 7000);
  });

  it("excludes won and lost deals from pipeline", () => {
    const deals = [
      deal({ id: "won", stage: "won", amount: 5000 }),
      deal({ id: "lost", stage: "lost", amount: 5000 }),
    ];
    assert.equal(computeWeightedPipeline(deals, STAGES, "combined"), 0);
  });

  it("honours a founder probability override", () => {
    const d = deal({ id: "a", stage: "qualified", amount: 10000, probabilityOverride: 0.5 });
    assert.equal(stageProbability(STAGES, d), 0.5);
    assert.equal(computeWeightedPipeline([d], STAGES, "combined"), 5000);
  });

  it("only promises deals with an expected close date inside the deadline", () => {
    const deals = [
      deal({ id: "a", stage: "proposal", amount: 5000, expectedCloseDate: "2026-11-30" }),
      deal({ id: "b", stage: "proposal", amount: 5000, expectedCloseDate: "2027-02-01" }),
      deal({ id: "c", stage: "proposal", amount: 5000, expectedCloseDate: null }),
    ];
    const byDeadline = computeWeightedPipeline(deals, STAGES, "combined", {
      closingBy: new Date(`${DECEMBER_MILESTONE_ISO}T23:59:59Z`),
    });
    assert.equal(byDeadline, 3000);
  });

  it("keeps forecast distinct from booked revenue", () => {
    const deals = [
      deal({ id: "won", stage: "won", amount: 5000 }),
      deal({ id: "open", stage: "proposal", amount: 10000, expectedCloseDate: "2026-12-01" }),
    ];
    const booked = computeBookedRevenue(deals, STAGES, "combined");
    const forecast = computeForecast(deals, STAGES, "combined", new Date(`${DECEMBER_MILESTONE_ISO}T23:59:59Z`));
    assert.equal(booked, 5000);
    assert.equal(forecast, 11000);
    assert.ok(forecast > booked);
  });
});

describe("Target interpolation and pace", () => {
  it("returns the exact milestone value on a milestone date", () => {
    assert.equal(interpolateTarget(DEFAULT_MILESTONES, new Date(`${SEPTEMBER_MILESTONE_ISO}T23:59:59Z`)), 5000);
    assert.equal(interpolateTarget(DEFAULT_MILESTONES, new Date(`${DECEMBER_MILESTONE_ISO}T23:59:59Z`)), 50000);
  });

  it("interpolates between milestones instead of stepping", () => {
    const midOctober = interpolateTarget(DEFAULT_MILESTONES, new Date("2026-10-16T00:00:00Z"));
    assert.ok(midOctober > 5000 && midOctober < 15000, `expected between 5000 and 15000, got ${midOctober}`);
  });

  it("clamps before the plan start and after the final milestone", () => {
    assert.equal(interpolateTarget(DEFAULT_MILESTONES, new Date("2026-07-01T00:00:00Z")), 0);
    assert.equal(interpolateTarget(DEFAULT_MILESTONES, new Date("2027-06-01T00:00:00Z")), 50000);
  });

  it("selects the next unmet milestone", () => {
    assert.equal(nextMilestone(DEFAULT_MILESTONES, new Date("2026-09-01T00:00:00Z"))?.cumulative, 5000);
    assert.equal(nextMilestone(DEFAULT_MILESTONES, new Date("2026-11-15T00:00:00Z"))?.cumulative, 30000);
    assert.equal(nextMilestone(DEFAULT_MILESTONES, new Date("2027-01-15T00:00:00Z"))?.cumulative, 50000);
  });

  it("uses documented pace thresholds", () => {
    assert.equal(paceStatus(5000, 5000), "on_pace");
    assert.equal(paceStatus(4800, 5000), "on_pace");
    assert.equal(paceStatus(4000, 5000), "needs_attention");
    assert.equal(paceStatus(1000, 5000), "off_pace");
  });

  it("reports no target rather than a fake pace when the plan expects nothing yet", () => {
    assert.equal(paceStatus(0, 0), "no_data");
  });

  it("never returns a negative gap", () => {
    assert.equal(computeGap(5000, 8000), 0);
    assert.equal(computeGap(5000, 1500), 3500);
  });
});

describe("Funnel", () => {
  const actuals: Record<FunnelStageKey, number> = {
    qualified_account: 40,
    snapshot_sent: 10,
    meeting: 4,
    proposal: 1,
    won: 0,
    api_integration: 0,
  };

  it("keeps the six required stages in order", () => {
    assert.deepEqual(FUNNEL_STAGES.map((s) => s.key), [
      "qualified_account",
      "snapshot_sent",
      "meeting",
      "proposal",
      "won",
      "api_integration",
    ]);
  });

  it("computes conversion from the previous stage only", () => {
    const rows = buildFunnel(
      actuals,
      Object.fromEntries(FUNNEL_STAGES.map((s) => [s.key, DEFAULT_FUNNEL_TARGETS[s.key].september])) as Record<
        FunnelStageKey,
        number
      >
    );
    assert.equal(rows[0].conversionFromPrevious, null);
    assert.equal(rows[1].conversionFromPrevious, 10 / 40);
    assert.equal(rows[2].conversionFromPrevious, 4 / 10);
    assert.equal(rows[0].target, 100);
    assert.equal(rows[1].target, 20);
  });

  it("omits a conversion rate instead of inventing one when the prior stage is zero", () => {
    const rows = buildFunnel(
      { ...actuals, meeting: 0, proposal: 2 },
      Object.fromEntries(FUNNEL_STAGES.map((s) => [s.key, 1])) as Record<FunnelStageKey, number>
    );
    assert.equal(rows[3].conversionFromPrevious, null);
  });

  it("identifies the stage furthest behind target", () => {
    const rows = buildFunnel(
      actuals,
      Object.fromEntries(FUNNEL_STAGES.map((s) => [s.key, DEFAULT_FUNNEL_TARGETS[s.key].september])) as Record<
        FunnelStageKey,
        number
      >
    );
    const weakest = weakestFunnelStage(rows);
    assert.equal(weakest?.key, "won");
  });

  it("ignores stages with no target when picking the weakest", () => {
    const rows = buildFunnel(actuals, {
      qualified_account: 100,
      snapshot_sent: 20,
      meeting: 12,
      proposal: 3,
      won: 0,
      api_integration: 0,
    });
    assert.notEqual(weakestFunnelStage(rows)?.key, "won");
  });
});

describe("Week helpers", () => {
  it("starts weeks on Monday in UTC", () => {
    assert.equal(startOfWeekUtc(new Date("2026-08-18T12:00:00Z")).toISOString().slice(0, 10), "2026-08-17");
    assert.equal(startOfWeekUtc(new Date("2026-08-23T23:00:00Z")).toISOString().slice(0, 10), "2026-08-17");
    assert.equal(startOfWeekUtc(new Date("2026-08-24T00:00:00Z")).toISOString().slice(0, 10), "2026-08-24");
  });

  it("covers the plan window from August 18 to December 31", () => {
    const weeks = weekStartsBetween(
      new Date(`${PLAN_START_ISO}T00:00:00Z`),
      new Date(`${DECEMBER_MILESTONE_ISO}T23:59:59Z`)
    );
    assert.ok(weeks.length >= 19 && weeks.length <= 21, `unexpected week count ${weeks.length}`);
    assert.equal(weeks[0].toISOString().slice(0, 10), "2026-08-17");
  });
});

describe("Next actions", () => {
  const now = new Date("2026-09-15T12:00:00Z");

  it("ranks overdue next actions first", () => {
    const items = buildNextActions(
      [
        deal({ id: "overdue", companyName: "Overdue Co", stage: "meeting", nextActionAt: "2026-09-01T00:00:00Z", nextAction: "Send proposal" }),
        deal({ id: "quiet", companyName: "Quiet Co", stage: "qualified", amount: 20000 }),
      ],
      STAGES,
      now
    );
    assert.equal(items[0].id, "overdue");
    assert.equal(items[0].overdue, true);
    assert.match(items[0].reason, /overdue/i);
  });

  it("surfaces proposals with no follow-up and meetings with no next step", () => {
    const items = buildNextActions(
      [
        deal({ id: "proposal", stage: "proposal", nextActionAt: null }),
        deal({ id: "meeting", stage: "meeting", nextAction: null, nextActionAt: null }),
      ],
      STAGES,
      now
    );
    const reasons = items.map((i) => i.reason).join(" | ");
    assert.match(reasons, /no follow-up scheduled/i);
    assert.match(reasons, /no next step/i);
  });

  it("never lists closed deals and caps the list at five", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      deal({ id: `d${i}`, stage: "proposal", amount: 1000 * (i + 1), nextActionAt: null })
    );
    const items = buildNextActions([...many, deal({ id: "won", stage: "won" }), deal({ id: "lost", stage: "lost" })], STAGES, now);
    assert.equal(items.length, 5);
    assert.ok(!items.some((i) => i.id === "won" || i.id === "lost"));
  });

  it("includes company, value, stage and next action on every item", () => {
    const items = buildNextActions(
      [deal({ id: "a", companyName: "Brand A", opportunity: "Pilot", stage: "proposal", amount: 5000, nextActionAt: null })],
      STAGES,
      now
    );
    assert.equal(items[0].company, "Brand A");
    assert.equal(items[0].amount, 5000);
    assert.equal(items[0].stageLabel, "Proposal");
    assert.ok(items[0].nextAction.length > 0);
  });
});

describe("Missing integration versus legitimate zero", () => {
  it("keeps null distinct from zero in the composite booked calculation", () => {
    assert.equal(composeBooked(0, null, "combined"), 0);
    assert.equal(composeBooked(0, 0, "combined"), 0);
    assert.equal(composeBooked(1000, null, "company"), 1000);
  });

  it("labels unavailable channels rather than rendering zero", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib/dashboard/revenue-command-center.ts"),
      "utf8"
    );
    assert.match(source, /Not connected/);
    assert.match(source, /looksMissing/);
    // Chrome installs must never be inferred from website clicks.
    assert.match(source, /chrome_installs[\s\S]{0,400}availability: "unavailable"/);
  });

  it("does not seed fake historical revenue, installs or usage", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib/dashboard/revenue-command-center.ts"),
      "utf8"
    );
    assert.doesNotMatch(source, /Math\.random/);
    assert.doesNotMatch(source, /sampleRevenue|demoRevenue|fakeRevenue/i);
  });
});

describe("Founder-only authorization", () => {
  const routeSource = fs.readFileSync(
    path.join(process.cwd(), "app/api/dashboard/revenue-command-center/route.ts"),
    "utf8"
  );
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), "app/dashboard/(app)/command-center/page.tsx"),
    "utf8"
  );

  it("gates the page on the founder role", () => {
    assert.match(pageSource, /requireHqSession\(\{\s*roles:\s*\["founder"\]\s*\}\)/);
  });

  it("gates every write on the founder role", () => {
    assert.match(routeSource, /roles\.includes\("founder"\)/);
    assert.match(routeSource, /status:\s*403/);
    assert.match(routeSource, /status:\s*401/);
    for (const method of ["export async function GET", "export async function POST", "export async function PATCH"]) {
      assert.ok(routeSource.includes(method), `${method} missing`);
    }
    const handlers = routeSource.split(/export async function /).slice(1);
    for (const handler of handlers) {
      assert.match(handler, /requireFounder\(\)/, "every handler must call requireFounder");
    }
  });

  it("keeps the page out of search indexes", () => {
    assert.match(pageSource, /robots:\s*\{\s*index:\s*false/);
  });

  it("does not expose the plan on any public route", () => {
    const publicDirs = ["app/platform", "app/api/v1", "app/khiteri"];
    for (const dir of publicDirs) {
      const full = path.join(process.cwd(), dir);
      if (!fs.existsSync(full)) continue;
      const files: string[] = [];
      const walk = (d: string) => {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, entry.name);
          if (entry.isDirectory()) walk(p);
          else if (/\.(ts|tsx)$/.test(entry.name)) files.push(p);
        }
      };
      walk(full);
      for (const file of files) {
        const text = fs.readFileSync(file, "utf8");
        assert.doesNotMatch(text, /revenue-command-center|revenue-plan|hq_deals|hq_revenue_targets/, file);
      }
    }
  });

  it("does not change the public platform surface", () => {
    const docs = fs.readFileSync(path.join(process.cwd(), "app/platform/docs/page.tsx"), "utf8");
    assert.doesNotMatch(docs, /Command Center|50K|hq_deals/i);
  });
});

describe("Manual entry validation", () => {
  const routeSource = fs.readFileSync(
    path.join(process.cwd(), "app/api/dashboard/revenue-command-center/route.ts"),
    "utf8"
  );

  it("validates stream, stage, amount and probability", () => {
    assert.match(routeSource, /STREAM_KEYS\.has/);
    assert.match(routeSource, /STAGE_KEYS\.has/);
    assert.match(routeSource, /Amount must be zero or more/);
    assert.match(routeSource, /Probability must be between 0 and 1/);
  });

  it("derives scope from the revenue stream so personal revenue cannot be filed as company", () => {
    assert.match(routeSource, /scope: scopeOfStream\(stream\)/);
  });

  it("marks records as manual entry in the data layer", () => {
    assert.match(routeSource, /entry_mode: "manual"/);
  });

  it("explains the migration instead of failing silently", () => {
    assert.match(routeSource, /20260820_hq_revenue_command_center\.sql/);
    assert.match(routeSource, /status:\s*503/);
  });
});

describe("Migration is additive with founder-only RLS", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260820_hq_revenue_command_center.sql"),
    "utf8"
  );

  it("only creates new objects", () => {
    assert.match(sql, /Additive only/);
    const creates = sql.match(/CREATE TABLE/g) || [];
    const guarded = sql.match(/CREATE TABLE IF NOT EXISTS/g) || [];
    assert.equal(creates.length, guarded.length);
    assert.doesNotMatch(sql, /^\s*DROP TABLE /m);
    assert.doesNotMatch(sql, /ALTER TABLE public\.(hq_contacts|hq_affiliate_transactions|products|material_api_clients)\s+(ADD|DROP|RENAME)/);
  });

  it("documents a reverse drop order", () => {
    assert.match(sql, /^--\s+DROP TABLE IF EXISTS public\.hq_deals;/m);
    assert.match(sql, /^--\s+DROP TABLE IF EXISTS public\.hq_revenue_targets;/m);
  });

  it("enables RLS and refuses anon or authenticated access on every new table", () => {
    const tables = [
      "hq_deal_stages",
      "hq_revenue_streams",
      "hq_revenue_targets",
      "hq_deals",
      "hq_deal_payments",
      "hq_revenue_activities",
      "hq_founder_confirmations",
    ];
    for (const table of tables) {
      assert.ok(
        sql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
        `${table} missing RLS`
      );
      assert.ok(
        sql.includes(`REVOKE ALL ON public.${table} FROM anon, authenticated;`),
        `${table} missing revoke`
      );
      assert.ok(sql.includes(`ON public.${table} TO service_role;`), `${table} missing service grant`);
    }
    assert.doesNotMatch(sql, /TO (anon|authenticated)/);
  });

  it("seeds the stage probabilities documented in the plan", () => {
    assert.match(sql, /'prospect', 'Prospect', 0\.05/);
    assert.match(sql, /'qualified', 'Qualified', 0\.10/);
    assert.match(sql, /'snapshot_sent', 'Snapshot sent', 0\.20/);
    assert.match(sql, /'meeting', 'Meeting', 0\.35/);
    assert.match(sql, /'proposal', 'Proposal', 0\.60/);
    assert.match(sql, /'verbal', 'Verbal agreement', 0\.80/);
    assert.match(sql, /'won', 'Won', 1\.00/);
    assert.match(sql, /'lost', 'Lost', 0\.00/);
  });

  it("seeds editable milestones rather than hard-coding them in a chart", () => {
    assert.match(sql, /booked_revenue_cumulative/);
    assert.match(sql, /'2026-09-30'/);
    assert.match(sql, /'2026-12-31'/);
    const charts = fs.readFileSync(
      path.join(process.cwd(), "app/dashboard/(app)/command-center/PlanCharts.tsx"),
      "utf8"
    );
    assert.match(charts, /milestones[\s\S]{0,40}\.filter\(\(m\) => m\.cumulative > 0\)/);
    assert.doesNotMatch(charts, /d="M0,\d+ ?L\d+/);
  });
});

describe("Existing dashboard is complemented, not replaced", () => {
  it("keeps every previous nav entry and adds one", () => {
    const constants = fs.readFileSync(path.join(process.cwd(), "lib/dashboard/constants.ts"), "utf8");
    for (const label of [
      "This week",
      "Email",
      "Acquisition",
      "Engagement",
      "Commerce",
      "Product",
      "Consumers",
      "Materials",
      "Brands",
      "Catalog",
      "Digital Product Passport",
      "Campaigns",
      "Content",
      "Insights",
      "AI",
      "Settings",
    ]) {
      assert.ok(constants.includes(`label: "${label}"`), `nav lost ${label}`);
    }
    assert.match(constants, /label: "\$50K Command Center"/);
  });

  it("shows the plan pulse on the existing This week page for founders only", () => {
    const overview = fs.readFileSync(path.join(process.cwd(), "app/dashboard/(app)/page.tsx"), "utf8");
    assert.match(overview, /roles\.includes\("founder"\)/);
    assert.match(overview, /fetchPlanPulse/);
    assert.match(overview, /planPulse \? \(/);
    // The existing sections must remain.
    assert.match(overview, /title="Company funnel"/);
    assert.match(overview, /title="App download clicks"/);
    assert.match(overview, /fetchFounderToday/);
  });

  it("reuses the existing HQ card and shell components", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "app/dashboard/(app)/command-center/page.tsx"),
      "utf8"
    );
    assert.match(page, /from "\.\.\/\.\.\/components\/HqUi"/);
    const client = fs.readFileSync(
      path.join(process.cwd(), "app/dashboard/(app)/command-center/CommandCenterClient.tsx"),
      "utf8"
    );
    assert.match(client, /HqCard/);
  });
});

describe("Responsive and accessible rendering", () => {
  const charts = fs.readFileSync(
    path.join(process.cwd(), "app/dashboard/(app)/command-center/PlanCharts.tsx"),
    "utf8"
  );
  const client = fs.readFileSync(
    path.join(process.cwd(), "app/dashboard/(app)/command-center/CommandCenterClient.tsx"),
    "utf8"
  );

  it("keeps chart labels at 11px or larger in HTML, not scaled SVG text", () => {
    assert.doesNotMatch(charts, /<text/);
    const sizes = [...charts.matchAll(/text-\[(\d+)px\]/g)].map((m) => Number(m[1]));
    assert.ok(sizes.length > 0, "expected explicit chart label sizes");
    assert.ok(Math.min(...sizes) >= 10, `chart label too small: ${Math.min(...sizes)}px`);
    const clientSizes = [...client.matchAll(/text-\[(\d+)px\]/g)].map((m) => Number(m[1]));
    assert.ok(Math.min(...clientSizes) >= 10, `view label too small: ${Math.min(...clientSizes)}px`);
  });

  it("stacks on narrow screens without horizontal page scrolling", () => {
    assert.match(client, /grid-cols-1 sm:grid-cols-2 xl:grid-cols-4/);
    assert.match(client, /flex flex-col lg:flex-row/);
    assert.match(client, /flex-wrap/);
    // Wide tables scroll inside their own card, not the page.
    assert.match(client, /overflow-x-auto/);
  });

  it("uses 16px inputs on small screens so iOS does not zoom", () => {
    assert.match(client, /text-base sm:text-\[13px\]/);
  });

  it("exposes keyboard focus and screen-reader text for the charts", () => {
    assert.match(charts, /focus-visible:/);
    assert.match(charts, /aria-label=/);
    assert.match(charts, /role="img"/);
    assert.match(charts, /aria-live="polite"/);
    assert.match(client, /role="tablist"/);
    assert.match(client, /aria-selected=/);
    assert.match(client, /sr-only/);
  });

  it("pairs every series color with a label and a line style or pattern", () => {
    assert.match(charts, /style\?: "solid" \| "dashed" \| "hatch" \| "dots"/);
    assert.match(charts, /repeating-linear-gradient/);
    assert.match(client, /Personal|Company/);
  });

  it("uses the restrained plan palette and no rainbow charts", () => {
    const plan = fs.readFileSync(path.join(process.cwd(), "lib/dashboard/revenue-plan.ts"), "utf8");
    assert.match(plan, /mauve: "#7c5468"/);
    assert.match(plan, /sage: "#4f6b56"/);
    assert.match(plan, /gold: "#8a6d2f"/);
    assert.match(plan, /terracotta: "#9c4a30"/);
    const streamColors = new Set(REVENUE_STREAMS.map((s) => s.color));
    assert.equal(streamColors.size, REVENUE_STREAMS.length, "each stream needs one stable color");
    assert.doesNotMatch(charts, /#(ff0000|00ff00|0000ff)/i);
  });
});
