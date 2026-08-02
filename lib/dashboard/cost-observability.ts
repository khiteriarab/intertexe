import { getServerSupabase } from "../supabase-service-client";

export type CostJobStat = {
  job: string;
  maxDurationMs: number;
  avgDurationMs: number;
  runs: number;
  failures: number;
  lastAt: string | null;
};

export type CostSnapshot = {
  at: string | null;
  billingApiAvailable: boolean;
  billingApiNote: string;
  killSwitches: {
    backgroundJobsEnabled: boolean;
    expensiveJobsEnabled: boolean;
    warmCronEnabled: boolean;
    warmCronScheduled: boolean;
  };
  budgetUsd: number;
  proxy: {
    observedGbHours: number;
    observedSpendUsd: number;
    projectedMonthEndUsd: number;
    memoryRateUsd: number;
    assumption: string;
  };
  longestJobs: CostJobStat[];
  activeLocks: Array<{
    key: string;
    jobName: string;
    startedAt: string | null;
    ageMs: number | null;
    stale: boolean;
  }>;
  alerts: {
    projectedOver30: boolean;
    projectedOver50: boolean;
    projectedOverBudget: boolean;
    staleLocks: boolean;
    warmStillEnabled: boolean;
  };
};

const EMPTY: CostSnapshot = {
  at: null,
  billingApiAvailable: false,
  billingApiNote:
    "No cost snapshot yet. Cron /api/cron/cost-observability writes vercel_cost_snapshot every 6 hours.",
  killSwitches: {
    backgroundJobsEnabled: true,
    expensiveJobsEnabled: true,
    warmCronEnabled: false,
    warmCronScheduled: false,
  },
  budgetUsd: Number(process.env.VERCEL_MONTHLY_BUDGET_USD || 30),
  proxy: {
    observedGbHours: 0,
    observedSpendUsd: 0,
    projectedMonthEndUsd: 0,
    memoryRateUsd: 0.0106,
    assumption: "1 GB instance · observed job durations only",
  },
  longestJobs: [],
  activeLocks: [],
  alerts: {
    projectedOver30: false,
    projectedOver50: false,
    projectedOverBudget: false,
    staleLocks: false,
    warmStillEnabled: false,
  },
};

export async function fetchCostSnapshot(): Promise<CostSnapshot> {
  const supabase = getServerSupabase();
  if (!supabase) return EMPTY;
  const { data } = await supabase
    .from("system_status")
    .select("value_json, updated_at")
    .eq("key", "vercel_cost_snapshot")
    .maybeSingle();
  if (!data?.value_json) return EMPTY;
  return {
    ...EMPTY,
    ...(data.value_json as CostSnapshot),
    at: (data.value_json as CostSnapshot).at || data.updated_at || null,
  };
}
