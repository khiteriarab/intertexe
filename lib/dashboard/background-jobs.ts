import { getServerSupabase } from "../supabase-service-client";
import {
  BACKGROUND_JOBS,
  type BackgroundJobDefinition,
} from "../background-jobs/registry";
import { COST_OBSERVABILITY_KEY } from "../job-guard";
import { warmCronEnabled, backgroundJobsEnabled, expensiveJobsEnabled } from "../job-guard";

export type BackgroundJobStatusRow = {
  id: string;
  path: string;
  purpose: string;
  owner: string;
  schedule: string | null;
  scheduledInProduction: boolean;
  enabled: boolean;
  productionSafe: boolean;
  expensive: boolean;
  estimatedRuntime: string;
  expectedDailyExecutions: number;
  expectedMonthlyInvocations: number;
  nextRun: string | null;
  lastRun: string | null;
  averageDurationMs: number | null;
  maxDurationMs: number | null;
  runs: number;
  failures: number;
  retries: number;
  status: "enabled" | "disabled" | "unscheduled" | "locked" | "stale_lock" | "failing";
  lockHeld: boolean;
};

/** Minimal next-run estimator for common 5-field cron patterns used in vercel.json. */
export function estimateNextCronRun(schedule: string, from = new Date()): Date | null {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minPart, hourPart, , , dowPart] = parts;

  // Every N hours: 0 */6 * * *
  if (minPart === "0" && hourPart.startsWith("*/")) {
    const step = Number(hourPart.slice(2));
    if (!Number.isFinite(step) || step <= 0) return null;
    const d = new Date(from);
    d.setUTCMinutes(0, 0, 0);
    d.setUTCHours(d.getUTCHours() + 1);
    while (d.getUTCHours() % step !== 0) {
      d.setUTCHours(d.getUTCHours() + 1);
    }
    return d;
  }

  // Weekly: 0 H * * D
  if (/^\d+$/.test(minPart) && /^\d+$/.test(hourPart) && /^\d+$/.test(dowPart)) {
    const minute = Number(minPart);
    const hour = Number(hourPart);
    const dow = Number(dowPart); // 0=Sun
    const d = new Date(from);
    d.setUTCSeconds(0, 0);
    for (let i = 0; i < 8; i += 1) {
      const candidate = new Date(d);
      candidate.setUTCDate(d.getUTCDate() + i);
      candidate.setUTCHours(hour, minute, 0, 0);
      if (candidate.getUTCDay() === dow && candidate.getTime() > from.getTime()) {
        return candidate;
      }
    }
    return null;
  }

  // Daily: 0 H * * * or M H * * *
  if (/^\d+$/.test(minPart) && /^\d+$/.test(hourPart)) {
    const minute = Number(minPart);
    const hour = Number(hourPart);
    const d = new Date(from);
    d.setUTCSeconds(0, 0);
    d.setUTCHours(hour, minute, 0, 0);
    if (d.getTime() <= from.getTime()) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return d;
  }

  return null;
}

function isJobEnabled(job: BackgroundJobDefinition): boolean {
  if (!job.scheduledInProduction) {
    if (job.id === "warm") return warmCronEnabled();
    return false;
  }
  if (!backgroundJobsEnabled()) return false;
  if (job.expensive && !expensiveJobsEnabled()) return false;
  if (job.enableEnv) {
    const raw = String(process.env[job.enableEnv] ?? "0").toLowerCase();
    return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
  }
  return true;
}

export async function fetchBackgroundJobStatuses(): Promise<BackgroundJobStatusRow[]> {
  const supabase = getServerSupabase();
  let jobsObs: Record<
    string,
    {
      runs?: number;
      failures?: number;
      totalDurationMs?: number;
      maxDurationMs?: number;
      lastAt?: string;
      lastOk?: boolean;
      lastSkipped?: boolean;
    }
  > = {};
  let locks: Array<{ key: string; value_json: unknown; updated_at: string }> = [];

  if (supabase) {
    const [{ data: obs }, { data: lockRows }] = await Promise.all([
      supabase
        .from("system_status")
        .select("value_json")
        .eq("key", COST_OBSERVABILITY_KEY)
        .maybeSingle(),
      supabase
        .from("system_status")
        .select("key, value_json, updated_at")
        .like("key", "job_lock:%"),
    ]);
    jobsObs = ((obs?.value_json as { jobs?: typeof jobsObs } | null)?.jobs || {}) as typeof jobsObs;
    locks = (lockRows || []) as typeof locks;
  }

  const lockByJob = new Map<
    string,
    { locked: boolean; startedAt?: string; maxAgeMs?: number; stale: boolean }
  >();
  for (const row of locks) {
    const value = (row.value_json || {}) as {
      locked?: boolean;
      startedAt?: string;
      jobName?: string;
      maxAgeMs?: number;
    };
    const jobName = value.jobName || row.key.replace(/^job_lock:/, "");
    const ageMs = value.startedAt ? Date.now() - Date.parse(value.startedAt) : null;
    const stale =
      Boolean(value.locked) &&
      ageMs != null &&
      value.maxAgeMs != null &&
      ageMs > value.maxAgeMs;
    lockByJob.set(jobName, {
      locked: Boolean(value.locked),
      startedAt: value.startedAt,
      maxAgeMs: value.maxAgeMs,
      stale,
    });
  }

  // Deduplicate display for dual-schedule revenue pull — show both schedule rows from registry
  return BACKGROUND_JOBS.map((job) => {
    const obs = jobsObs[job.id] || jobsObs[job.path.replace(/^\/api\/cron\//, "")] || {};
    const runs = Number(obs.runs || 0);
    const failures = Number(obs.failures || 0);
    const totalDurationMs = Number(obs.totalDurationMs || 0);
    const avg = runs > 0 ? Math.round(totalDurationMs / runs) : null;
    const lock = lockByJob.get(job.id);
    const enabled = isJobEnabled(job);
    let status: BackgroundJobStatusRow["status"] = "enabled";
    if (!job.scheduledInProduction) status = "unscheduled";
    else if (!enabled) status = "disabled";
    else if (lock?.stale) status = "stale_lock";
    else if (lock?.locked) status = "locked";
    else if (failures > 0 && runs > 0 && failures / runs > 0.3) status = "failing";

    const next = job.schedule ? estimateNextCronRun(job.schedule) : null;

    return {
      id: job.id,
      path: job.path,
      purpose: job.purpose,
      owner: job.owner,
      schedule: job.schedule,
      scheduledInProduction: job.scheduledInProduction,
      enabled,
      productionSafe: job.productionSafe,
      expensive: job.expensive,
      estimatedRuntime: job.estimatedRuntime,
      expectedDailyExecutions: job.expectedDailyExecutions,
      expectedMonthlyInvocations: job.expectedMonthlyInvocations,
      nextRun: next ? next.toISOString() : null,
      lastRun: obs.lastAt || null,
      averageDurationMs: avg,
      maxDurationMs: obs.maxDurationMs != null ? Number(obs.maxDurationMs) : null,
      runs,
      failures,
      retries: 0, // reserved — retry counts land here when jobs report them
      status,
      lockHeld: Boolean(lock?.locked),
    };
  });
}
