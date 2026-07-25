export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { getChunkSupabase, runRakutenFeedChunk } from "@/lib/feed-sync/run-rakuten-chunk";

function authorize(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Manual / emergency trigger only — scheduled Vercel cron removed; GHA owns the schedule.
 *  Distributed lock prevents overlap with GitHub Actions.
 */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const supabase = getChunkSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  process.env.FEED_SYNC_OWNER =
    process.env.FEED_SYNC_OWNER || `vercel_${process.env.VERCEL_REGION || "iad1"}`;

  const result = await runRakutenFeedChunk(supabase);
  if (result.error?.startsWith("skipped_locked:")) {
    return NextResponse.json({ ...result, skipped: true }, { status: 200 });
  }
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
