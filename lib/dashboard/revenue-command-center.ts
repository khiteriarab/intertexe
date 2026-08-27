/**
 * Founder $50K command center data layer.
 *
 * Reads the existing HQ ecosystem (hq_contacts, hq_affiliate_transactions,
 * material_api_*, App Store snapshots, capture/clickout tables) and the new
 * hq_deals / hq_deal_payments / hq_revenue_activities / hq_revenue_targets
 * tables. Nothing here writes to or reshapes an existing table.
 *
 * A missing table is reported as unavailable, never as zero.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "../supabase-service-client";
import { fetchAppStoreDiscoveryMetrics, fetchChromeWebStoreDiscoveryMetrics } from "./integration-metrics";
import {
  DEFAULT_FUNNEL_TARGETS,
  DEFAULT_MILESTONES,
  DEFAULT_STAGES,
  DEFAULT_STREAM_TARGETS,
  DEFAULT_WEEKLY_ACTIVITY_TARGETS,
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
  paceRatio,
  paceStatus,
  scopeOfStream,
  startOfWeekUtc,
  stageProbability,
  weakestFunnelStage,
  weekStartsBetween,
  type ActivityType,
  type DealRow,
  type EntryScope,
  type FunnelStageKey,
  type Milestone,
  type PaymentRow,
  type RevenueScope,
  type RevenueStreamKey,
  type StageMeta,
} from "./revenue-plan";

/** How a number reached the dashboard. Drives empty-state copy. */
export type DataAvailability = "live" | "manual" | "unavailable" | "pending";

export type SourceAudit = {
  id: string;
  label: string;
  availability: DataAvailability;
  detail: string;
  /** The single action that would connect or begin tracking this metric. */
  action?: string;
};

export type ChannelMetric = {
  id: string;
  label: string;
  value: number | null;
  window: string;
  availability: DataAvailability;
  note: string;
  action?: string;
};

export type ReadinessCheck = {
  key: string;
  label: string;
  passed: boolean;
  availability: DataAvailability;
  detail: string;
};

export type NextActionItem = {
  id: string;
  company: string;
  opportunity: string;
  amount: number | null;
  stage: string;
  stageLabel: string;
  dueDate: string | null;
  nextAction: string;
  reason: string;
  overdue: boolean;
};

export type TrajectoryPoint = {
  weekStart: string;
  target: number;
  actual: number | null;
  gap: number | null;
  isFuture: boolean;
};

export type WeeklyActivityPoint = {
  weekStart: string;
  counts: Record<Exclude<ActivityType, "qualified_account">, number>;
};

export type StreamMixRow = {
  stream: RevenueStreamKey;
  label: string;
  scope: EntryScope;
  booked: number;
  target: number;
  unitPlan: string;
  availability: DataAvailability;
};

export type ScopeTotals = {
  scope: RevenueScope;
  booked: number;
  cashCollected: number;
  outstanding: number;
  weightedPipeline: number;
  forecastAtDeadline: number;
  targetToday: number;
  paceRatio: number | null;
  pace: ReturnType<typeof paceStatus>;
  gapToNextMilestone: number;
  gapToDecember: number;
};

export type CommandCenterBundle = {
  now: string;
  planStart: string;
  septemberMilestone: string;
  decemberMilestone: string;
  /** False until 20260820_hq_revenue_command_center.sql is applied. */
  planTablesReady: boolean;
  targetsAreEditable: boolean;
  stages: StageMeta[];
  milestones: Milestone[];
  nextMilestone: Milestone | null;
  totals: Record<RevenueScope, ScopeTotals>;
  trajectory: TrajectoryPoint[];
  funnel: {
    september: ReturnType<typeof buildFunnel>;
    december: ReturnType<typeof buildFunnel>;
    weakest: ReturnType<typeof weakestFunnelStage>;
    availability: DataAvailability;
  };
  streamMix: StreamMixRow[];
  weeklyActivity: WeeklyActivityPoint[];
  weeklyTargets: Record<Exclude<ActivityType, "qualified_account">, number>;
  nextActions: NextActionItem[];
  deals: DealRow[];
  apiReadiness: {
    checks: ReadinessCheck[];
    passed: number;
    total: number;
    commerciallyReady: boolean;
  };
  apiOperating: {
    availability: DataAvailability;
    activeClients: number | null;
    requests30d: number | null;
    exactMatchRate: number | null;
    manufacturerOnlyRate: number | null;
    notFoundRate: number | null;
    errorRate: number | null;
    rateLimitEvents: number | null;
    evidenceDistribution: Array<{ status: string; count: number }>;
  };
  consumer: ChannelMetric[];
  sources: SourceAudit[];
};

/* ------------------------------------------------------------------ *
 * Missing table vs empty table
 * ------------------------------------------------------------------ */

function looksMissing(message: string | undefined): boolean {
  if (!message) return false;
  return /does not exist|schema cache|could not find|relation .* does not exist|permission denied/i.test(
    message
  );
}

type Probe<T> = { rows: T[]; available: boolean };

async function safeRows<T>(
  supabase: SupabaseClient,
  table: string,
  build: (q: any) => any
): Promise<Probe<T>> {
  try {
    const { data, error } = await build(supabase.from(table));
    if (error) return { rows: [], available: !looksMissing(error.message) };
    return { rows: (data || []) as T[], available: true };
  } catch {
    return { rows: [], available: false };
  }
}

async function safeCount(
  supabase: SupabaseClient,
  table: string,
  build: (q: any) => any = (q) => q
): Promise<{ value: number | null; available: boolean }> {
  try {
    const { count, error } = await build(supabase.from(table).select("id", { count: "exact", head: true }));
    if (error) return { value: null, available: !looksMissing(error.message) };
    return { value: count ?? 0, available: true };
  } catch {
    return { value: null, available: false };
  }
}

/* ------------------------------------------------------------------ *
 * Targets
 * ------------------------------------------------------------------ */

type TargetRow = {
  metric: string;
  scope: string;
  target_value: number | string;
  target_date: string;
  revenue_stream: string | null;
  unit_target: number | null;
  name: string | null;
  notes: string | null;
};

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function milestonesFromTargets(rows: TargetRow[]): Milestone[] {
  const cumulative = rows
    .filter((r) => r.metric === "booked_revenue_cumulative")
    .sort((a, b) => a.target_date.localeCompare(b.target_date));
  if (!cumulative.length) return DEFAULT_MILESTONES;

  let previous = 0;
  return cumulative.map((row) => {
    const value = num(row.target_value);
    const milestone: Milestone = {
      name: row.name || row.target_date,
      targetDate: row.target_date,
      cumulative: value,
      increment: Math.max(0, value - previous),
      logic: row.notes || "",
    };
    previous = value;
    return milestone;
  });
}

function funnelTargetsFor(rows: TargetRow[], date: string): Record<FunnelStageKey, number> {
  const out = {} as Record<FunnelStageKey, number>;
  for (const stage of FUNNEL_STAGES) {
    const key = stage.key === "api_integration" ? "funnel_api_integration" : `funnel_${stage.key}`;
    const row = rows.find((r) => r.metric === key && r.target_date === date);
    const fallback =
      date === SEPTEMBER_MILESTONE_ISO
        ? DEFAULT_FUNNEL_TARGETS[stage.key].september
        : DEFAULT_FUNNEL_TARGETS[stage.key].december;
    out[stage.key] = row ? num(row.target_value) : fallback;
  }
  return out;
}

function weeklyTargetsFrom(rows: TargetRow[]) {
  const out = { ...DEFAULT_WEEKLY_ACTIVITY_TARGETS };
  for (const key of Object.keys(out) as Array<keyof typeof out>) {
    const row = rows.find((r) => r.metric === `weekly_${key}`);
    if (row) out[key] = num(row.target_value);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Bundle
 * ------------------------------------------------------------------ */

const READINESS_CONFIRMABLE = [
  { key: "public_demo_live", label: "Public demo live" },
  { key: "docs_openapi_live", label: "Documentation and OpenAPI live" },
  { key: "evidence_protocol_documented", label: "Evidence protocol documented" },
] as const;

export async function fetchRevenueCommandCenter(
  workspaceId: string,
  opts?: { now?: Date }
): Promise<CommandCenterBundle> {
  const now = opts?.now || new Date();
  const supabase = getServerSupabase();
  const decemberDeadline = new Date(`${DECEMBER_MILESTONE_ISO}T23:59:59Z`);

  if (!supabase) {
    return emptyBundle(now, "unavailable");
  }

  const planStart = new Date(`${PLAN_START_ISO}T00:00:00Z`);

  const [
    stageRows,
    targetRows,
    dealRows,
    paymentRows,
    activityRows,
    confirmationRows,
  ] = await Promise.all([
    safeRows<{ key: string; label: string; probability: number | string; sort_order: number; is_open: boolean; is_won: boolean }>(
      supabase,
      "hq_deal_stages",
      (q) => q.select("key, label, probability, sort_order, is_open, is_won").order("sort_order")
    ),
    safeRows<TargetRow>(supabase, "hq_revenue_targets", (q) =>
      q
        .select("metric, scope, target_value, target_date, revenue_stream, unit_target, name, notes")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .limit(400)
    ),
    safeRows<Record<string, unknown>>(supabase, "hq_deals", (q) =>
      q
        .select(
          "id, company_name, opportunity, revenue_stream, scope, amount, stage, probability_override, expected_close_date, booked_at, next_action, next_action_at, entry_mode"
        )
        .eq("workspace_id", workspaceId)
        .limit(500)
    ),
    safeRows<Record<string, unknown>>(supabase, "hq_deal_payments", (q) =>
      q
        .select("id, deal_id, scope, revenue_stream, amount, kind, status, paid_at")
        .eq("workspace_id", workspaceId)
        .limit(500)
    ),
    safeRows<{ activity_type: string; completed_at: string }>(supabase, "hq_revenue_activities", (q) =>
      q
        .select("activity_type, completed_at")
        .eq("workspace_id", workspaceId)
        .gte("completed_at", planStart.toISOString())
        .limit(2000)
    ),
    safeRows<{ check_key: string; confirmed: boolean }>(supabase, "hq_founder_confirmations", (q) =>
      q.select("check_key, confirmed").eq("workspace_id", workspaceId).limit(50)
    ),
  ]);

  const planTablesReady = dealRows.available && paymentRows.available && activityRows.available;

  const stages: StageMeta[] = stageRows.rows.length
    ? stageRows.rows.map((r) => ({
        key: r.key as StageMeta["key"],
        label: r.label,
        probability: num(r.probability),
        sortOrder: r.sort_order,
        isOpen: Boolean(r.is_open),
        isWon: Boolean(r.is_won),
      }))
    : DEFAULT_STAGES;

  const deals: DealRow[] = dealRows.rows.map((row) => ({
    id: String(row.id),
    companyName: String(row.company_name || "—"),
    opportunity: (row.opportunity as string) || null,
    revenueStream: String(row.revenue_stream || "api_pilot"),
    scope: (row.scope === "personal" ? "personal" : "company") as EntryScope,
    amount: num(row.amount),
    stage: String(row.stage || "prospect"),
    probabilityOverride: row.probability_override == null ? null : num(row.probability_override),
    expectedCloseDate: (row.expected_close_date as string) || null,
    bookedAt: (row.booked_at as string) || null,
    nextAction: (row.next_action as string) || null,
    nextActionAt: (row.next_action_at as string) || null,
    entryMode: String(row.entry_mode || "manual"),
  }));

  const payments: PaymentRow[] = paymentRows.rows.map((row) => ({
    id: String(row.id),
    dealId: (row.deal_id as string) || null,
    scope: (row.scope === "personal" ? "personal" : "company") as EntryScope,
    revenueStream: (row.revenue_stream as string) || null,
    amount: num(row.amount),
    kind: row.kind === "refund" ? "refund" : "payment",
    status: (row.status === "pending" || row.status === "failed" ? row.status : "cleared") as PaymentRow["status"],
    paidAt: (row.paid_at as string) || null,
  }));

  const milestones = milestonesFromTargets(targetRows.rows);
  const septemberTargets = funnelTargetsFor(targetRows.rows, SEPTEMBER_MILESTONE_ISO);
  const decemberTargets = funnelTargetsFor(targetRows.rows, DECEMBER_MILESTONE_ISO);
  const weeklyTargets = weeklyTargetsFrom(targetRows.rows);

  const affiliate = await fetchAffiliateBooked(supabase, workspaceId);
  const funnelSources = await fetchFunnelActuals(supabase, workspaceId, deals, stages, activityRows);
  const apiState = await fetchApiState(supabase);
  const consumer = await fetchConsumerDistribution(supabase, workspaceId);

  const totals = {} as Record<RevenueScope, ScopeTotals>;
  for (const view of ["company", "personal", "combined"] as RevenueScope[]) {
    const dealsBooked = computeBookedRevenue(deals, stages, view);
    const booked = composeBooked(dealsBooked, affiliate.commission, view);
    const cashCollected = computeCashCollected(payments, view);
    const weighted = computeWeightedPipeline(deals, stages, view);
    const targetToday = interpolateTarget(milestones, now);
    const next = nextMilestone(milestones, now);
    const december = milestones[milestones.length - 1]?.cumulative ?? 0;
    totals[view] = {
      scope: view,
      booked,
      cashCollected,
      outstanding: computeOutstandingInvoiced(deals, payments, stages, view),
      weightedPipeline: weighted,
      forecastAtDeadline: composeBooked(
        computeForecast(deals, stages, view, decemberDeadline),
        affiliate.commission,
        view
      ),
      targetToday,
      paceRatio: paceRatio(booked, targetToday),
      pace: paceStatus(booked, targetToday),
      gapToNextMilestone: computeGap(next?.cumulative ?? 0, booked),
      gapToDecember: computeGap(december, booked),
    };
  }

  const trajectory = buildTrajectory({
    milestones,
    deals,
    stages,
    affiliateCommission: affiliate.commission,
    now,
  });

  const streamMix = buildStreamMix({ deals, stages, targetRows: targetRows.rows, affiliate });

  return {
    now: now.toISOString(),
    planStart: PLAN_START_ISO,
    septemberMilestone: SEPTEMBER_MILESTONE_ISO,
    decemberMilestone: DECEMBER_MILESTONE_ISO,
    planTablesReady,
    targetsAreEditable: targetRows.available,
    stages,
    milestones,
    nextMilestone: nextMilestone(milestones, now),
    totals,
    trajectory,
    funnel: {
      september: buildFunnel(funnelSources.actuals, septemberTargets),
      december: buildFunnel(funnelSources.actuals, decemberTargets),
      weakest: weakestFunnelStage(buildFunnel(funnelSources.actuals, septemberTargets)),
      availability: funnelSources.availability,
    },
    streamMix,
    weeklyActivity: buildWeeklyActivity(activityRows.rows, planStart, now),
    weeklyTargets,
    nextActions: buildNextActions(deals, stages, now),
    deals,
    apiReadiness: buildReadiness(apiState, confirmationRows.rows),
    apiOperating: apiState.operating,
    consumer,
    sources: buildSourceAudit({
      planTablesReady,
      targetsAvailable: targetRows.available,
      affiliate,
      apiState,
      consumer,
    }),
  };
}

/* ------------------------------------------------------------------ *
 * Live affiliate commission (existing Rakuten import)
 * ------------------------------------------------------------------ */

type AffiliateState = {
  commission: number | null;
  availability: DataAvailability;
  isDemo: boolean;
  detail: string;
};

async function fetchAffiliateBooked(supabase: SupabaseClient, workspaceId: string): Promise<AffiliateState> {
  const probe = await safeRows<{ commission_amount: number | string | null; status: string | null }>(
    supabase,
    "hq_affiliate_transactions",
    (q) =>
      q
        .select("commission_amount, status")
        .eq("workspace_id", workspaceId)
        .gte("transaction_date", `${PLAN_START_ISO}T00:00:00Z`)
        .limit(5000)
  );

  if (!probe.available) {
    return {
      commission: null,
      availability: "unavailable",
      isDemo: false,
      detail: "Affiliate transaction table is not reachable.",
    };
  }

  const verified = probe.rows.filter((r) => String(r.status || "").toLowerCase() !== "demo");
  const demoOnly = probe.rows.length > 0 && verified.length === 0;
  if (demoOnly) {
    return {
      commission: null,
      availability: "pending",
      isDemo: true,
      detail: "Only demo affiliate rows exist since the plan start.",
    };
  }

  const commission = verified.reduce((sum, r) => sum + num(r.commission_amount), 0);
  return {
    commission: Math.round(commission * 100) / 100,
    availability: "live",
    isDemo: false,
    detail: `Confirmed commission since ${PLAN_START_ISO} from hq_affiliate_transactions.`,
  };
}

/* ------------------------------------------------------------------ *
 * Funnel actuals
 * ------------------------------------------------------------------ */

async function fetchFunnelActuals(
  supabase: SupabaseClient,
  workspaceId: string,
  deals: DealRow[],
  stages: StageMeta[],
  activities: Probe<{ activity_type: string; completed_at: string }>
): Promise<{ actuals: Record<FunnelStageKey, number>; availability: DataAvailability }> {
  const stageIndex = new Map<string, number>(stages.map((s) => [String(s.key), s.sortOrder]));
  const reached = (minStage: string) => {
    const floor = stageIndex.get(minStage) ?? 0;
    return deals.filter((d) => {
      const order = stageIndex.get(d.stage) ?? 0;
      if (d.stage === "lost") return false;
      return order >= floor;
    }).length;
  };

  const activityCount = (type: ActivityType) =>
    activities.rows.filter((row) => row.activity_type === type).length;

  const [qualifiedContacts, platformLeads] = await Promise.all([
    safeCount(supabase, "hq_contacts", (q) =>
      q.eq("workspace_id", workspaceId).eq("relationship_status", "engaged")
    ),
    safeRows<{ intent: string }>(supabase, "material_snapshot_leads", (q) => q.select("intent").limit(2000)),
  ]);

  const wonDeals = deals.filter((d) => stages.find((s) => s.key === d.stage)?.isWon);
  const snapshotRequests = platformLeads.rows.filter((row) => row.intent === "snapshot").length;
  const pilotRequests = platformLeads.rows.filter((row) => row.intent === "founding_pilot").length;

  const actuals: Record<FunnelStageKey, number> = {
    // A scored account is an engaged contact, a deal past prospect, or a /platform request.
    qualified_account: Math.max(
      qualifiedContacts.value ?? 0,
      reached("qualified"),
      activityCount("qualified_account"),
      snapshotRequests + pilotRequests
    ),
    snapshot_sent: Math.max(reached("snapshot_sent"), activityCount("snapshot_sent"), snapshotRequests),
    meeting: Math.max(reached("meeting"), activityCount("meeting")),
    proposal: Math.max(reached("proposal"), activityCount("proposal")),
    won: wonDeals.filter((d) => d.revenueStream === "api_pilot").length,
    api_integration: wonDeals.filter((d) => d.revenueStream === "api_integration").length,
  };

  const availability: DataAvailability = !activities.available
    ? "unavailable"
    : qualifiedContacts.value == null
      ? "pending"
      : "live";

  return { actuals, availability };
}

/* ------------------------------------------------------------------ *
 * Trajectory
 * ------------------------------------------------------------------ */

function buildTrajectory(input: {
  milestones: Milestone[];
  deals: DealRow[];
  stages: StageMeta[];
  affiliateCommission: number | null;
  now: Date;
}): TrajectoryPoint[] {
  const { milestones, deals, stages, affiliateCommission, now } = input;
  const start = new Date(`${PLAN_START_ISO}T00:00:00Z`);
  const end = new Date(`${DECEMBER_MILESTONE_ISO}T23:59:59Z`);
  const weeks = weekStartsBetween(start, end);
  const nowWeek = startOfWeekUtc(now).getTime();

  return weeks.map((weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);
    const isFuture = weekStart.getTime() > nowWeek;
    const target = interpolateTarget(milestones, weekEnd);
    if (isFuture) {
      return { weekStart: weekStart.toISOString().slice(0, 10), target, actual: null, gap: null, isFuture };
    }
    const asOf = weekEnd.getTime() > now.getTime() ? now : weekEnd;
    const dealsBooked = computeBookedRevenue(deals, stages, "combined", { asOf });
    const actual = composeBooked(dealsBooked, affiliateCommission, "combined");
    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      target,
      actual,
      gap: Math.round((target - actual) * 100) / 100,
      isFuture,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Revenue mix
 * ------------------------------------------------------------------ */

function buildStreamMix(input: {
  deals: DealRow[];
  stages: StageMeta[];
  targetRows: TargetRow[];
  affiliate: AffiliateState;
}): StreamMixRow[] {
  const { deals, stages, targetRows, affiliate } = input;
  return REVENUE_STREAMS.map((stream) => {
    const dbTarget = targetRows.find(
      (r) => r.metric === "booked_revenue_stream" && r.revenue_stream === stream.key
    );
    const fallback = DEFAULT_STREAM_TARGETS.find((t) => t.stream === stream.key);
    const bookedFromDeals = deals
      .filter((d) => d.revenueStream === stream.key)
      .filter((d) => stages.find((s) => s.key === d.stage)?.isWon)
      .reduce((sum, d) => sum + d.amount, 0);
    const booked =
      stream.key === "affiliate" ? bookedFromDeals + (affiliate.commission ?? 0) : bookedFromDeals;

    return {
      stream: stream.key,
      label: stream.label,
      scope: stream.scope,
      booked: Math.round(booked * 100) / 100,
      target: dbTarget ? num(dbTarget.target_value) : fallback?.target ?? 0,
      unitPlan: dbTarget?.notes || fallback?.unitPlan || "",
      availability:
        stream.key === "affiliate" ? affiliate.availability : ("manual" as DataAvailability),
    };
  });
}

/* ------------------------------------------------------------------ *
 * Weekly activity
 * ------------------------------------------------------------------ */

function buildWeeklyActivity(
  rows: Array<{ activity_type: string; completed_at: string }>,
  from: Date,
  now: Date
): WeeklyActivityPoint[] {
  const weeks = weekStartsBetween(from, now);
  return weeks.slice(-8).map((weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const inWeek = rows.filter((row) => {
      const at = Date.parse(row.completed_at);
      return Number.isFinite(at) && at >= weekStart.getTime() && at < weekEnd.getTime();
    });
    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      counts: {
        personalized_outreach: inWeek.filter((r) => r.activity_type === "personalized_outreach").length,
        snapshot_sent: inWeek.filter((r) => r.activity_type === "snapshot_sent").length,
        meeting: inWeek.filter((r) => r.activity_type === "meeting").length,
        proposal: inWeek.filter((r) => r.activity_type === "proposal").length,
      },
    };
  });
}

/* ------------------------------------------------------------------ *
 * Next actions
 * ------------------------------------------------------------------ */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function buildNextActions(deals: DealRow[], stages: StageMeta[], now: Date): NextActionItem[] {
  const items: Array<NextActionItem & { priority: number }> = [];

  for (const deal of deals) {
    const stage = stages.find((s) => s.key === deal.stage);
    if (!stage?.isOpen) continue;

    const due = deal.nextActionAt ? Date.parse(deal.nextActionAt) : null;
    const overdue = due != null && Number.isFinite(due) && due < now.getTime();
    const weighted = deal.amount * stageProbability(stages, deal);

    let reason: string | null = null;
    let priority = 0;

    if (overdue) {
      reason = "Next action is overdue";
      priority = 100;
    } else if (deal.stage === "proposal" && !deal.nextActionAt) {
      reason = "Proposal sent with no follow-up scheduled";
      priority = 90;
    } else if (deal.stage === "meeting" && !deal.nextAction) {
      reason = "Meeting held with no next step";
      priority = 80;
    } else if (deal.stage === "snapshot_sent" && !deal.nextActionAt) {
      reason = "Snapshot request awaiting completion";
      priority = 70;
    } else if (!deal.nextActionAt && weighted >= 1000) {
      reason = "High-value opportunity with no scheduled activity";
      priority = 60;
    }

    if (!reason) continue;

    // Stale check: a scheduled action more than 7 days out on a live deal is not urgent.
    if (due != null && !overdue && due - now.getTime() > SEVEN_DAYS_MS && priority < 90) continue;

    items.push({
      id: deal.id,
      company: deal.companyName,
      opportunity: deal.opportunity || stage.label,
      amount: deal.amount || null,
      stage: deal.stage,
      stageLabel: stage.label,
      dueDate: deal.expectedCloseDate || (deal.nextActionAt ? deal.nextActionAt.slice(0, 10) : null),
      nextAction: deal.nextAction || "Set the next action",
      reason,
      overdue,
      priority,
    });
  }

  return items
    .sort((a, b) => b.priority - a.priority || (b.amount || 0) - (a.amount || 0))
    .slice(0, 5)
    .map(({ priority: _priority, ...item }) => item);
}

/* ------------------------------------------------------------------ *
 * Material Intelligence API state
 * ------------------------------------------------------------------ */

type ApiState = {
  tablesReady: boolean;
  activeTestKeys: number;
  revokedKeys: number;
  leads: number | null;
  usage: Array<{ match_type: string | null; match_status: string | null; evidence_status: string | null; status_code: number }>;
  usageAvailable: boolean;
  operating: CommandCenterBundle["apiOperating"];
};

async function fetchApiState(supabase: SupabaseClient): Promise<ApiState> {
  const [clients, keys, leads, usage, evidence] = await Promise.all([
    safeRows<{ id: string; is_active: boolean }>(supabase, "material_api_clients", (q) =>
      q.select("id, is_active").limit(200)
    ),
    safeRows<{ status: string; environment: string }>(supabase, "material_api_keys", (q) =>
      q.select("status, environment").limit(200)
    ),
    safeCount(supabase, "material_snapshot_leads"),
    safeRows<{ match_type: string | null; match_status: string | null; evidence_status: string | null; status_code: number }>(
      supabase,
      "material_api_usage",
      (q) =>
        q
          .select("match_type, match_status, evidence_status, status_code")
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(5000)
    ),
    safeRows<{ status: string }>(supabase, "material_evidence", (q) => q.select("status").limit(2000)),
  ]);

  const tablesReady = clients.available && keys.available && usage.available;
  const requests = usage.rows.length;
  const rate = (n: number) => (requests > 0 ? Math.round((n / requests) * 1000) / 1000 : null);

  const evidenceCounts = new Map<string, number>();
  for (const row of evidence.rows) {
    evidenceCounts.set(row.status, (evidenceCounts.get(row.status) || 0) + 1);
  }

  return {
    tablesReady,
    activeTestKeys: keys.rows.filter((k) => k.environment === "test" && k.status === "active").length,
    revokedKeys: keys.rows.filter((k) => k.status === "revoked").length,
    leads: leads.value,
    usage: usage.rows,
    usageAvailable: usage.available,
    operating: {
      availability: !tablesReady ? "unavailable" : requests === 0 ? "pending" : "live",
      activeClients: clients.available ? clients.rows.filter((c) => c.is_active).length : null,
      requests30d: usage.available ? requests : null,
      exactMatchRate: rate(usage.rows.filter((u) => u.match_type === "exact_gtin").length),
      manufacturerOnlyRate: rate(usage.rows.filter((u) => u.match_type === "manufacturer_only").length),
      notFoundRate: rate(usage.rows.filter((u) => u.match_status === "not_found" || u.match_type === "not_found").length),
      errorRate: rate(usage.rows.filter((u) => Number(u.status_code) >= 400).length),
      rateLimitEvents: usage.available ? usage.rows.filter((u) => Number(u.status_code) === 429).length : null,
      evidenceDistribution: [...evidenceCounts.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
    },
  };
}

function buildReadiness(
  api: ApiState,
  confirmations: Array<{ check_key: string; confirmed: boolean }>
): CommandCenterBundle["apiReadiness"] {
  const confirmed = (key: string) => confirmations.some((c) => c.check_key === key && c.confirmed);

  const checks: ReadinessCheck[] = [
    {
      key: "migration_applied",
      label: "Production migration applied",
      passed: api.tablesReady,
      availability: "live",
      detail: api.tablesReady
        ? "material_api_* tables are reachable in production."
        : "Run 20260819_material_intelligence_api.sql.",
    },
    ...READINESS_CONFIRMABLE.map((item) => ({
      key: item.key,
      label: item.label,
      passed: confirmed(item.key),
      availability: "manual" as DataAvailability,
      detail: confirmed(item.key) ? "Founder confirmed." : "Awaiting founder confirmation.",
    })),
    {
      key: "test_key_issued",
      label: "Test API key issued",
      passed: api.activeTestKeys > 0,
      availability: api.tablesReady ? "live" : "unavailable",
      detail: api.tablesReady
        ? `${api.activeTestKeys} active itx_test_ key(s).`
        : "Requires the migration.",
    },
    {
      key: "smoke_tests_passed",
      label: "Known, reported and not-found smoke tests passed",
      passed:
        api.usage.some((u) => u.match_type === "exact_gtin") &&
        api.usage.some((u) => String(u.evidence_status || "").startsWith("reported_")) &&
        api.usage.some((u) => u.match_status === "not_found" || u.match_type === "not_found"),
      availability: api.usageAvailable ? "live" : "unavailable",
      detail: api.usageAvailable
        ? "Derived from material_api_usage in the last 30 days."
        : "Requires the migration.",
    },
    {
      key: "revocation_rate_limit",
      label: "Revocation and rate-limit tests passed",
      passed: api.revokedKeys > 0 && api.usage.some((u) => Number(u.status_code) === 429),
      availability: api.usageAvailable ? "live" : "unavailable",
      detail: api.usageAvailable
        ? "A revoked key and a 429 response must both exist."
        : "Requires the migration.",
    },
    {
      key: "snapshot_form_verified",
      label: "Snapshot form verified",
      passed: (api.leads ?? 0) > 0,
      availability: api.leads == null ? "unavailable" : "live",
      detail: api.leads == null ? "Requires the migration." : `${api.leads} snapshot lead(s) stored.`,
    },
  ];

  const passed = checks.filter((c) => c.passed).length;
  return { checks, passed, total: checks.length, commerciallyReady: passed === checks.length };
}

/* ------------------------------------------------------------------ *
 * Consumer distribution
 * ------------------------------------------------------------------ */

async function fetchConsumerDistribution(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<ChannelMetric[]> {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [appStore, chrome, scans, saves, clickouts, extensionSaves, affiliateOrders] = await Promise.all([
    fetchAppStoreDiscoveryMetrics(workspaceId).catch(() => null),
    fetchChromeWebStoreDiscoveryMetrics(workspaceId).catch(() => null),
    safeCount(supabase, "scan_history", (q) => q.gte("scanned_at", since30)),
    safeCount(supabase, "product_favorites", (q) => q.gte("created_at", since30)),
    safeCount(supabase, "user_product_clickouts", (q) => q.gte("clicked_at", since30)),
    safeCount(supabase, "external_captures", (q) =>
      q.eq("source_app", "chrome_extension").gte("created_at", since30)
    ),
    safeRows<{ commission_amount: number | string | null; status: string | null }>(
      supabase,
      "hq_affiliate_transactions",
      (q) => q.select("commission_amount, status").eq("workspace_id", workspaceId).gte("transaction_date", since30).limit(3000)
    ),
  ]);

  const verifiedOrders = affiliateOrders.rows.filter((r) => String(r.status || "").toLowerCase() !== "demo");
  const commission = verifiedOrders.reduce((sum, r) => sum + num(r.commission_amount), 0);

  const metric = (
    id: string,
    label: string,
    probe: { value: number | null; available: boolean },
    note: string,
    action?: string
  ): ChannelMetric => ({
    id,
    label,
    value: probe.available ? probe.value : null,
    window: "30 days",
    availability: probe.available ? "live" : "unavailable",
    note: probe.available ? note : "Not connected",
    action: probe.available ? undefined : action,
  });

  return [
    {
      id: "ios_installs",
      label: "iOS installs",
      value: appStore?.connected && appStore.downloadsReady ? appStore.appUnits30d ?? null : null,
      window: "30 days",
      availability: appStore?.connected ? (appStore.downloadsReady ? "live" : "pending") : "unavailable",
      note: appStore?.connected
        ? appStore.downloadsReady
          ? "App Store Connect sales report"
          : "Connected, download report not ready"
        : "Not connected",
      action: appStore?.connected ? undefined : "Connect App Store Connect in Settings",
    },
    {
      id: "chrome_installs",
      label: "Chrome extension installs",
      value: chrome?.connected && chrome.installsReady ? chrome.weeklyInstalls ?? null : null,
      window: "30 days",
      availability: chrome?.connected ? (chrome.installsReady ? "live" : "pending") : "unavailable",
      note: chrome?.connected
        ? chrome.installsReady
          ? "Publisher weekly installs from the Chrome Web Store dashboard"
          : "Connected — paste weekly installs from the Chrome Web Store dashboard"
        : "Not connected",
      // Website clicks are not installs. This stays unavailable until a publisher count is entered.
      action: chrome?.connected ? undefined : "Connect Chrome Web Store in Settings",
    },
    metric("scans", "Product scans or captures", scans, "scan_history", "Verify scan logging"),
    metric("saves", "Saves to Inspirations", saves, "product_favorites", "Verify favorites logging"),
    metric("clickouts", "Retailer clickouts", clickouts, "user_product_clickouts", "Verify clickout logging"),
    metric(
      "extension_saves",
      "Extension saves",
      extensionSaves,
      "external_captures source_app = chrome_extension",
      "Verify extension capture logging"
    ),
    {
      id: "affiliate_orders",
      label: "Affiliate orders",
      value: affiliateOrders.available ? verifiedOrders.length : null,
      window: "30 days",
      availability: affiliateOrders.available ? "live" : "unavailable",
      note: affiliateOrders.available ? "Confirmed Rakuten transactions" : "Not connected",
      action: affiliateOrders.available ? undefined : "Import Rakuten revenue in Commerce",
    },
    {
      id: "affiliate_commission",
      label: "Confirmed affiliate commissions",
      value: affiliateOrders.available ? Math.round(commission * 100) / 100 : null,
      window: "30 days",
      availability: affiliateOrders.available ? "live" : "unavailable",
      note: affiliateOrders.available ? "Excludes demo rows" : "Not connected",
      action: affiliateOrders.available ? undefined : "Import Rakuten revenue in Commerce",
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Source audit
 * ------------------------------------------------------------------ */

function buildSourceAudit(input: {
  planTablesReady: boolean;
  targetsAvailable: boolean;
  affiliate: AffiliateState;
  apiState: ApiState;
  consumer: ChannelMetric[];
}): SourceAudit[] {
  const { planTablesReady, targetsAvailable, affiliate, apiState, consumer } = input;
  const audit: SourceAudit[] = [
    {
      id: "deals",
      label: "Deals, payments and activities",
      availability: planTablesReady ? "live" : "unavailable",
      detail: planTablesReady
        ? "Brand Gmail and /platform founding-pilot or snapshot requests open $5,000 Pilot opportunities automatically. Booked revenue still requires a won deal; cash still requires a cleared payment."
        : "hq_deals / hq_deal_payments / hq_revenue_activities are not in the database yet.",
      action: planTablesReady ? undefined : "Apply 20260820_hq_revenue_command_center.sql",
    },
    {
      id: "targets",
      label: "Editable targets",
      availability: targetsAvailable ? "manual" : "unavailable",
      detail: targetsAvailable
        ? "hq_revenue_targets rows override the built-in plan without a deploy."
        : "Showing the built-in September and December plan. Edits require the migration.",
      action: targetsAvailable ? undefined : "Apply 20260820_hq_revenue_command_center.sql",
    },
    {
      id: "affiliate",
      label: "Affiliate commissions",
      availability: affiliate.availability,
      detail: affiliate.detail,
      action: affiliate.availability === "live" ? undefined : "Import Rakuten revenue in Commerce",
    },
    {
      id: "material_api",
      label: "Material Intelligence API",
      availability: apiState.tablesReady ? "live" : "unavailable",
      detail: apiState.tablesReady
        ? "Clients, keys and usage read from material_api_*."
        : "material_api_* tables are not in the database yet.",
      action: apiState.tablesReady ? undefined : "Apply 20260819_material_intelligence_api.sql",
    },
    ...consumer
      .filter((c) => c.availability !== "live")
      .map((c) => ({
        id: `channel_${c.id}`,
        label: c.label,
        availability: c.availability,
        detail: c.note,
        action: c.action,
      })),
  ];
  return audit;
}

/* ------------------------------------------------------------------ *
 * Fallback bundle when Supabase is unreachable
 * ------------------------------------------------------------------ */

function emptyBundle(now: Date, availability: DataAvailability): CommandCenterBundle {
  const totals = {} as Record<RevenueScope, ScopeTotals>;
  for (const view of ["company", "personal", "combined"] as RevenueScope[]) {
    totals[view] = {
      scope: view,
      booked: 0,
      cashCollected: 0,
      outstanding: 0,
      weightedPipeline: 0,
      forecastAtDeadline: 0,
      targetToday: interpolateTarget(DEFAULT_MILESTONES, now),
      paceRatio: null,
      pace: "no_data",
      gapToNextMilestone: 0,
      gapToDecember: 0,
    };
  }
  return {
    now: now.toISOString(),
    planStart: PLAN_START_ISO,
    septemberMilestone: SEPTEMBER_MILESTONE_ISO,
    decemberMilestone: DECEMBER_MILESTONE_ISO,
    planTablesReady: false,
    targetsAreEditable: false,
    stages: DEFAULT_STAGES,
    milestones: DEFAULT_MILESTONES,
    nextMilestone: nextMilestone(DEFAULT_MILESTONES, now),
    totals,
    trajectory: [],
    funnel: {
      september: buildFunnel(
        {
          qualified_account: 0,
          snapshot_sent: 0,
          meeting: 0,
          proposal: 0,
          won: 0,
          api_integration: 0,
        },
        Object.fromEntries(
          FUNNEL_STAGES.map((s) => [s.key, DEFAULT_FUNNEL_TARGETS[s.key].september])
        ) as Record<FunnelStageKey, number>
      ),
      december: buildFunnel(
        {
          qualified_account: 0,
          snapshot_sent: 0,
          meeting: 0,
          proposal: 0,
          won: 0,
          api_integration: 0,
        },
        Object.fromEntries(
          FUNNEL_STAGES.map((s) => [s.key, DEFAULT_FUNNEL_TARGETS[s.key].december])
        ) as Record<FunnelStageKey, number>
      ),
      weakest: null,
      availability,
    },
    streamMix: REVENUE_STREAMS.map((stream) => ({
      stream: stream.key,
      label: stream.label,
      scope: stream.scope,
      booked: 0,
      target: DEFAULT_STREAM_TARGETS.find((t) => t.stream === stream.key)?.target ?? 0,
      unitPlan: DEFAULT_STREAM_TARGETS.find((t) => t.stream === stream.key)?.unitPlan ?? "",
      availability,
    })),
    weeklyActivity: [],
    weeklyTargets: DEFAULT_WEEKLY_ACTIVITY_TARGETS,
    nextActions: [],
    deals: [],
    apiReadiness: { checks: [], passed: 0, total: 0, commerciallyReady: false },
    apiOperating: {
      availability,
      activeClients: null,
      requests30d: null,
      exactMatchRate: null,
      manufacturerOnlyRate: null,
      notFoundRate: null,
      errorRate: null,
      rateLimitEvents: null,
      evidenceDistribution: [],
    },
    consumer: [],
    sources: [
      {
        id: "supabase",
        label: "Supabase",
        availability: "unavailable",
        detail: "Service client is not configured for this deployment.",
        action: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      },
    ],
  };
}

/**
 * Compact plan summary for the existing "This week" page.
 * Reuses the same math so the two pages can never disagree.
 */
export type PlanPulse = {
  available: boolean;
  scope: RevenueScope;
  booked: number;
  targetToday: number;
  nextMilestoneName: string | null;
  nextMilestoneDate: string | null;
  nextMilestoneTarget: number;
  gap: number;
  pace: ReturnType<typeof paceStatus>;
  weakestStage: string | null;
  openActions: number;
  setupAction: string | null;
};

/**
 * Deliberately narrower than fetchRevenueCommandCenter: the "This week" page
 * needs the headline only, so it skips API readiness and consumer distribution.
 * The math comes from the same pure helpers, so the two pages cannot disagree.
 */
export async function fetchPlanPulse(workspaceId: string, opts?: { now?: Date }): Promise<PlanPulse> {
  const now = opts?.now || new Date();
  const supabase = getServerSupabase();
  const milestonesFallback = DEFAULT_MILESTONES;

  const unavailable = (): PlanPulse => {
    const next = nextMilestone(milestonesFallback, now);
    return {
      available: false,
      scope: "combined",
      booked: 0,
      targetToday: interpolateTarget(milestonesFallback, now),
      nextMilestoneName: next?.name ?? null,
      nextMilestoneDate: next?.targetDate ?? null,
      nextMilestoneTarget: next?.cumulative ?? 0,
      gap: computeGap(next?.cumulative ?? 0, 0),
      pace: "no_data",
      weakestStage: null,
      openActions: 0,
      setupAction: "Apply 20260820_hq_revenue_command_center.sql to record deals and payments",
    };
  };

  if (!supabase) return unavailable();

  const [stageRows, targetRows, dealRows, affiliate] = await Promise.all([
    safeRows<{ key: string; label: string; probability: number | string; sort_order: number; is_open: boolean; is_won: boolean }>(
      supabase,
      "hq_deal_stages",
      (q) => q.select("key, label, probability, sort_order, is_open, is_won").order("sort_order")
    ),
    safeRows<TargetRow>(supabase, "hq_revenue_targets", (q) =>
      q
        .select("metric, scope, target_value, target_date, revenue_stream, unit_target, name, notes")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .limit(400)
    ),
    safeRows<Record<string, unknown>>(supabase, "hq_deals", (q) =>
      q
        .select(
          "id, company_name, opportunity, revenue_stream, scope, amount, stage, probability_override, expected_close_date, booked_at, next_action, next_action_at, entry_mode"
        )
        .eq("workspace_id", workspaceId)
        .limit(500)
    ),
    fetchAffiliateBooked(supabase, workspaceId),
  ]);

  if (!dealRows.available) return unavailable();

  const stages: StageMeta[] = stageRows.rows.length
    ? stageRows.rows.map((r) => ({
        key: r.key as StageMeta["key"],
        label: r.label,
        probability: num(r.probability),
        sortOrder: r.sort_order,
        isOpen: Boolean(r.is_open),
        isWon: Boolean(r.is_won),
      }))
    : DEFAULT_STAGES;

  const deals: DealRow[] = dealRows.rows.map((row) => ({
    id: String(row.id),
    companyName: String(row.company_name || "—"),
    opportunity: (row.opportunity as string) || null,
    revenueStream: String(row.revenue_stream || "api_pilot"),
    scope: (row.scope === "personal" ? "personal" : "company") as EntryScope,
    amount: num(row.amount),
    stage: String(row.stage || "prospect"),
    probabilityOverride: row.probability_override == null ? null : num(row.probability_override),
    expectedCloseDate: (row.expected_close_date as string) || null,
    bookedAt: (row.booked_at as string) || null,
    nextAction: (row.next_action as string) || null,
    nextActionAt: (row.next_action_at as string) || null,
    entryMode: String(row.entry_mode || "manual"),
  }));

  const milestones = milestonesFromTargets(targetRows.rows);
  const booked = composeBooked(computeBookedRevenue(deals, stages, "combined"), affiliate.commission, "combined");
  const targetToday = interpolateTarget(milestones, now);
  const next = nextMilestone(milestones, now);

  const wonStreams = new Set(
    deals.filter((d) => stages.find((s) => s.key === d.stage)?.isWon).map((d) => d.revenueStream)
  );
  const stageIndex = new Map<string, number>(stages.map((s) => [String(s.key), s.sortOrder]));
  const reached = (minStage: string) => {
    const floor = stageIndex.get(minStage) ?? 0;
    return deals.filter((d) => d.stage !== "lost" && (stageIndex.get(d.stage) ?? 0) >= floor).length;
  };
  const septemberTargets = funnelTargetsFor(targetRows.rows, SEPTEMBER_MILESTONE_ISO);
  const weakest = weakestFunnelStage(
    buildFunnel(
      {
        qualified_account: reached("qualified"),
        snapshot_sent: reached("snapshot_sent"),
        meeting: reached("meeting"),
        proposal: reached("proposal"),
        won: deals.filter(
          (d) => stages.find((s) => s.key === d.stage)?.isWon && d.revenueStream !== "api_integration"
        ).length,
        api_integration: wonStreams.has("api_integration") ? 1 : 0,
      },
      septemberTargets
    )
  );

  return {
    available: true,
    scope: "combined",
    booked,
    targetToday,
    nextMilestoneName: next?.name ?? null,
    nextMilestoneDate: next?.targetDate ?? null,
    nextMilestoneTarget: next?.cumulative ?? 0,
    gap: computeGap(next?.cumulative ?? 0, booked),
    pace: paceStatus(booked, targetToday),
    weakestStage: weakest?.label ?? null,
    openActions: buildNextActions(deals, stages, now).length,
    setupAction: null,
  };
}
