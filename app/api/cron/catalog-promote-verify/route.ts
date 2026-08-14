/**
 * Post-promote / on-demand catalog verification.
 *
 * Flow: gates → smoke → health score → AI advisory verification → Action Center signal.
 * If smoke fails and ?rollback=1 (or CATALOG_SMOKE_AUTOROLLBACK=1), restore latest snapshot.
 *
 * Auth: Bearer $CRON_SECRET
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-service-client";
import {
  latestCatalogSnapshot,
  restoreCatalogFromSnapshot,
  takeCatalogSnapshot,
} from "@/lib/catalog-snapshot";
import {
  buildAiCatalogVerification,
  computeCatalogHealthScore,
  evaluatePromoteGates,
  persistCatalogHealthState,
  runCatalogSmokeTests,
} from "@/lib/catalog-health";
import {
  expensiveJobSkipBody,
  expensiveJobsEnabled,
  recordJobObservation,
  withJobLock,
} from "@/lib/job-guard";

function authorize(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  if (!expensiveJobsEnabled()) {
    return NextResponse.json(expensiveJobSkipBody());
  }

  const startedAt = new Date().toISOString();
  const locked = await withJobLock("catalog-promote-verify", 130_000, async () => {
    const supabase = getServerSupabase();
    if (!supabase) {
      throw new Error("Missing Supabase env");
    }

    const url = new URL(request.url);
    const takeSnapshot = url.searchParams.get("snapshot") === "1";
    const allowRollback =
      url.searchParams.get("rollback") === "1" ||
      process.env.CATALOG_SMOKE_AUTOROLLBACK === "1";

    let snapshot = null as Awaited<ReturnType<typeof takeCatalogSnapshot>> | null;
    if (takeSnapshot) {
      snapshot = await takeCatalogSnapshot(supabase, "catalog-promote-verify", "pre/post verify");
    }

    const gates = await evaluatePromoteGates(supabase, { requirePrevious: false });
    const smoke = await runCatalogSmokeTests();
    const health = await computeCatalogHealthScore(supabase, smoke);
    const verification = buildAiCatalogVerification({
      previous: gates.previous,
      counts: gates.counts,
      smokeOk: smoke.ok,
      gates,
      health,
    });

    await persistCatalogHealthState(supabase, { health, smoke, verification, gates });

    let rollback: { restored: number; snapshotId: string } | null = null;
    const shouldRollback =
      allowRollback &&
      (!smoke.ok || !gates.ready || verification.recommendation === "rollback");

    if (shouldRollback) {
      const latest = await latestCatalogSnapshot(supabase);
      if (latest?.snapshotId) {
        const result = await restoreCatalogFromSnapshot(supabase, latest.snapshotId, {
          dryRun: false,
        });
        rollback = { restored: result.restored, snapshotId: result.snapshotId };
        await supabase.from("system_status").upsert({
          key: "catalog_publish_blocked",
          value_json: {
            blocked: true,
            reason: "post_promote_smoke_or_gate_failure",
            verification: verification.recommendation,
            smokeOk: smoke.ok,
            blockers: gates.blockers,
            at: new Date().toISOString(),
            rollback,
          },
          updated_at: new Date().toISOString(),
        });
      }
    }

    const ok =
      smoke.ok &&
      gates.ready &&
      !health.belowThreshold &&
      verification.recommendation !== "rollback";

    return {
      ok,
      snapshot,
      gates: {
        ready: gates.ready,
        blockers: gates.blockers,
        warnings: gates.warnings,
        counts: gates.counts,
      },
      smoke,
      health,
      verification,
      rollback,
      checked_at: new Date().toISOString(),
    };
  });

  if (!locked.ok) {
    await recordJobObservation({
      job: "catalog-promote-verify",
      startedAt,
      ok: false,
      skipped: true,
      detail: locked.body,
    });
    return NextResponse.json(locked.body, { status: locked.status });
  }

  await recordJobObservation({
    job: "catalog-promote-verify",
    startedAt,
    ok: locked.result.ok,
    detail: {
      smokeOk: locked.result.smoke?.ok,
      recommendation: locked.result.verification?.recommendation,
    },
  });

  return NextResponse.json(locked.result);
}
