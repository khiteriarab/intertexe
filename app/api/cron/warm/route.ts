import { NextRequest, NextResponse } from "next/server";
import {
  fetchWithTimeout,
  recordJobObservation,
  warmCronEnabled,
  withJobLock,
} from "@/lib/job-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Optional cache warmer. DEFAULT OFF (WARM_CRON_ENABLED=0).
 *
 * Historical incident: every-2-minute schedule with 11 fan-out catalog/sale/scan
 * fetches and no fetch timeouts produced continuous Fluid Provisioned Memory
 * billing while Active CPU stayed low (I/O wait still bills provisioned memory).
 *
 * This route is no longer registered in vercel.json. Manual/auth hits remain
 * for controlled testing only.
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
      note: "Warm cron disabled after Fluid Provisioned Memory cost incident.",
    });
  }

  const locked = await withJobLock("warm", 25_000, async () => {
    const routes = [
      "/api/catalog?region=us&limit=12",
      "/api/sale?region=us&limit=12",
    ];
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com";

    const results = await Promise.all(
      routes.map(async (route) => {
        const t0 = Date.now();
        try {
          const res = await fetchWithTimeout(`${baseUrl}${route}`, {
            method: "GET",
            timeoutMs: 5_000,
            headers: { "User-Agent": "intertexe-warm/2.0" },
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
