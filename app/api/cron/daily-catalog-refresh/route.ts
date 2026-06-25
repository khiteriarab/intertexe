export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-service-client";
import { sendCatalogDailyEmail } from "@/lib/catalog-daily-report";

function authorize(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Classification + stats refresh. Rakuten feed runs via chunked cron every 30m. */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  const log: {
    startedAt: string;
    steps: Record<string, unknown>;
    errors: { step: string; message: string }[];
    counts?: { active: number | null; displayable: number | null };
    finishedAt?: string;
  } = {
    startedAt: new Date().toISOString(),
    steps: {},
    errors: [],
  };

  try {
    const classifyBatch = Number(process.env.SWOOP_CLASSIFY_BATCH || 50);
    const maxRounds = Number(process.env.SWOOP_CLASSIFY_MAX_ROUNDS || 400);
    let classified = 0;
    for (let i = 0; i < maxRounds; i += 1) {
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
      reason: "Use /api/cron/rakuten-feed-sync every 30m for stock + feed updates",
    };

    let emailResult: {
      sent: boolean;
      snapshot?: Awaited<ReturnType<typeof sendCatalogDailyEmail>>["snapshot"];
    } = { sent: false };
    try {
      emailResult = await sendCatalogDailyEmail(supabase, {
        syncSummary: "Rakuten feed via 30m chunked cron; classification ran in this job.",
      });
      log.steps.email = emailResult;
    } catch (emailErr: unknown) {
      log.errors.push({
        step: "email",
        message: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    log.finishedAt = new Date().toISOString();
    return NextResponse.json(
      { ok: log.errors.length === 0, log, email: emailResult },
      { status: log.errors.length ? 207 : 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.errors.push({ step: "fatal", message });
    return NextResponse.json({ ok: false, log, error: message }, { status: 500 });
  }
}
