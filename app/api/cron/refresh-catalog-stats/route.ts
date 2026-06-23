export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { refreshPlatformStatsCache } from "@/lib/refresh-catalog-stats";

function authorize(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Weekly refresh of platform_stats_cache (shop + homepage counts). */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  try {
    const stats = await refreshPlatformStatsCache();
    return NextResponse.json({ ok: true, ...stats });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "refresh-catalog-stats failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
