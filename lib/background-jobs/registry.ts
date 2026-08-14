/**
 * INTERTEXE Background Job Registry — single source of truth.
 *
 * Engineering standard (permanent):
 * - Every cron / scheduled job MUST be declared here before it can appear in vercel.json.
 * - Cost-review fields are required by TypeScript — omitting them fails `tsc` / CI.
 * - Warming expensive endpoints is forbidden (see warm-policy.ts).
 * - WARM_CRON_ENABLED defaults to 0; production requires explicit manual opt-in.
 *
 * Do not add a schedule to vercel.json without updating this registry in the same PR.
 */

export type JobOwner = "platform" | "catalog" | "commerce" | "growth" | "founder-hq";

export type BackgroundJobDefinition = {
  /** Stable id — matches job_lock / observability keys where possible */
  id: string;
  /** Exact Vercel cron path (no query string) */
  path: string;
  purpose: string;
  owner: JobOwner;
  /** Cron expression, or null when intentionally unscheduled */
  schedule: string | null;
  /** Human estimate of typical wall-clock runtime */
  estimatedRuntime: string;
  /** Typical seconds used for cost math */
  estimatedRuntimeSeconds: number;
  /** Expected executions per UTC day (sum all schedules for this path) */
  expectedDailyExecutions: number;
  /** Expected executions per 30-day month */
  expectedMonthlyInvocations: number;
  /** Why this job exists and why the frequency is justified */
  justification: string;
  /** Safe to run against production catalog / storefront */
  productionSafe: boolean;
  /** When false, job must not be in vercel.json */
  scheduledInProduction: boolean;
  /** Max Fluid maxDuration allowance (seconds) */
  maxDurationSeconds: number;
  /** If true, requires EXPENSIVE_BACKGROUND_JOBS_ENABLED=1 */
  expensive: boolean;
  /** Optional env kill switch name (defaults apply when omitted) */
  enableEnv?: string;
};

/**
 * Hard ceiling — any registry entry above this monthly invocation estimate
 * requires founder review and must not ship without updating APPROVED_CRON_BASELINE.
 */
export const MAX_MONTHLY_INVOCATIONS_WITHOUT_FOUNDER_REVIEW = 2_000;

/**
 * Approved production schedule fingerprint.
 * Intentionally bumping this (with registry + vercel.json in the same PR) is the
 * only way to add/change production crons. CI fails if vercel.json diverges.
 */
export const APPROVED_CRON_BASELINE = {
  version: 3,
  updatedAt: "2026-08-14",
  note:
    "Paused catalog-snapshot. Expensive jobs default OFF. Hourly Gmail outreach header sync added (skips if disconnected).",
} as const;

export const BACKGROUND_JOBS: BackgroundJobDefinition[] = [
  {
    id: "daily-catalog-refresh",
    path: "/api/cron/daily-catalog-refresh",
    purpose: "Classify pending products and refresh homepage/stats caches",
    owner: "catalog",
    schedule: "0 3 * * *",
    estimatedRuntime: "30–90s (hard-capped)",
    estimatedRuntimeSeconds: 90,
    expectedDailyExecutions: 1,
    expectedMonthlyInvocations: 30,
    justification:
      "Once-daily classify/stats is enough; feed ingest stays off Vercel. Runtime capped to prevent Fluid memory overruns.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 120,
    expensive: true,
  },
  {
    id: "price-drops",
    path: "/api/notifications/price-drops",
    purpose: "Send price-drop notification emails",
    owner: "growth",
    schedule: "0 9 * * *",
    estimatedRuntime: "15–45s",
    estimatedRuntimeSeconds: 45,
    expectedDailyExecutions: 1,
    expectedMonthlyInvocations: 30,
    justification: "Daily digest cadence for subscriber value without polling.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 60,
    expensive: false,
  },
  {
    id: "price-check",
    path: "/api/cron/price-check",
    purpose: "Legacy price timestamp refresh only — email sending retired",
    owner: "commerce",
    schedule: null,
    estimatedRuntime: "20–60s",
    estimatedRuntimeSeconds: 60,
    expectedDailyExecutions: 0,
    expectedMonthlyInvocations: 0,
    justification:
      "Email sending moved to /api/notifications/price-drops; this route is unscheduled and does not email.",
    productionSafe: true,
    scheduledInProduction: false,
    maxDurationSeconds: 60,
    expensive: false,
  },
  {
    id: "data-health",
    path: "/api/cron/data-health",
    purpose: "Catalog emptiness / health monitoring",
    owner: "catalog",
    schedule: "0 6 * * *",
    estimatedRuntime: "10–30s",
    estimatedRuntimeSeconds: 30,
    expectedDailyExecutions: 1,
    expectedMonthlyInvocations: 30,
    justification:
      "Catalog emptiness / health counts. Exact counts scan live_products_apparel — gated behind EXPENSIVE_BACKGROUND_JOBS_ENABLED while Small compute is disk-constrained.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 60,
    expensive: true,
  },
  {
    id: "catalog-snapshot",
    path: "/api/cron/catalog-snapshot",
    purpose: "Row-level catalog snapshot for rollback",
    owner: "catalog",
    schedule: null,
    estimatedRuntime: "paused (disk)",
    estimatedRuntimeSeconds: 0,
    expectedDailyExecutions: 0,
    expectedMonthlyInvocations: 0,
    justification:
      "Paused 2026-08-14: nightly full-catalog row copy on Small compute at 89% disk. Re-enable only after disk headroom and EXPENSIVE_BACKGROUND_JOBS_ENABLED=1.",
    productionSafe: false,
    scheduledInProduction: false,
    maxDurationSeconds: 180,
    expensive: true,
  },
  {
    id: "catalog-promote-verify",
    path: "/api/cron/catalog-promote-verify",
    purpose: "Post-promote smoke + health score",
    owner: "catalog",
    schedule: "30 5 * * *",
    estimatedRuntime: "30–90s",
    estimatedRuntimeSeconds: 90,
    expectedDailyExecutions: 1,
    expectedMonthlyInvocations: 30,
    justification: "Daily verification protects storefront after overnight jobs.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 120,
    expensive: true,
  },
  {
    id: "weekly-edit-preview",
    path: "/api/cron/weekly-edit-preview",
    purpose: "Preview weekly editorial email",
    owner: "growth",
    schedule: "0 18 * * 4",
    estimatedRuntime: "15–40s",
    estimatedRuntimeSeconds: 40,
    expectedDailyExecutions: 1 / 7,
    expectedMonthlyInvocations: 5,
    justification: "Thursday preview only — one send per week keeps email cost and Fluid usage bounded.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 60,
    expensive: false,
  },
  {
    id: "weekly-edit-send",
    path: "/api/cron/weekly-edit-send",
    purpose: "Send weekly editorial email",
    owner: "growth",
    schedule: "0 14 * * 5",
    estimatedRuntime: "20–60s",
    estimatedRuntimeSeconds: 60,
    expectedDailyExecutions: 1 / 7,
    expectedMonthlyInvocations: 5,
    justification: "Friday send only — weekly cadence; not a polling or warming job.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 60,
    expensive: false,
  },
  {
    id: "scan-followup",
    path: "/api/cron/scan-followup",
    purpose: "Scanner follow-up messaging",
    owner: "growth",
    schedule: "0 11 * * *",
    estimatedRuntime: "15–40s",
    estimatedRuntimeSeconds: 40,
    expectedDailyExecutions: 1,
    expectedMonthlyInvocations: 30,
    justification: "Daily follow-up batch; not a polling loop.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 60,
    expensive: false,
  },
  {
    id: "lifecycle-checkpoints",
    path: "/api/cron/lifecycle-checkpoints",
    purpose: "Behavior-first Day 4/10/25 lifecycle emails",
    owner: "growth",
    schedule: "0 15 * * *",
    estimatedRuntime: "20–55s",
    estimatedRuntimeSeconds: 55,
    expectedDailyExecutions: 1,
    expectedMonthlyInvocations: 30,
    justification:
      "One daily pass evaluates due cohorts and sends at most one checkpoint email per user per day gate.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 60,
    expensive: false,
  },
  {
    id: "sync-designers",
    path: "/api/cron/sync-designers",
    purpose: "Refresh designer directory flags/counts",
    owner: "catalog",
    schedule: "0 4 * * *",
    estimatedRuntime: "20–60s",
    estimatedRuntimeSeconds: 60,
    expectedDailyExecutions: 1,
    expectedMonthlyInvocations: 30,
    justification:
      "Daily designer sync keeps /designers accurate. Full catalog page scans — gated behind EXPENSIVE_BACKGROUND_JOBS_ENABLED.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 90,
    expensive: true,
  },
  {
    id: "refresh-catalog-stats",
    path: "/api/cron/refresh-catalog-stats",
    purpose: "Weekly platform_stats_cache refresh",
    owner: "catalog",
    schedule: "0 5 * * 0",
    estimatedRuntime: "30–90s",
    estimatedRuntimeSeconds: 90,
    expectedDailyExecutions: 1 / 7,
    expectedMonthlyInvocations: 5,
    justification: "Weekly is enough for marketing stats.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 120,
    expensive: true,
  },
  {
    id: "hq-weekly-briefing",
    path: "/api/cron/hq-weekly-briefing",
    purpose: "Founder weekly briefing report",
    owner: "founder-hq",
    schedule: "0 7 * * 1",
    estimatedRuntime: "30–90s",
    estimatedRuntimeSeconds: 90,
    expectedDailyExecutions: 1 / 7,
    expectedMonthlyInvocations: 5,
    justification: "Weekly founder report only.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 120,
    expensive: false,
  },
  {
    id: "rakuten-revenue-pull",
    path: "/api/cron/rakuten-revenue-pull",
    purpose: "Pull Rakuten revenue reports (API preferred; FTP capped)",
    owner: "commerce",
    schedule: "0 8 * * *",
    estimatedRuntime: "20–60s",
    estimatedRuntimeSeconds: 60,
    expectedDailyExecutions: 2,
    expectedMonthlyInvocations: 60,
    justification:
      "Twice daily revenue refresh. Locked + maxFiles capped. Must not run unbounded FTP walks.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 60,
    expensive: true,
  },
  {
    id: "rakuten-revenue-pull-afternoon",
    path: "/api/cron/rakuten-revenue-pull",
    purpose: "Afternoon Rakuten revenue pull",
    owner: "commerce",
    schedule: "0 15 * * *",
    estimatedRuntime: "20–60s",
    estimatedRuntimeSeconds: 60,
    expectedDailyExecutions: 0, // counted on primary id; see combined below
    expectedMonthlyInvocations: 0,
    justification: "Second daily pull; cost counted with rakuten-revenue-pull primary.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 60,
    expensive: true,
  },
  {
    id: "hq-integrations-sync",
    path: "/api/cron/hq-integrations-sync",
    purpose: "Sync Google/TikTok/Pinterest metrics into HQ",
    owner: "founder-hq",
    schedule: "0 6 * * *",
    estimatedRuntime: "30–90s",
    estimatedRuntimeSeconds: 90,
    expectedDailyExecutions: 1,
    expectedMonthlyInvocations: 30,
    justification: "Daily integration sync for Action Center.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 120,
    expensive: false,
  },
  {
    id: "push-dispatch",
    path: "/api/cron/push-dispatch",
    purpose: "Inventory / optional APNs dispatch tick",
    owner: "growth",
    schedule: "0 10 * * *",
    estimatedRuntime: "5–20s",
    estimatedRuntimeSeconds: 20,
    expectedDailyExecutions: 1,
    expectedMonthlyInvocations: 30,
    justification: "Lightweight daily tick; no fan-out warming.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 60,
    expensive: false,
  },
  {
    id: "cost-observability",
    path: "/api/cron/cost-observability",
    purpose: "Write vercel_cost_snapshot for Founder Dashboard",
    owner: "platform",
    schedule: "0 */6 * * *",
    estimatedRuntime: "5–15s",
    estimatedRuntimeSeconds: 15,
    expectedDailyExecutions: 4,
    expectedMonthlyInvocations: 120,
    justification:
      "Four lightweight snapshots/day. Must stay cheap — no catalog fan-out.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 30,
    expensive: false,
  },
  {
    id: "gmail-outreach-sync",
    path: "/api/cron/gmail-outreach-sync",
    purpose: "Ingest Gmail sent/reply headers for known hq_contacts",
    owner: "founder-hq",
    schedule: "15 * * * *",
    estimatedRuntime: "5–20s",
    estimatedRuntimeSeconds: 15,
    expectedDailyExecutions: 24,
    expectedMonthlyInvocations: 720,
    justification:
      "Founder-requested Gmail logging for the daily 25 outreach goal. Skips immediately when Gmail is not connected. Headers only — no bodies, no catalog scans.",
    productionSafe: true,
    scheduledInProduction: true,
    maxDurationSeconds: 60,
    expensive: false,
  },
  // --- Intentionally UNSCHEDULED (registered so CI can forbid accidental scheduling) ---
  {
    id: "warm",
    path: "/api/cron/warm",
    purpose:
      "OPTIONAL lightweight health warm only. NEVER schedule by default. NEVER warm catalog/sale/scan/recommend.",
    owner: "platform",
    schedule: null,
    estimatedRuntime: "n/a (disabled)",
    estimatedRuntimeSeconds: 0,
    expectedDailyExecutions: 0,
    expectedMonthlyInvocations: 0,
    justification:
      "Historical incident: every-2-minute warm fan-out caused ~$92 Fluid Provisioned Memory. Remains unscheduled; WARM_CRON_ENABLED defaults to 0.",
    productionSafe: false,
    scheduledInProduction: false,
    maxDurationSeconds: 20,
    expensive: true,
    enableEnv: "WARM_CRON_ENABLED",
  },
  {
    id: "rakuten-feed-sync",
    path: "/api/cron/rakuten-feed-sync",
    purpose: "Rakuten feed ingest — monitoring-only on Vercel; live ingest off-platform",
    owner: "catalog",
    schedule: null,
    estimatedRuntime: "unsuitable for Vercel request lifetime",
    estimatedRuntimeSeconds: 0,
    expectedDailyExecutions: 0,
    expectedMonthlyInvocations: 0,
    justification:
      "FTP/feed ingest must not run as long-lived Vercel Functions. GitHub Actions / stage path owns imports.",
    productionSafe: false,
    scheduledInProduction: false,
    maxDurationSeconds: 300,
    expensive: true,
  },
];

export function scheduledProductionJobs(): BackgroundJobDefinition[] {
  return BACKGROUND_JOBS.filter((j) => j.scheduledInProduction && j.schedule);
}

export function expectedVercelCrons(): Array<{ path: string; schedule: string }> {
  return scheduledProductionJobs().map((j) => ({
    path: j.path,
    schedule: j.schedule as string,
  }));
}

export function jobByPath(path: string): BackgroundJobDefinition | undefined {
  return BACKGROUND_JOBS.find((j) => j.path === path);
}

export function totalExpectedMonthlyInvocations(): number {
  // Deduplicate afternoon revenue pull (monthly counted on primary)
  return BACKGROUND_JOBS.filter((j) => j.scheduledInProduction).reduce(
    (sum, j) => sum + j.expectedMonthlyInvocations,
    0
  );
}
