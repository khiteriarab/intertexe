/**
 * INTERTEXE company operating plan — pure targets and KPI math.
 * Company revenue only. Personal @khiteri metrics belong in command-center.
 */

export type PlanHorizon = "year1" | "year2" | "year3";
export type KpiPace = "ahead" | "on_track" | "behind" | "unknown";

export const COMPANY_YEAR1_START = "2026-09-01";
export const COMPANY_YEAR1_END = "2027-09-30";
export const COMPANY_YEAR2_END = "2028-09-30";
export const COMPANY_YEAR3_END = "2029-09-30";

export type CompanyHorizonPlan = {
  horizon: PlanHorizon;
  label: string;
  revenueMin: number;
  revenueStretch: number;
  members: number;
  b2bClients: number;
  pressFeatures: number;
  speakingEngagements: number;
  deadlineIso: string;
};

export const COMPANY_HORIZON_PLANS: Record<PlanHorizon, CompanyHorizonPlan> = {
  year1: {
    horizon: "year1",
    label: "Year 1 · Sep 2027",
    revenueMin: 1_000_000,
    revenueStretch: 3_000_000,
    members: 25_000,
    b2bClients: 50,
    pressFeatures: 10,
    speakingEngagements: 3,
    deadlineIso: COMPANY_YEAR1_END,
  },
  year2: {
    horizon: "year2",
    label: "Year 2 · Sep 2028",
    revenueMin: 2_500_000,
    revenueStretch: 5_000_000,
    members: 50_000,
    b2bClients: 120,
    pressFeatures: 20,
    speakingEngagements: 5,
    deadlineIso: COMPANY_YEAR2_END,
  },
  year3: {
    horizon: "year3",
    label: "Year 3 · Sep 2029",
    revenueMin: 5_000_000,
    revenueStretch: 10_000_000,
    members: 100_000,
    b2bClients: 250,
    pressFeatures: 30,
    speakingEngagements: 10,
    deadlineIso: COMPANY_YEAR3_END,
  },
};

export type RevenueStreamTarget = {
  key: string;
  label: string;
  year1Target: number;
};

export const REVENUE_STREAM_TARGETS: RevenueStreamTarget[] = [
  { key: "saas", label: "SaaS / B2B subscriptions", year1Target: 600_000 },
  { key: "affiliate", label: "Affiliate revenue", year1Target: 250_000 },
  { key: "pilots", label: "Paid pilots", year1Target: 100_000 },
  { key: "other_b2b", label: "Other B2B revenue", year1Target: 50_000 },
];

export type CompanyMilestone = {
  quarter: string;
  title: string;
  members: number;
  b2bClients: number;
  pressFeatures: number;
  speaking: number;
  revenueNote: string;
  items: string[];
};

export const COMPANY_MILESTONES: CompanyMilestone[] = [
  {
    quarter: "Q4 2026",
    title: "Foundation",
    members: 0,
    b2bClients: 0,
    pressFeatures: 0,
    speaking: 0,
    revenueNote: "Build KPI stack + audit affiliate",
    items: [
      "Complete KPI dashboard",
      "Establish accurate analytics",
      "Audit affiliate sales",
      "Identify highest-converting channels",
      "Build acquisition funnel tracking",
      "Begin B2B pipeline",
      "Run growth experiments",
    ],
  },
  {
    quarter: "Q1 2027",
    title: "Traction",
    members: 5_000,
    b2bClients: 5,
    pressFeatures: 0,
    speaking: 0,
    revenueNote: "First paid pilot + repeatable acquisition",
    items: ["5,000 members", "5 brand clients", "1 paid pilot", "Monthly affiliate growth"],
  },
  {
    quarter: "Q2 2027",
    title: "Growth",
    members: 12_000,
    b2bClients: 15,
    pressFeatures: 3,
    speaking: 1,
    revenueNote: "Stronger B2B pipeline",
    items: ["12,000 members", "15 brand clients", "3 press features", "1 speaking engagement"],
  },
  {
    quarter: "Q3 2027",
    title: "Scale",
    members: 25_000,
    b2bClients: 50,
    pressFeatures: 10,
    speaking: 3,
    revenueNote: "$1M+ total revenue target",
    items: ["25,000 members", "50 brand clients", "10 press features", "3 speaking engagements"],
  },
];

export type KpiSnapshot = {
  key: string;
  label: string;
  current: number;
  target: number;
  stretch?: number;
  progressPct: number;
  gap: number;
  requiredPerMonth: number;
  requiredPerWeek: number;
  pace: KpiPace;
  paceLabel: string;
};

function parseDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

export function daysBetween(startIso: string, endIso: string): number {
  const start = parseDate(startIso).getTime();
  const end = parseDate(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
}

export function weeksBetween(startIso: string, endIso: string): number {
  return Math.max(1, Math.ceil(daysBetween(startIso, endIso) / 7));
}

export function monthsBetween(startIso: string, endIso: string): number {
  const start = parseDate(startIso);
  const end = parseDate(endIso);
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  return Math.max(1, months || 1);
}

export function computeKpiSnapshot(input: {
  key: string;
  label: string;
  current: number;
  target: number;
  stretch?: number;
  asOfIso?: string;
  deadlineIso: string;
  /** Weekly actual for pace (optional) */
  weeklyActual?: number;
}): KpiSnapshot {
  const asOf = input.asOfIso?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const gap = Math.max(0, input.target - input.current);
  const progressPct = input.target > 0 ? (input.current / input.target) * 100 : 0;
  const monthsRemaining = monthsBetween(asOf, input.deadlineIso);
  const weeksRemaining = weeksBetween(asOf, input.deadlineIso);
  const requiredPerMonth = monthsRemaining > 0 ? Math.ceil(gap / monthsRemaining) : gap;
  const requiredPerWeek = weeksRemaining > 0 ? Math.ceil(gap / weeksRemaining) : gap;

  let pace: KpiPace = "unknown";
  let paceLabel = "Building baseline";
  if (input.current > 0 && input.weeklyActual != null && requiredPerWeek > 0) {
    if (input.weeklyActual >= requiredPerWeek * 1.1) {
      pace = "ahead";
      paceLabel = "Ahead";
    } else if (input.weeklyActual >= requiredPerWeek * 0.85) {
      pace = "on_track";
      paceLabel = "On track";
    } else {
      pace = "behind";
      paceLabel = "Behind";
    }
  } else if (input.current > 0 && progressPct >= (monthsElapsed(asOf, input.deadlineIso) / 12) * 100) {
    pace = "on_track";
    paceLabel = "On track";
  }

  return {
    key: input.key,
    label: input.label,
    current: input.current,
    target: input.target,
    stretch: input.stretch,
    progressPct,
    gap,
    requiredPerMonth,
    requiredPerWeek,
    pace,
    paceLabel,
  };
}

function monthsElapsed(asOfIso: string, deadlineIso: string): number {
  const start = parseDate(COMPANY_YEAR1_START);
  const asOf = parseDate(asOfIso);
  const end = parseDate(deadlineIso);
  const total = monthsBetween(COMPANY_YEAR1_START, deadlineIso);
  const elapsed = monthsBetween(COMPANY_YEAR1_START, asOfIso);
  return Math.min(total, Math.max(0, elapsed));
}

export function formatCompanyMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function formatCompanyCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 100) / 10}k`;
  return n.toLocaleString("en-US");
}

export function paceColor(pace: KpiPace): string {
  if (pace === "ahead") return "#22A06B";
  if (pace === "on_track") return "#3B7BFF";
  if (pace === "behind") return "#E86A3C";
  return "#9c7b8b";
}

/** Forecast date to hit target at current weekly rate; null if no pace. */
export function forecastHitDate(current: number, target: number, weeklyRate: number, asOfIso?: string): string | null {
  if (weeklyRate <= 0 || current >= target) return null;
  const weeksNeeded = Math.ceil((target - current) / weeklyRate);
  const asOf = parseDate(asOfIso?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  asOf.setUTCDate(asOf.getUTCDate() + weeksNeeded * 7);
  return asOf.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export type RevenueStreamProgress = {
  key: string;
  label: string;
  current: number;
  target: number;
  progressPct: number;
  gap: number;
};

export function computeRevenueStreams(input: {
  saas: number;
  affiliate: number;
  pilots: number;
  otherB2b: number;
}): RevenueStreamProgress[] {
  const map: Record<string, number> = {
    saas: input.saas,
    affiliate: input.affiliate,
    pilots: input.pilots,
    other_b2b: input.otherB2b,
  };
  return REVENUE_STREAM_TARGETS.map((stream) => {
    const current = map[stream.key] || 0;
    const target = stream.year1Target;
    return {
      key: stream.key,
      label: stream.label,
      current,
      target,
      progressPct: target > 0 ? (current / target) * 100 : 0,
      gap: Math.max(0, target - current),
    };
  });
}

export type WeeklyReviewRow = {
  label: string;
  current: number;
  target: number;
  variance: number;
};

export function buildWeeklyReview(input: {
  membersWeek: number;
  membersWeekTarget: number;
  revenueWeek: number;
  revenueWeekTarget: number;
  affiliateOrders: number;
  affiliateRevenue: number;
  b2bLeads: number;
  meetings: number;
  proposals: number;
  newClients: number;
  pressWins: number;
  speakingOps: number;
}): WeeklyReviewRow[] {
  const rows: Array<[string, number, number]> = [
    ["Users gained", input.membersWeek, input.membersWeekTarget],
    ["Revenue", input.revenueWeek, input.revenueWeekTarget],
    ["Affiliate orders", input.affiliateOrders, 0],
    ["Affiliate revenue", input.affiliateRevenue, 0],
    ["B2B leads added", input.b2bLeads, 0],
    ["Sales meetings", input.meetings, 0],
    ["Proposals sent", input.proposals, 0],
    ["New clients", input.newClients, 0],
    ["Press wins", input.pressWins, 0],
    ["Speaking opportunities", input.speakingOps, 0],
  ];
  return rows.map(([label, current, target]) => ({
    label,
    current,
    target,
    variance: target > 0 ? current - target : current,
  }));
}
