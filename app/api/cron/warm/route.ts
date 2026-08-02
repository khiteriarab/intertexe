import { NextRequest, NextResponse } from "next/server";
import {
  fetchWithTimeout,
  recordJobObservation,
  warmCronEnabled,
  withJobLock,
} from "@/lib/job-guard";
import { assertWarmRoutesAllowed, WARM_ALLOWED_PATHS } from "@/lib/background-jobs/warm-policy";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * OPTIONAL cache warmer. DEFAULT OFF (WARM_CRON_ENABLED=0).
 *
 * Permanent policy:
 * - Not scheduled in vercel.json
 * - Production requires explicit WARM_CRON_ENABLED=1
 * - Only lightweight health endpoints may be warmed
 * - Catalog / sale / scan / recommend are FORBIDDEN
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  if (!warmCronEnabled()) {
    await recordJobObservation({
      job: "warm",
      startedAt,
      ok: true,
      skipped: true,
      detail: { reason: "WARM_CRON_ENABLED=0" },
    });
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "WARM_CRON_ENABLED=0",
      note: "Warm cron disabled by default. Production requires explicit manual opt-in.",
      allowedPaths: WARM_ALLOWED_PATHS,
    });
  }

  const locked = await withJobLock("warm", 25_000, async () => {
    const routes = [...WARM_ALLOWED_PATHS];
    const policy = assertWarmRoutesAllowed(routes);
    if (!policy.ok) {
      throw new Error(`Warm policy violation: ${policy.forbidden.join(", ")}`);
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com";

    const results = await Promise.all(
      routes.map(async (route) => {
        const t0 = Date.now();
        try {
          const res = await fetchWithTimeout(`${baseUrl}${route}`, {
            method: "GET",
            timeoutMs: 3_000,
            headers: { "User-Agent": "intertexe-warm/3.0" },
          });
          return {
            route,
            status: res.status,
            ms: Date.now() - t0,
            ok: res.ok,
          };
        } catch (err) {
          return {
            route,
            status: 0,
            ms: Date.now() - t0,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      })
    );

    return {
      warmed: routes.length,
      results,
      at: new Date().toISOString(),
    };
  });

  if (!locked.ok) {
    await recordJobObservation({
      job: "warm",
      startedAt,
      ok: false,
      skipped: true,
      detail: locked.body,
    });
    return NextResponse.json(locked.body, { status: locked.status });
  }

  await recordJobObservation({
    job: "warm",
    startedAt,
    ok: true,
    detail: { results: locked.result.results },
  });
  return NextResponse.json({ ok: true, ...locked.result });
}
