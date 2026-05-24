export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";

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

  try {
    const { syncRakutenFeeds } = await import(
      "../../../../lib/feed-sync/rakuten-sync.js"
    );
    const result = await syncRakutenFeeds();
    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[rakuten-feed-sync]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
