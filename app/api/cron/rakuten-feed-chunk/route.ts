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

/** Legacy alias — production schedule is GitHub Actions only. */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const forceImport = url.searchParams.get("force_import") === "1";
  if (!forceImport) {
    return NextResponse.json({
      ok: true,
      importer: "disabled_on_vercel",
      authoritativeRunner: "github_actions",
      monitoringOnly: true,
      hint: "Use GitHub Actions, or ?force_import=1 for emergency only",
    });
  }

  const supabase = getChunkSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  process.env.FEED_SYNC_OWNER =
    process.env.FEED_SYNC_OWNER || `vercel_emergency_chunk_${process.env.VERCEL_REGION || "iad1"}`;

  const result = await runRakutenFeedChunk(supabase);
  if (result.error?.startsWith("skipped_locked:")) {
    return NextResponse.json({ ...result, skipped: true }, { status: 200 });
  }
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
