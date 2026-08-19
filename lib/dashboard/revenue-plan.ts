/**
 * Founder $50K plan: pure targets, scopes and revenue math.
 *
 * No Supabase import here on purpose — every function is directly unit-testable
 * and the HQ page can render the plan before the migration is applied.
 *
 * Scope rules:
 * - company  = INTERTEXE contracted and invoiced revenue
 * - personal = @khiteri creator partnerships contracted personally
 * - combined = company + personal, the founder's own $50,000 objective
 * Combined revenue is never reported as INTERTEXE company revenue.
 */

export type RevenueScope = "company" | "personal" | "combined";
export type EntryScope = Exclude<RevenueScope, "combined">;

export type RevenueStreamKey =
  | "api_pilot"
  | "api_integration"
  | "affiliate"
  | "intertexe_partnership"
  | "creator_partnership";

export type DealStageKey =
  | "prospect"
  | "qualified"
  | "snapshot_sent"
  | "meeting"
  | "proposal"
  | "verbal"
  | "won"
  | "lost";

export type ActivityType =
  | "qualified_account"
  | "personalized_outreach"
  | "snapshot_sent"
  | "meeting"
  | "proposal";

export const PLAN_START_ISO = "2026-08-18";
export const SEPTEMBER_MILESTONE_ISO = "2026-09-30";
export const DECEMBER_MILESTONE_ISO = "2026-12-31";

/** Chart tokens for the scaled booking plan. */
export const PLAN_COLORS = {
  ink: "#1a1a1a",
  canvas: "#f6f5f3",
  track: "#E8E4DC",
  pilot: "#3B7BFF",
  integration: "#22A06B",
  creator: "#E86A3C",
  affiliate: "#E8C547",
  partnership: "#5C6B8A",
  mauve: "#3B7BFF",
  mauveDeep: "#22A06B",
  sage: "#22A06B",
  gold: "#E8C547",
  terracotta: "#E86A3C",
  plan: "#C4BFB6",
} as const;

export type StreamMeta = {
  key: RevenueStreamKey;
  label: string;
  shortLabel: string;
  scope: EntryScope;
  color: string;
  /** Paired with color so meaning is never carried by color alone. */
  pattern: "solid" | "hatch" | "dots";
};

export const REVENUE_STREAMS: StreamMeta[] = [
  {
    key: "api_pilot",
    label: "Pilot",
    shortLabel: "Pilot",
    scope: "company",
    color: PLAN_COLORS.pilot,
    pattern: "solid",
  },
  {
    key: "api_integration",
    label: "Integration",
    shortLabel: "Integration",
    scope: "company",
    color: PLAN_COLORS.integration,
    pattern: "hatch",
  },
  {
    key: "affiliate",
    label: "Affiliate",
    shortLabel: "Affiliate",
    scope: "company",
    color: PLAN_COLORS.affiliate,
    pattern: "dots",
  },
  {
    key: "intertexe_partnership",
    label: "INTERTEXE partnership",
    shortLabel: "Partnership",
    scope: "company",
    color: PLAN_COLORS.partnership,
    pattern: "solid",
  },
  {
    key: "creator_partnership",
    label: "Creator",
    shortLabel: "Creator",
    scope: "personal",
    color: PLAN_COLORS.creator,
    pattern: "hatch",
  },
];

export function streamMeta(key: string): StreamMeta | undefined {
  return REVENUE_STREAMS.find((s) => s.key === key);
}

export function scopeOfStream(key: string): EntryScope {
  return streamMeta(key)?.scope || "company";
}

export type StageMeta = {
  key: DealStageKey;
  label: string;
  probability: number;
  sortOrder: number;
  isOpen: boolean;
  isWon: boolean;
};

/** Defaults; overridden by hq_deal_stages rows when the migration is applied. */
export const DEFAULT_STAGES: StageMeta[] = [
  { key: "prospect", label: "Prospect", probability: 0.05, sortOrder: 10, isOpen: true, isWon: false },
  { key: "qualified", label: "Qualified", probability: 0.1, sortOrder: 20, isOpen: true, isWon: false },
  { key: "snapshot_sent", label: "Snapshot sent", probability: 0.2, sortOrder: 30, isOpen: true, isWon: false },
  { key: "meeting", label: "Meeting", probability: 0.35, sortOrder: 40, isOpen: true, isWon: false },
  { key: "proposal", label: "Proposal", probability: 0.6, sortOrder: 50, isOpen: true, isWon: false },
  { key: "verbal", label: "Verbal agreement", probability: 0.8, sortOrder: 60, isOpen: true, isWon: false },
  { key: "won", label: "Won", probability: 1, sortOrder: 70, isOpen: false, isWon: true },
  { key: "lost", label: "Lost", probability: 0, sortOrder: 80, isOpen: false, isWon: false },
];

export type Milestone = {
  name: string;
  targetDate: string;
  cumulative: number;
  /** New bookings expected inside this period. */
  increment: number;
  logic: string;
};

/**
 * Stacked, not evenly divided: $12,500 is the expected early API-integration
 * deal size, never a monthly target.
 */
export const DEFAULT_MILESTONES: Milestone[] = [
  { name: "Plan start", targetDate: PLAN_START_ISO, cumulative: 0, increment: 0, logic: "Cumulative plan starts at zero booked revenue." },
  {
    name: "September milestone",
    targetDate: SEPTEMBER_MILESTONE_ISO,
    cumulative: 5000,
    increment: 5000,
    logic: "Close the first founding pilot and prove the sales process.",
  },
  {
    name: "October",
    targetDate: "2026-10-31",
    cumulative: 15000,
    increment: 10000,
    logic: "Close two additional pilots using the first proof.",
  },
  {
    name: "November",
    targetDate: "2026-11-30",
    cumulative: 30000,
    increment: 15000,
    logic: "Book the $12,500 integration and the first affiliate buffer.",
  },
  {
    name: "December goal",
    targetDate: DECEMBER_MILESTONE_ISO,
    cumulative: 50000,
    increment: 20000,
    logic: "Close two more $5,000 pilots plus creator and remaining affiliate buffer.",
  },
];

export const DEFAULT_STREAM_TARGETS: Array<{
  stream: RevenueStreamKey;
  target: number;
  unitTarget: number | null;
  unitPlan: string;
}> = [
  { stream: "api_pilot", target: 25000, unitTarget: 5, unitPlan: "Five $5,000 Founding Material Data Pilots sold on /platform" },
  { stream: "api_integration", target: 12500, unitTarget: 1, unitPlan: "One early integration after a paid pilot" },
  { stream: "creator_partnership", target: 9000, unitTarget: 3, unitPlan: "Three partnerships at $3,000" },
  { stream: "affiliate", target: 3500, unitTarget: null, unitPlan: "Confirmed commission revenue" },
];

export type MonthlyBookingMix = {
  month: string;
  endDate: string;
  newTarget: number;
  cumulative: number;
  segments: Array<{ stream: RevenueStreamKey; amount: number }>;
};

export const PLAN_BOOKING_SUBTITLE = "5 pilots · 1 integration · creator and affiliate buffer.";

/** Streams shown as colored squares on the scaled booking plan. */
export const BOOKING_LEGEND_STREAMS: RevenueStreamKey[] = [
  "api_pilot",
  "api_integration",
  "creator_partnership",
  "affiliate",
];

/** Visible monthly stack: 5 pilots · 1 integration · creator and affiliate buffer. */
export const MONTHLY_BOOKING_MIX: MonthlyBookingMix[] = [
  {
    month: "September",
    endDate: SEPTEMBER_MILESTONE_ISO,
    newTarget: 5000,
    cumulative: 5000,
    segments: [{ stream: "api_pilot", amount: 5000 }],
  },
  {
    month: "October",
    endDate: "2026-10-31",
    newTarget: 10000,
    cumulative: 15000,
    segments: [{ stream: "api_pilot", amount: 10000 }],
  },
  {
    month: "November",
    endDate: "2026-11-30",
    newTarget: 15000,
    cumulative: 30000,
    segments: [
      { stream: "api_integration", amount: 12500 },
      { stream: "affiliate", amount: 2500 },
    ],
  },
  {
    month: "December",
    endDate: DECEMBER_MILESTONE_ISO,
    newTarget: 20000,
    cumulative: 50000,
    segments: [
      { stream: "api_pilot", amount: 10000 },
      { stream: "creator_partnership", amount: 9000 },
      { stream: "affiliate", amount: 1000 },
    ],
  },
];

export const PLAN_DECISION_GATE = {
  label: "Decision gate",
  text: "If no creator contracts by Nov 1, switch to B2B-heavy.",
};

export const PLAN_MUST_HAPPEN_NEXT = [
  "Correct /platform, /about, /press and repeated verified claims.",
  "Finish the Material Intelligence migration and production smoke tests.",
  "Make /platform/demo, /platform/docs, /platform/request and OpenAPI publicly functional.",
  "Benchmark ten catalogs before promising coverage, turnaround or margin.",
  "Finalize the $5K pilot SOW, sample deliverable, invoice path and data-handling one-pager.",
  "Select the first 30 high-fit retailers, marketplaces, resale platforms and EU-selling brands.",
  "Produce five personalized snapshots and start meetings immediately.",
  "Restore the Chrome extension’s branded TX Match experience — do not let extension approval block B2B sales.",
];

export type FunnelStageKey =
  | "qualified_account"
  | "snapshot_sent"
  | "meeting"
  | "proposal"
  | "won"
  | "api_integration";

export const FUNNEL_STAGES: Array<{ key: FunnelStageKey; label: string }> = [
  { key: "qualified_account", label: "Qualified accounts" },
  { key: "snapshot_sent", label: "Snapshots" },
  { key: "meeting", label: "Meetings" },
  { key: "proposal", label: "Proposals" },
  { key: "won", label: "Paid pilots" },
  { key: "api_integration", label: "Integrations" },
];

export const DEFAULT_FUNNEL_TARGETS: Record<FunnelStageKey, { september: number; december: number }> = {
  qualified_account: { september: 100, december: 150 },
  snapshot_sent: { september: 20, december: 60 },
  meeting: { september: 12, december: 30 },
  proposal: { september: 3, december: 15 },
  won: { september: 1, december: 5 },
  api_integration: { september: 0, december: 1 },
};

export const DEFAULT_WEEKLY_ACTIVITY_TARGETS: Record<
  Exclude<ActivityType, "qualified_account">,
  number
> = {
  personalized_outreach: 25,
  snapshot_sent: 3,
  meeting: 2,
  proposal: 1,
};

/* ------------------------------------------------------------------ *
 * Revenue math
 * ------------------------------------------------------------------ */

export type DealRow = {
  id: string;
  companyName: string;
  opportunity: string | null;
  revenueStream: string;
  scope: EntryScope;
  amount: number;
  stage: string;
  probabilityOverride: number | null;
  expectedCloseDate: string | null;
  bookedAt: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  entryMode: string;
};

export type PaymentRow = {
  id: string;
  dealId: string | null;
  scope: EntryScope;
  revenueStream: string | null;
  amount: number;
  kind: "payment" | "refund";
  status: "pending" | "cleared" | "failed";
  paidAt: string | null;
};

export function inScope(rowScope: EntryScope, view: RevenueScope): boolean {
  return view === "combined" || rowScope === view;
}

function stageOf(stages: StageMeta[], key: string): StageMeta | undefined {
  return stages.find((s) => s.key === key);
}

export function stageProbability(stages: StageMeta[], deal: Pick<DealRow, "stage" | "probabilityOverride">): number {
  if (deal.probabilityOverride != null) return clamp01(deal.probabilityOverride);
  return clamp01(stageOf(stages, deal.stage)?.probability ?? 0);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Signed or contractually committed value. A stage marked won counts as booked. */
export function computeBookedRevenue(
  deals: DealRow[],
  stages: StageMeta[],
  view: RevenueScope,
  opts?: { asOf?: Date }
): number {
  const cutoff = opts?.asOf ? opts.asOf.getTime() : null;
  return round2(
    deals.reduce((sum, deal) => {
      if (!inScope(deal.scope, view)) return sum;
      if (!stageOf(stages, deal.stage)?.isWon) return sum;
      if (cutoff != null) {
        const booked = deal.bookedAt ? Date.parse(deal.bookedAt) : null;
        // A won deal with no booked date is counted now, not backdated.
        if (booked != null && Number.isFinite(booked) && booked > cutoff) return sum;
      }
      return sum + toNumber(deal.amount);
    }, 0)
  );
}

/**
 * Cleared payments only. Never derived from deal status.
 * Refunds carry a negative amount and reduce collected cash.
 */
export function computeCashCollected(
  payments: PaymentRow[],
  view: RevenueScope,
  opts?: { from?: Date; to?: Date }
): number {
  const from = opts?.from ? opts.from.getTime() : null;
  const to = opts?.to ? opts.to.getTime() : null;
  return round2(
    payments.reduce((sum, payment) => {
      if (payment.status !== "cleared") return sum;
      if (!inScope(payment.scope, view)) return sum;
      const at = payment.paidAt ? Date.parse(payment.paidAt) : null;
      if (from != null && (at == null || at < from)) return sum;
      if (to != null && at != null && at > to) return sum;
      return sum + toNumber(payment.amount);
    }, 0)
  );
}

/** Signed value not yet cleared, so the founder can chase invoices. */
export function computeOutstandingInvoiced(
  deals: DealRow[],
  payments: PaymentRow[],
  stages: StageMeta[],
  view: RevenueScope
): number {
  const booked = computeBookedRevenue(deals, stages, view);
  const collected = computeCashCollected(payments, view);
  return round2(Math.max(0, booked - collected));
}

/** Open deal value multiplied by stage probability. Never counted as booked. */
export function computeWeightedPipeline(
  deals: DealRow[],
  stages: StageMeta[],
  view: RevenueScope,
  opts?: { closingBy?: Date }
): number {
  const by = opts?.closingBy ? opts.closingBy.getTime() : null;
  return round2(
    deals.reduce((sum, deal) => {
      if (!inScope(deal.scope, view)) return sum;
      if (!stageOf(stages, deal.stage)?.isOpen) return sum;
      if (by != null) {
        const expected = deal.expectedCloseDate ? Date.parse(`${deal.expectedCloseDate}T23:59:59Z`) : null;
        // No expected close date means it cannot be promised by a deadline.
        if (expected == null || !Number.isFinite(expected) || expected > by) return sum;
      }
      return sum + toNumber(deal.amount) * stageProbability(stages, deal);
    }, 0)
  );
}

export function computeForecast(
  deals: DealRow[],
  stages: StageMeta[],
  view: RevenueScope,
  deadline: Date
): number {
  return round2(
    computeBookedRevenue(deals, stages, view) +
      computeWeightedPipeline(deals, stages, view, { closingBy: deadline })
  );
}

/** Straight-line interpolation between editable milestone records. */
export function interpolateTarget(milestones: Milestone[], on: Date): number {
  const points = [...milestones]
    .map((m) => ({ t: Date.parse(`${m.targetDate}T23:59:59Z`), value: m.cumulative }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
  if (!points.length) return 0;

  const at = on.getTime();
  if (at <= points[0].t) return round2(points[0].value);
  const last = points[points.length - 1];
  if (at >= last.t) return round2(last.value);

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const next = points[i];
    if (at <= next.t) {
      const span = next.t - prev.t;
      if (span <= 0) return round2(next.value);
      const ratio = (at - prev.t) / span;
      return round2(prev.value + (next.value - prev.value) * ratio);
    }
  }
  return round2(last.value);
}

export function nextMilestone(milestones: Milestone[], on: Date): Milestone | null {
  const at = on.getTime();
  const upcoming = [...milestones]
    .filter((m) => m.cumulative > 0)
    .sort((a, b) => Date.parse(a.targetDate) - Date.parse(b.targetDate))
    .find((m) => Date.parse(`${m.targetDate}T23:59:59Z`) >= at);
  if (upcoming) return upcoming;
  const all = [...milestones].sort((a, b) => Date.parse(a.targetDate) - Date.parse(b.targetDate));
  return all[all.length - 1] || null;
}

export type PaceStatus = "on_pace" | "needs_attention" | "off_pace" | "no_data";

/**
 * Documented thresholds against the interpolated plan for today:
 * >= 95% on pace, >= 70% needs attention, below that off pace.
 */
export const PACE_THRESHOLDS = { onPace: 0.95, needsAttention: 0.7 } as const;

export function paceRatio(booked: number, expectedToday: number): number | null {
  if (expectedToday <= 0) return null;
  return booked / expectedToday;
}

export function paceStatus(booked: number, expectedToday: number): PaceStatus {
  const ratio = paceRatio(booked, expectedToday);
  if (ratio == null) return "no_data";
  if (ratio >= PACE_THRESHOLDS.onPace) return "on_pace";
  if (ratio >= PACE_THRESHOLDS.needsAttention) return "needs_attention";
  return "off_pace";
}

export function paceLabel(status: PaceStatus): string {
  if (status === "on_pace") return "On pace";
  if (status === "needs_attention") return "Needs attention";
  if (status === "off_pace") return "Off pace";
  return "No target yet";
}

export function paceColor(status: PaceStatus): string {
  if (status === "on_pace") return PLAN_COLORS.sage;
  if (status === "needs_attention") return PLAN_COLORS.gold;
  if (status === "off_pace") return PLAN_COLORS.terracotta;
  return PLAN_COLORS.plan;
}

export function computeGap(target: number, booked: number): number {
  return round2(Math.max(0, target - booked));
}

/**
 * Booked revenue for a scope view, combining manually recorded deals with the
 * live affiliate commission feed. Affiliate is always INTERTEXE company revenue,
 * so it is excluded from the personal view.
 */
export function composeBooked(
  dealsBooked: number,
  affiliateBooked: number | null,
  view: RevenueScope
): number {
  const affiliate = view === "personal" ? 0 : toNumber(affiliateBooked);
  return round2(toNumber(dealsBooked) + affiliate);
}

export type FunnelRow = {
  key: FunnelStageKey;
  label: string;
  actual: number;
  target: number;
  /** Conversion from the previous stage. Null for the first stage. */
  conversionFromPrevious: number | null;
};

export function buildFunnel(
  actuals: Record<FunnelStageKey, number>,
  targets: Record<FunnelStageKey, number>
): FunnelRow[] {
  return FUNNEL_STAGES.map((stage, index) => {
    const previous = index > 0 ? actuals[FUNNEL_STAGES[index - 1].key] : null;
    const actual = actuals[stage.key] || 0;
    return {
      key: stage.key,
      label: stage.label,
      actual,
      target: targets[stage.key] || 0,
      conversionFromPrevious: previous && previous > 0 ? actual / previous : null,
    };
  });
}

/** The stage furthest behind its target, which is where attention belongs. */
export function weakestFunnelStage(rows: FunnelRow[]): FunnelRow | null {
  const scored = rows
    .filter((r) => r.target > 0)
    .map((r) => ({ row: r, ratio: r.actual / r.target }))
    .sort((a, b) => a.ratio - b.ratio);
  return scored.length ? scored[0].row : null;
}

/* ------------------------------------------------------------------ *
 * Formatting and week helpers
 * ------------------------------------------------------------------ */

export function formatPlanMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const rounded = Math.round(n);
  return `$${rounded.toLocaleString("en-US")}`;
}

export function formatPlanCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) {
    const k = n / 1000;
    const digits = Number.isInteger(k) ? 0 : 1;
    return `$${k.toFixed(digits)}K`;
  }
  return formatPlanMoney(n);
}

export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatPlanDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Monday 00:00 UTC of the week containing `date`. */
export function startOfWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
}

export function weekStartsBetween(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  let cursor = startOfWeekUtc(from);
  const end = to.getTime();
  while (cursor.getTime() <= end) {
    out.push(new Date(cursor));
    const next = new Date(cursor);
    next.setUTCDate(next.getUTCDate() + 7);
    cursor = next;
  }
  return out;
}

function toNumber(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
