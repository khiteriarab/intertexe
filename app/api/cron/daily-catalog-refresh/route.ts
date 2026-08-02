export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-service-client";
import { sendCatalogDailyEmail } from "@/lib/catalog-daily-report";
import {
  expensiveJobsEnabled,
  recordJobObservation,
  withJobLock,
} from "@/lib/job-guard";

function authorize(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Classification + stats refresh. Checkpointed; capped to avoid Fluid memory overruns. */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  if (!expensiveJobsEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "EXPENSIVE_BACKGROUND_JOBS_ENABLED=0 or BACKGROUND_JOBS_ENABLED=0",
    });
  }

  const startedAt = new Date().toISOString();
  const locked = await withJobLock("daily-catalog-refresh", 130_000, async () => {
    const supabase = getServerSupabase();
    if (!supabase) {
      throw new Error("Missing Supabase env");
    }

    const log: {
      startedAt: string;
      steps: Record<string, unknown>;
      errors: { step: string; message: string }[];
      counts?: { active: number | null; displayable: number | null };
      finishedAt?: string;
    } = {
      startedAt,
      steps: {},
      errors: [],
    };

    // Hard caps — prior default 400 rounds could hold a 300s Fluid instance open.
    const classifyBatch = Math.min(Number(process.env.SWOOP_CLASSIFY_BATCH || 50), 50);
    const maxRounds = Math.min(Number(process.env.SWOOP_CLASSIFY_MAX_ROUNDS || 40), 60);
    const hardStopAt = Date.now() + 90_000;
    let classified = 0;
    for (let i = 0; i < maxRounds; i += 1) {
      if (Date.now() > hardStopAt) {
        log.steps.classifyStoppedEarly = {
          reason: "hard_timeout_90s",
          rounds: i,
          classified,
        };
        break;
      }
      const { data, error } = await supabase.rpc("swoop_classify_core_batch", {
        p_limit: classifyBatch,
      });
      if (error) {
        if (!error.message?.includes("Could not find the function")) throw error;
        break;
      }
      const n = Number(data ?? 0);
      classified += n;
      if (n === 0) break;
    }
    log.steps.classified = classified;
    log.steps.classifyCaps = { classifyBatch, maxRounds };

    try {
      const { error: hubErr } = await supabase.rpc("catalog_refresh_material_hub_counts");
      if (hubErr && !hubErr.message?.includes("Could not find the function")) {
        log.errors.push({ step: "hubCounts", message: hubErr.message });
      } else {
        log.steps.hubCounts = true;
      }
    } catch (err: unknown) {
      log.errors.push({
        step: "hubCounts",
        message: err instanceof Error ? err.message : String(err),
      });
    }

    const { error: railErr } = await supabase.rpc("refresh_homepage_feeds");
    if (railErr && !railErr.message?.includes("Could not find the function")) {
      log.errors.push({ step: "homepage", message: railErr.message });
    }

    const [{ count: active }, { count: displayable }] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_displayable", true),
    ]);
    log.counts = { active, displayable };

    try {
      const { data: summary } = await supabase
        .from("catalog_classification_summary")
        .select("visible_catalog_cards_approx")
        .maybeSingle();
      const { data: brandRaw } = await supabase.rpc("catalog_shoppable_brand_count", {
        p_min_products: 2,
      });
      await supabase.from("platform_stats_cache").upsert({
        id: "main",
        product_count: Number(summary?.visible_catalog_cards_approx ?? displayable ?? 0),
        brand_count: Number(brandRaw ?? 0),
        updated_at: new Date().toISOString(),
      });
      log.steps.platformStatsCache = { ok: true };
    } catch (cacheErr: unknown) {
      log.errors.push({
        step: "platformStatsCache",
        message: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
      });
    }

    log.steps.rakuten = {
      skipped: true,
      reason: "Feed ingest stays off Vercel; GitHub Actions / stage path owns imports.",
    };

    let emailResult: {
      sent: boolean;
      snapshot?: Awaited<ReturnType<typeof sendCatalogDailyEmail>>["snapshot"];
    } = { sent: false };
    try {
      emailResult = await sendCatalogDailyEmail(supabase, {
        syncSummary: "Daily classify+stats only; feed ingest not on Vercel.",
      });
      log.steps.email = emailResult;
    } catch (emailErr: unknown) {
      log.errors.push({
        step: "email",
        message: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    log.finishedAt = new Date().toISOString();
    try {
      await supabase.from("system_status").upsert({
        key: "daily_catalog_refresh",
        value_json: {
          ok: log.errors.length === 0,
          classified: log.steps.classified ?? null,
          counts: log.counts ?? null,
          finishedAt: log.finishedAt,
          classifyCaps: log.steps.classifyCaps,
        },
        updated_at: log.finishedAt,
      });
    } catch {
      // monitoring only
    }

    return {
      ok: log.errors.length === 0,
      log,
      email: emailResult,
      status: log.errors.length ? 207 : 200,
    };
  });

  if (!locked.ok) {
    await recordJobObservation({
      job: "daily-catalog-refresh",
      startedAt,
      ok: false,
      skipped: true,
      detail: locked.body,
    });
    return NextResponse.json(locked.body, { status: locked.status });
  }

  await recordJobObservation({
    job: "daily-catalog-refresh",
    startedAt,
    finishedAt: locked.result.log.finishedAt,
    ok: locked.result.ok,
    detail: {
      classified: locked.result.log.steps.classified,
      errors: locked.result.log.errors.length,
    },
  });

  return NextResponse.json(
    { ok: locked.result.ok, log: locked.result.log, email: locked.result.email },
    { status: locked.result.status }
  );
}
