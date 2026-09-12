/**
 * Consumer user growth plan — 25,000 registered accounts by end of 2027.
 * Pure targets and trajectory math (no Supabase import).
 */

export const USER_GROWTH_TARGET = 25_000;
export const USER_GROWTH_DEADLINE_ISO = "2027-12-31";
export const USER_GROWTH_START_ISO = "2026-01-01";

export const USER_GROWTH_COLORS = {
  ink: "#1a1a1a",
  track: "#E8E4DC",
  actual: "#3B7BFF",
  target: "#C4BFB6",
  ahead: "#22A06B",
  behind: "#E86A3C",
  neutral: "#9c7b8b",
  canvas: "#f6f5f3",
} as const;

export type UserGrowthMilestone = {
  name: string;
  targetDate: string;
  cumulative: number;
  logic: string;
};

/** Stepped plan — not linear daily grind; milestones anchor the narrative. */
export const USER_GROWTH_MILESTONES: UserGrowthMilestone[] = [
  {
    name: "Plan baseline",
    targetDate: USER_GROWTH_START_ISO,
    cumulative: 0,
    logic: "Registered accounts with first-touch attribution in user_preferences.",
  },
  {
    name: "End 2026",
    targetDate: "2026-12-31",
    cumulative: 5_000,
    logic: "Organic + founder outreach + first paid loops prove repeatable signup.",
  },
  {
    name: "Mid 2027",
    targetDate: "2027-06-30",
    cumulative: 12_500,
    logic: "Lifecycle email + scanner + app install flywheel at scale.",
  },
  {
    name: "End 2027",
    targetDate: USER_GROWTH_DEADLINE_ISO,
    cumulative: USER_GROWTH_TARGET,
    logic: "25,000 registered users — foundation for commerce and DPP platform proof.",
  },
];

export type UserGrowthTrajectoryPoint = {
  weekStart: string;
  target: number;
  actual: number | null;
  gap: number | null;
  isFuture: boolean;
};

export type UserGrowthPace = "ahead" | "on_track" | "behind" | "unknown";

export function formatUserCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 100) / 10}k`;
  return n.toLocaleString("en-US");
}

export function formatUserCountCompact(n: number): string {
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(n);
}

export function parsePlanDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

export function weeksBetween(startIso: string, endIso: string): number {
  const start = parsePlanDate(startIso).getTime();
  const end = parsePlanDate(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(1, Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000)));
}

/** Interpolate milestone curve for any date between defined milestones. */
export function targetUsersOnDate(dateIso: string): number {
  const t = parsePlanDate(dateIso).getTime();
  const sorted = [...USER_GROWTH_MILESTONES].sort(
    (a, b) => parsePlanDate(a.targetDate).getTime() - parsePlanDate(b.targetDate).getTime()
  );
  if (t <= parsePlanDate(sorted[0].targetDate).getTime()) return sorted[0].cumulative;
  const last = sorted[sorted.length - 1];
  if (t >= parsePlanDate(last.targetDate).getTime()) return last.cumulative;

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const t0 = parsePlanDate(a.targetDate).getTime();
    const t1 = parsePlanDate(b.targetDate).getTime();
    if (t >= t0 && t <= t1) {
      const r = (t - t0) / (t1 - t0);
      return Math.round(a.cumulative + r * (b.cumulative - a.cumulative));
    }
  }
  return last.cumulative;
}

export function buildWeeklyUserTrajectory(opts: {
  currentTotal: number;
  weeklyActual: Array<{ weekStart: string; signups: number }>;
  asOfIso?: string;
}): UserGrowthTrajectoryPoint[] {
  const asOf = opts.asOfIso?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const start = parsePlanDate(USER_GROWTH_START_ISO);
  const end = parsePlanDate(USER_GROWTH_DEADLINE_ISO);
  const points: UserGrowthTrajectoryPoint[] = [];

  const actualByWeek = new Map(opts.weeklyActual.map((w) => [w.weekStart.slice(0, 10), w.signups]));
  const pastWeeks: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const weekStart = cursor.toISOString().slice(0, 10);
    if (weekStart <= asOf) pastWeeks.push(weekStart);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  let runningActual = 0;
  cursor.setTime(start.getTime());
  while (cursor.getTime() <= end.getTime()) {
    const weekStart = cursor.toISOString().slice(0, 10);
    const isFuture = weekStart > asOf;
    const weekSignups = actualByWeek.get(weekStart) ?? 0;
    if (!isFuture) runningActual += weekSignups;

    const target = targetUsersOnDate(weekStart);
    let actual: number | null = null;
    if (!isFuture) {
      const isLatestPast = weekStart === pastWeeks[pastWeeks.length - 1];
      actual = isLatestPast ? opts.currentTotal : runningActual;
    }
    const gap = actual == null ? null : target - actual;

    points.push({ weekStart, target, actual, gap, isFuture });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return points;
}

export function computeUserGrowthPace(opts: {
  currentTotal: number;
  signups7d: number;
  asOfIso?: string;
}): {
  pace: UserGrowthPace;
  targetToday: number;
  gapToGoal: number;
  progressPct: number;
  weeksRemaining: number;
  requiredWeekly: number;
  actualWeekly: number;
  label: string;
} {
  const asOf = opts.asOfIso?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const targetToday = targetUsersOnDate(asOf);
  const gapToGoal = USER_GROWTH_TARGET - opts.currentTotal;
  const progressPct = USER_GROWTH_TARGET > 0 ? (opts.currentTotal / USER_GROWTH_TARGET) * 100 : 0;
  const weeksRemaining = weeksBetween(asOf, USER_GROWTH_DEADLINE_ISO);
  const requiredWeekly = weeksRemaining > 0 ? Math.ceil(gapToGoal / weeksRemaining) : gapToGoal;
  const actualWeekly = opts.signups7d;

  let pace: UserGrowthPace = "unknown";
  let label = "Building baseline";
  if (opts.currentTotal > 0 && weeksRemaining > 0) {
    const delta = opts.currentTotal - targetToday;
    if (delta >= requiredWeekly) {
      pace = "ahead";
      label = "Ahead of plan";
    } else if (delta >= -requiredWeekly) {
      pace = "on_track";
      label = "On plan";
    } else {
      pace = "behind";
      label = "Behind plan";
    }
  }

  return {
    pace,
    targetToday,
    gapToGoal,
    progressPct,
    weeksRemaining,
    requiredWeekly,
    actualWeekly,
    label,
  };
}

/** Map lifecycle email programs to growth funnel stages for the curated dashboard. */
export const EMAIL_GROWTH_LEVERS = [
  { emailType: "founder_welcome", label: "Founder Welcome", stage: "Acquire", color: "#3B7BFF" },
  { emailType: "lifecycle_day4", label: "Day 4", stage: "Activate", color: "#22A06B" },
  { emailType: "lifecycle_day10", label: "Day 10", stage: "Activate", color: "#22A06B" },
  { emailType: "lifecycle_day25", label: "Day 25", stage: "Retain", color: "#9c7b8b" },
  { emailType: "weekly_edit", label: "Weekly Edit", stage: "Retain", color: "#E8C547" },
  { emailType: "price_drop", label: "Price Drop", stage: "Convert", color: "#E86A3C" },
  { emailType: "sale_alert", label: "Sale alerts", stage: "Convert", color: "#E86A3C" },
  { emailType: "scan_followup", label: "Scan Follow-up", stage: "Activate", color: "#5C6B8A" },
] as const;

export function paceColor(pace: UserGrowthPace): string {
  if (pace === "ahead") return USER_GROWTH_COLORS.ahead;
  if (pace === "on_track") return USER_GROWTH_COLORS.actual;
  if (pace === "behind") return USER_GROWTH_COLORS.behind;
  return USER_GROWTH_COLORS.neutral;
}
