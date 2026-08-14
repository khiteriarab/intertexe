/**
 * Cost / concurrency guards for Vercel background jobs.
 *
 * Fluid Provisioned Memory bills for wall-clock instance lifetime while
 * requests are in flight — including I/O wait. Long overlapping crons
 * therefore dominate spend even when Active CPU stays low.
 */
import { getServerSupabase } from "./supabase-service-client";

export const BACKGROUND_JOBS_KILL_SWITCH = "background_jobs_disabled";
export const COST_BUDGET_KEY = "vercel_cost_budget_usd";
export const COST_OBSERVABILITY_KEY = "vercel_cost_observability";

export function backgroundJobsEnabled(): boolean {
  const raw = String(process.env.BACKGROUND_JOBS_ENABLED ?? "1").trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  return true;
}

export function warmCronEnabled(): boolean {
  // Default OFF — the */2 fan-out was the provisioned-memory cost driver.
  const raw = String(process.env.WARM_CRON_ENABLED ?? "0").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

export function expensiveJobsEnabled(): boolean {
  if (!backgroundJobsEnabled()) return false;
  // Default OFF — Small compute cannot absorb classify/snapshot/feed scans.
  const raw = String(process.env.EXPENSIVE_BACKGROUND_JOBS_ENABLED ?? "0")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

export function expensiveJobSkipBody() {
  return {
    ok: true as const,
    skipped: true as const,
    reason: "EXPENSIVE_BACKGROUND_JOBS_ENABLED=0 or BACKGROUND_JOBS_ENABLED=0",
  };
}

export async function isBackgroundJobsBlockedInDb(): Promise<boolean> {
  const supabase = getServerSupabase();
  if (!supabase) return false;
  const { data } = await supabase
    .from("system_status")
    .select("value_json")
    .eq("key", BACKGROUND_JOBS_KILL_SWITCH)
    .maybeSingle();
  return Boolean((data?.value_json as { blocked?: boolean } | null)?.blocked);
}

export type JobLockResult =
  | { ok: true; lockKey: string; token: string }
  | { ok: false; reason: "busy" | "disabled" | "no_supabase"; detail?: string };

/**
 * Acquire a short-lived exclusive lock in system_status.
 * Stale locks older than maxAgeMs are stolen (automatic cancellation of stuck jobs).
 */
export async function acquireJobLock(
  jobName: string,
  maxAgeMs: number
): Promise<JobLockResult> {
  if (!backgroundJobsEnabled()) {
    return { ok: false, reason: "disabled", detail: "BACKGROUND_JOBS_ENABLED=0" };
  }
  if (await isBackgroundJobsBlockedInDb()) {
    return { ok: false, reason: "disabled", detail: "system_status.background_jobs_disabled" };
  }

  const supabase = getServerSupabase();
  if (!supabase) return { ok: false, reason: "no_supabase" };

  const lockKey = `job_lock:${jobName}`;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const now = Date.now();

  const { data: existing } = await supabase
    .from("system_status")
    .select("value_json, updated_at")
    .eq("key", lockKey)
    .maybeSingle();

  const value = (existing?.value_json || {}) as {
    locked?: boolean;
    token?: string;
    startedAt?: string;
  };
  if (value.locked && value.startedAt) {
    const age = now - Date.parse(value.startedAt);
    if (Number.isFinite(age) && age < maxAgeMs) {
      return {
        ok: false,
        reason: "busy",
        detail: `lock held since ${value.startedAt} (age_ms=${age})`,
      };
    }
  }

  const payload = {
    locked: true,
    token,
    jobName,
    startedAt: new Date(now).toISOString(),
    maxAgeMs,
  };
  const { error } = await supabase.from("system_status").upsert({
    key: lockKey,
    value_json: payload,
    updated_at: new Date(now).toISOString(),
  });
  if (error) {
    return { ok: false, reason: "busy", detail: error.message };
  }
  return { ok: true, lockKey, token };
}

export async function releaseJobLock(lockKey: string, token: string): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) return;
  const { data } = await supabase
    .from("system_status")
    .select("value_json")
    .eq("key", lockKey)
    .maybeSingle();
  const value = (data?.value_json || {}) as { token?: string };
  if (value.token && value.token !== token) return;
  await supabase.from("system_status").upsert({
    key: lockKey,
    value_json: {
      locked: false,
      token: null,
      releasedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  });
}

export async function withJobLock<T>(
  jobName: string,
  maxAgeMs: number,
  fn: () => Promise<T>
): Promise<{ ok: true; result: T } | { ok: false; status: number; body: Record<string, unknown> }> {
  const lock = await acquireJobLock(jobName, maxAgeMs);
  if (!lock.ok) {
    const status = lock.reason === "disabled" ? 503 : 409;
    return {
      ok: false,
      status,
      body: {
        ok: false,
        skipped: true,
        reason: lock.reason,
        detail: lock.detail || null,
        job: jobName,
      },
    };
  }
  try {
    const result = await fn();
    return { ok: true, result };
  } finally {
    await releaseJobLock(lock.lockKey, lock.token);
  }
}

/** Hard timeout for outbound fetches — prevents unbounded provisioned-memory waits. */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const timeoutMs = Math.max(250, Math.min(init.timeoutMs ?? 8000, 30_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function recordJobObservation(input: {
  job: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  ok: boolean;
  skipped?: boolean;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) return;
  const finishedAt = input.finishedAt || new Date().toISOString();
  const durationMs =
    input.durationMs ??
    Math.max(0, Date.parse(finishedAt) - Date.parse(input.startedAt));

  const { data } = await supabase
    .from("system_status")
    .select("value_json")
    .eq("key", COST_OBSERVABILITY_KEY)
    .maybeSingle();

  const prev = (data?.value_json || {}) as {
    jobs?: Record<string, unknown>;
    recent?: unknown[];
  };
  const jobs = { ...(prev.jobs || {}) };
  const prior = (jobs[input.job] || {}) as {
    runs?: number;
    failures?: number;
    totalDurationMs?: number;
    maxDurationMs?: number;
    lastAt?: string;
  };
  jobs[input.job] = {
    runs: Number(prior.runs || 0) + 1,
    failures: Number(prior.failures || 0) + (input.ok ? 0 : 1),
    totalDurationMs: Number(prior.totalDurationMs || 0) + durationMs,
    maxDurationMs: Math.max(Number(prior.maxDurationMs || 0), durationMs),
    lastAt: finishedAt,
    lastOk: input.ok,
    lastSkipped: Boolean(input.skipped),
    lastDetail: input.detail || null,
  };

  const recent = Array.isArray(prev.recent) ? prev.recent.slice(0, 49) : [];
  recent.unshift({
    job: input.job,
    ok: input.ok,
    skipped: Boolean(input.skipped),
    durationMs,
    at: finishedAt,
    detail: input.detail || null,
  });

  await supabase.from("system_status").upsert({
    key: COST_OBSERVABILITY_KEY,
    value_json: {
      updatedAt: finishedAt,
      jobs,
      recent,
      notes:
        "Proxy cost signals from job duration/invocations. Vercel does not expose live billing line-items via public API to this app.",
    },
    updated_at: finishedAt,
  });
}
