import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-service-client";
import {
  COST_BUDGET_KEY,
  COST_OBSERVABILITY_KEY,
  backgroundJobsEnabled,
  expensiveJobsEnabled,
  recordJobObservation,
  warmCronEnabled,
  withJobLock,
} from "@/lib/job-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authorize(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Records cost-proxy signals + kill-switch state for the Founder Dashboard.
 * Vercel does not expose live invoice line-items to this app via public API.
 */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const startedAt = new Date().toISOString();
  const locked = await withJobLock("cost-observability", 35_000, async () => {
    const supabase = getServerSupabase();
    if (!supabase) throw new Error("Missing Supabase env");

    const budgetUsd = Number(process.env.VERCEL_MONTHLY_BUDGET_USD || 30);
    const [{ data: obs }, { data: locks }, { data: budgetRow }] = await Promise.all([
      supabase
        .from("system_status")
        .select("value_json, updated_at")
        .eq("key", COST_OBSERVABILITY_KEY)
        .maybeSingle(),
      supabase
        .from("system_status")
        .select("key, value_json, updated_at")
        .like("key", "job_lock:%"),
      supabase
        .from("system_status")
        .select("value_json")
        .eq("key", COST_BUDGET_KEY)
        .maybeSingle(),
    ]);

    const jobs = ((obs?.value_json as { jobs?: Record<string, any> } | null)?.jobs ||
      {}) as Record<
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
    >;

    const longest = Object.entries(jobs)
      .map(([job, stats]) => ({
        job,
        maxDurationMs: Number(stats.maxDurationMs || 0),
        avgDurationMs:
          Number(stats.runs || 0) > 0
            ? Math.round(Number(stats.totalDurationMs || 0) / Number(stats.runs || 1))
            : 0,
        runs: Number(stats.runs || 0),
        failures: Number(stats.failures || 0),
        lastAt: stats.lastAt || null,
      }))
      .sort((a, b) => b.maxDurationMs - a.maxDurationMs)
      .slice(0, 12);

    const activeLocks = (locks || [])
      .map((row) => {
        const value = (row.value_json || {}) as {
          locked?: boolean;
          startedAt?: string;
          jobName?: string;
          maxAgeMs?: number;
        };
        if (!value.locked) return null;
        const ageMs = value.startedAt
          ? Date.now() - Date.parse(value.startedAt)
          : null;
        return {
          key: row.key,
          jobName: value.jobName || row.key,
          startedAt: value.startedAt || null,
          ageMs,
          stale: ageMs != null && value.maxAgeMs != null ? ageMs > value.maxAgeMs : false,
        };
      })
      .filter(Boolean);

    const configuredBudget =
      Number((budgetRow?.value_json as { usd?: number } | null)?.usd) || budgetUsd;

    // Proxy projection: sum observed job duration as GB-hours assuming 1GB instances.
    // This is intentionally conservative and labeled as a proxy in the UI.
    const totalDurationMs = Object.values(jobs).reduce(
      (sum, j) => sum + Number(j.totalDurationMs || 0),
      0
    );
    const observedGbHours = totalDurationMs / 3_600_000;
    const memoryRateUsd = Number(process.env.VERCEL_MEMORY_RATE_USD || 0.0106);
    const proxyObservedSpendUsd = observedGbHours * memoryRateUsd;

    const now = new Date();
    const day = now.getUTCDate();
    const daysInMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
    ).getUTCDate();
    const projectedMonthEndUsd =
      day > 0 ? (proxyObservedSpendUsd / day) * daysInMonth : proxyObservedSpendUsd;

    const snapshot = {
      at: new Date().toISOString(),
      billingApiAvailable: false,
      billingApiNote:
        "Vercel public APIs available to this app do not expose Fluid Provisioned Memory invoice line-items. Dashboard uses duration/invocation proxies + kill-switch state.",
      killSwitches: {
        backgroundJobsEnabled: backgroundJobsEnabled(),
        expensiveJobsEnabled: expensiveJobsEnabled(),
        warmCronEnabled: warmCronEnabled(),
        warmCronScheduled: false,
      },
      budgetUsd: configuredBudget,
      proxy: {
        observedGbHours: Number(observedGbHours.toFixed(3)),
        observedSpendUsd: Number(proxyObservedSpendUsd.toFixed(2)),
        projectedMonthEndUsd: Number(projectedMonthEndUsd.toFixed(2)),
        memoryRateUsd,
        assumption: "1 GB instance · observed job durations only",
      },
      longestJobs: longest,
      activeLocks,
      alerts: {
        projectedOver30: projectedMonthEndUsd > 30,
        projectedOver50: projectedMonthEndUsd > 50,
        projectedOverBudget: projectedMonthEndUsd > configuredBudget,
        staleLocks: activeLocks.some((l) => (l as { stale?: boolean })?.stale),
        warmStillEnabled: warmCronEnabled(),
      },
    };

    await supabase.from("system_status").upsert({
      key: "vercel_cost_snapshot",
      value_json: snapshot,
      updated_at: snapshot.at,
    });

    if (!Number((budgetRow?.value_json as { usd?: number } | null)?.usd)) {
      await supabase.from("system_status").upsert({
        key: COST_BUDGET_KEY,
        value_json: { usd: configuredBudget, updatedAt: snapshot.at },
        updated_at: snapshot.at,
      });
    }

    return snapshot;
  });

  if (!locked.ok) {
    await recordJobObservation({
      job: "cost-observability",
      startedAt,
      ok: false,
      skipped: true,
      detail: locked.body,
    });
    return NextResponse.json(locked.body, { status: locked.status });
  }

  await recordJobObservation({
    job: "cost-observability",
    startedAt,
    ok: true,
    detail: {
      projectedMonthEndUsd: locked.result.proxy.projectedMonthEndUsd,
      warmCronEnabled: locked.result.killSwitches.warmCronEnabled,
    },
  });

  return NextResponse.json({ ok: true, snapshot: locked.result });
}
