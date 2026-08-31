export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { refreshCatalogRouteStats } from "@/lib/refresh-catalog-route-stats";
import { refreshPlatformStatsCache } from "@/lib/refresh-catalog-stats";
import { expensiveJobSkipBody, expensiveJobsEnabled } from "@/lib/job-guard";

function authorize(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Weekly refresh of platform_stats_cache + precomputed shop route counts (iOS toolbar). */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  if (!expensiveJobsEnabled()) {
    return NextResponse.json(expensiveJobSkipBody());
  }

  try {
    const [platformStats, routeStats] = await Promise.all([
      refreshPlatformStatsCache(),
      refreshCatalogRouteStats("us"),
    ]);
    return NextResponse.json({
      ok: true,
      ...platformStats,
      routeStats: {
        catalogTotal: routeStats.catalogTotal,
        shoesTotal: routeStats.shoesTotal,
        fiberRouteCount: routeStats.fiberRouteCount,
        taxonomyRouteCount: routeStats.taxonomyRouteCount,
        updatedAt: routeStats.updatedAt,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "refresh-catalog-stats failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
