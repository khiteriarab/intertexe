/**
 * INTERTEXE company HQ data bundle — aggregates live metrics for the operating dashboard.
 * Company scope only. No personal @khiteri revenue.
 */
import { fetchFounderToday, fetchRevenueSnapshot, fetchSourceComparison } from "./command-center";
import { fetchHqCommercePage, fetchHqOverviewMetrics } from "./metrics";
import { fetchRevenueCommandCenter } from "./revenue-command-center";
import { fetchUserGrowthEngineBundle } from "./user-growth-engine";
import {
  COMPANY_HORIZON_PLANS,
  COMPANY_MILESTONES,
  computeKpiSnapshot,
  computeRevenueStreams,
  buildWeeklyReview,
  forecastHitDate,
  type CompanyHorizonPlan,
  type KpiSnapshot,
  type PlanHorizon,
  type RevenueStreamProgress,
  type WeeklyReviewRow,
} from "./company-plan";

export type AcquisitionFunnelStage = {
  key: string;
  label: string;
  volume: number | null;
  conversionPct: number | null;
  wowChange: number | null;
};

export type AcquisitionSourceRow = {
  source: string;
  accounts: number;
  activated: number;
  clicks: number;
  commission: number;
};

export type CompanyHqBundle = {
  horizon: PlanHorizon;
  plan: CompanyHorizonPlan;
  fetchedAt: string;
  northStar: {
    revenue: KpiSnapshot;
    members: KpiSnapshot;
    b2bClients: KpiSnapshot;
    press: KpiSnapshot;
    speaking: KpiSnapshot;
  };
  revenue: {
    totalYtd: number;
    totalMtd: number;
    streams: RevenueStreamProgress[];
    requiredPerMonth: number;
    growthRatePct: number | null;
    affiliateOrders: number;
    affiliateAov: number | null;
    affiliateCommissionAvg: number | null;
  };
  members: {
    total: number;
    d7: number;
    d30: number;
    activated: number;
    activationRate: number | null;
    forecastHitDate: string | null;
    requiredPerDay: number;
  };
  acquisition: {
    funnel: AcquisitionFunnelStage[];
    sources: AcquisitionSourceRow[];
    bestSource: string | null;
    worstSource: string | null;
  };
  b2b: {
    activeClients: number;
    pipelineValue: number;
    weightedPipeline: number;
    mrr: number;
    arr: number;
    prospects: number;
    proposals: number;
    pilotsActive: number;
    pilotsCompleted: number;
  };
  product: {
    catalogProducts: number | null;
    brands: number | null;
    scans7d: number | null;
    clickouts7d: number | null;
    dppReady: number | null;
    topMaterials: Array<{ material: string; scans: number }>;
  };
  press: { total: number; contacts: number };
  speaking: { total: number; contacts: number };
  weeklyReview: WeeklyReviewRow[];
  milestones: typeof COMPANY_MILESTONES;
};

export async function fetchCompanyHqBundle(
  workspaceId: string,
  horizon: PlanHorizon = "year1"
): Promise<CompanyHqBundle> {
  const fetchedAt = new Date().toISOString();
  const plan = COMPANY_HORIZON_PLANS[horizon];

  const [founder, growth, commerce, overview, sources, commandCenter] = await Promise.all([
    fetchFounderToday(workspaceId),
    fetchUserGrowthEngineBundle(workspaceId),
    fetchHqCommercePage(workspaceId),
    fetchHqOverviewMetrics(),
    fetchSourceComparison(),
    fetchRevenueCommandCenter(workspaceId).catch(() => null),
  ]);

  const revenueSnap = await fetchRevenueSnapshot(workspaceId).catch(() => null);

  // Company revenue streams (no personal creator)
  const companyTotals = commandCenter?.totals.company;
  const affiliateYtd = commerce.revenueGoal.commissionYtd ?? commerce.revenueGoal.progressUsd ?? 0;
  const saasBooked = companyTotals?.booked ?? 0;
  const pilotsBooked =
    commandCenter?.streamMix.find((s) => s.stream === "api_pilot")?.booked ?? 0;
  const otherB2b =
    (commandCenter?.streamMix.find((s) => s.stream === "api_integration")?.booked ?? 0) +
    (commandCenter?.streamMix.find((s) => s.stream === "intertexe_partnership")?.booked ?? 0);

  const totalYtd = saasBooked + affiliateYtd + pilotsBooked + otherB2b;
  const streams = computeRevenueStreams({
    saas: saasBooked,
    affiliate: affiliateYtd,
    pilots: pilotsBooked,
    otherB2b,
  });

  const monthsLeft = growth.scoreboard.monthsRemaining;
  const revenueGap = Math.max(0, plan.revenueMin - totalYtd);
  const requiredRevenuePerMonth = monthsLeft > 0 ? Math.ceil(revenueGap / monthsLeft) : revenueGap;

  const pressContacts = founder.bd.opportunities.press + founder.bd.introQueue.press;
  const speakingContacts = 0; // tracked manually until hq_speaking table exists

  const b2bWon =
    commandCenter?.deals.filter((d) => d.stage === "won" && d.scope === "company").length ?? 0;
  const b2bWeighted = companyTotals?.weightedPipeline ?? 0;
  const latestWeekActivity = commandCenter?.weeklyActivity.at(-1)?.counts;

  const northStar = {
    revenue: computeKpiSnapshot({
      key: "revenue",
      label: "Total Revenue",
      current: totalYtd,
      target: plan.revenueMin,
      stretch: plan.revenueStretch,
      deadlineIso: plan.deadlineIso,
      asOfIso: fetchedAt,
    }),
    members: computeKpiSnapshot({
      key: "members",
      label: "Members / Users",
      current: growth.accounts.total,
      target: plan.members,
      deadlineIso: plan.deadlineIso,
      asOfIso: fetchedAt,
      weeklyActual: growth.accounts.d7,
    }),
    b2bClients: computeKpiSnapshot({
      key: "b2b",
      label: "B2B / SaaS Brand Clients",
      current: b2bWon,
      target: plan.b2bClients,
      deadlineIso: plan.deadlineIso,
      asOfIso: fetchedAt,
    }),
    press: computeKpiSnapshot({
      key: "press",
      label: "Press Features",
      current: 0,
      target: plan.pressFeatures,
      deadlineIso: plan.deadlineIso,
      asOfIso: fetchedAt,
    }),
    speaking: computeKpiSnapshot({
      key: "speaking",
      label: "Speaking Engagements",
      current: speakingContacts,
      target: plan.speakingEngagements,
      deadlineIso: plan.deadlineIso,
      asOfIso: fetchedAt,
    }),
  };

  const funnel: AcquisitionFunnelStage[] = [
    { key: "impressions", label: "Awareness / Impressions", volume: null, conversionPct: null, wowChange: null },
    { key: "visitors", label: "Website Visitors", volume: null, conversionPct: null, wowChange: null },
    { key: "platform", label: "Platform Visitors", volume: null, conversionPct: null, wowChange: null },
    {
      key: "signups",
      label: "Sign-ups",
      volume: founder.accounts.total,
      conversionPct: null,
      wowChange: founder.accounts.d7,
    },
    {
      key: "activated",
      label: "Activated Users",
      volume: founder.activated.total,
      conversionPct:
        founder.accounts.total > 0
          ? Math.round((founder.activated.total / founder.accounts.total) * 1000) / 10
          : null,
      wowChange: founder.activated.d7,
    },
    {
      key: "active",
      label: "Active Members",
      volume: founder.activated.total,
      conversionPct: null,
      wowChange: founder.activated.d7,
    },
    {
      key: "clicks",
      label: "Affiliate Clicks",
      volume: founder.clicks.d30,
      conversionPct: null,
      wowChange: founder.clicks.d7,
    },
    {
      key: "purchases",
      label: "Purchases",
      volume: commerce.performanceFunnel.stages.find((s) => s.id === "confirmed_sales")?.value ?? null,
      conversionPct: commerce.performanceFunnel.conversionRate ?? null,
      wowChange: null,
    },
  ];

  const sourceRows: AcquisitionSourceRow[] = sources.map((row) => ({
    source: row.label,
    accounts: row.accounts,
    activated: row.activated,
    clicks: row.clicks,
    commission: row.revenue ?? 0,
  }));

  const sortedByAccounts = [...sourceRows].sort((a, b) => b.accounts - a.accounts);
  const bestSource = sortedByAccounts[0]?.source || null;
  const worstSource = sortedByAccounts.filter((r) => r.accounts > 0).at(-1)?.source || null;

  const weeklyReview = buildWeeklyReview({
    membersWeek: growth.accounts.d7,
    membersWeekTarget: growth.scoreboard.perWeek,
    revenueWeek: revenueSnap?.commission7d ?? 0,
    revenueWeekTarget: Math.ceil(requiredRevenuePerMonth / 4),
    affiliateOrders: commerce.transactions7d ?? 0,
    affiliateRevenue: commerce.commission7d ?? commerce.revenueGoal.commission30d,
    b2bLeads: founder.bd.weekContacted,
    meetings: latestWeekActivity?.meeting ?? 0,
    proposals: latestWeekActivity?.proposal ?? 0,
    newClients: b2bWon,
    pressWins: 0,
    speakingOps: speakingContacts,
  });

  return {
    horizon,
    plan,
    fetchedAt,
    northStar,
    revenue: {
      totalYtd,
      totalMtd: commerce.revenueGoal.commission30d,
      streams,
      requiredPerMonth: requiredRevenuePerMonth,
      growthRatePct: null,
      affiliateOrders: commerce.transactions7d ?? 0,
      affiliateAov:
        commerce.transactions7d && commerce.sales7d
          ? commerce.sales7d / commerce.transactions7d
          : null,
      affiliateCommissionAvg:
        commerce.transactions7d && commerce.commission7d
          ? commerce.commission7d / commerce.transactions7d
          : null,
    },
    members: {
      total: growth.accounts.total,
      d7: growth.accounts.d7,
      d30: growth.accounts.d30,
      activated: growth.activated.total,
      activationRate: growth.activationRate,
      forecastHitDate: forecastHitDate(
        growth.accounts.total,
        plan.members,
        growth.accounts.d7,
        fetchedAt
      ),
      requiredPerDay: growth.scoreboard.perDay,
    },
    acquisition: { funnel, sources: sourceRows, bestSource, worstSource },
    b2b: {
      activeClients: b2bWon,
      pipelineValue: b2bWeighted,
      weightedPipeline: b2bWeighted,
      mrr: 0,
      arr: saasBooked,
      prospects: founder.bd.canonicalFunnel.engaged,
      proposals: commandCenter?.deals.filter((d) => d.stage === "proposal").length ?? 0,
      pilotsActive:
        commandCenter?.deals.filter(
          (d) => d.revenueStream === "api_pilot" && d.stage !== "won" && d.stage !== "lost"
        ).length ?? 0,
      pilotsCompleted: pilotsBooked > 0 ? 1 : 0,
    },
    product: {
      catalogProducts: overview.catalogProducts.value,
      brands: overview.topBrandsLast30d.length,
      scans7d: overview.scansLast7d.value,
      clickouts7d: overview.clickoutsLast7d.value,
      dppReady: overview.dppReady.value,
      topMaterials: overview.topMaterialsLast30d,
    },
    press: { total: 0, contacts: pressContacts },
    speaking: { total: speakingContacts, contacts: speakingContacts },
    weeklyReview,
    milestones: COMPANY_MILESTONES,
  };
}
