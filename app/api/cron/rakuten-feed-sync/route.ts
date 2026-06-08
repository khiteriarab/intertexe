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
    const { searchParams } = new URL(request.url);
    const fileLimit = parseInt(searchParams.get("fileLimit") || "20", 10);
    const fileOffset = parseInt(searchParams.get("fileOffset") || "0", 10);
    const markInactive = searchParams.get("markInactive") === "true";

    const { syncRakutenFeeds } = await import(
      "../../../../lib/feed-sync/rakuten-sync.js"
    );
    const result = await syncRakutenFeeds({
      fileLimit,
      fileOffset,
      markInactive,
      batchSize: parseInt(process.env.FEED_SYNC_BATCH_SIZE || "100", 10),
    });
    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null
          ? JSON.stringify(err)
          : String(err);

    console.error("[rakuten-feed-sync]", message, err);

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
