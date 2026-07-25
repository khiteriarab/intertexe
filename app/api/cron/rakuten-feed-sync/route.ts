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

/**
 * Production importer is owned by GitHub Actions (nightly + workflow_dispatch).
 * Vercel cron is removed from vercel.json. This route:
 * - Returns monitoring status for normal / Vercel-cron hits (no import, no checkpoint advance)
 * - Allows emergency import only with ?force_import=1 + auth
 * Distributed lock still prevents overlap if force_import is used while GHA runs.
 */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const forceImport = url.searchParams.get("force_import") === "1";
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  if (!forceImport || isVercelCron) {
    const supabase = getChunkSupabase();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
    }
    const { data: chunk } = await supabase
      .from("system_status")
      .select("value_json")
      .eq("key", "rakuten_feed_chunk_state")
      .maybeSingle();
    const { data: sync } = await supabase
      .from("system_status")
      .select("value_json")
      .eq("key", "rakuten_feed_sync")
      .maybeSingle();
    const { data: lock } = await supabase
      .from("system_status")
      .select("value_json")
      .eq("key", "rakuten_feed_sync_lock")
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      importer: "disabled_on_vercel",
      authoritativeRunner: "github_actions",
      monitoringOnly: true,
      checkpoint: chunk?.value_json ?? null,
      lastSync: sync?.value_json ?? null,
      lock: lock?.value_json ?? null,
      hint: "Use GitHub Actions workflow_dispatch, or ?force_import=1 for emergency only",
    });
  }

  const supabase = getChunkSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  process.env.FEED_SYNC_OWNER =
    process.env.FEED_SYNC_OWNER || `vercel_emergency_${process.env.VERCEL_REGION || "iad1"}`;

  const result = await runRakutenFeedChunk(supabase);
  if (result.error?.startsWith("skipped_locked:")) {
    return NextResponse.json({ ...result, skipped: true }, { status: 200 });
  }
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
