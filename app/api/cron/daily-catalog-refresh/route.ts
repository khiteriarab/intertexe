export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";

function authorize(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Priority Mytheresa + NFP refresh — runs before general catalog batches. */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  try {
    const { syncRakutenFeeds } = await import(
      "../../../../lib/feed-sync/rakuten-sync.js"
    );

    const mytheresa = await syncRakutenFeeds({
      ftpDirFilter: ["35663", "43172", "43654"],
      fileLimit: 40,
      fileOffset: 0,
      batchSize: parseInt(process.env.FEED_SYNC_BATCH_SIZE || "100", 10),
    });

    return NextResponse.json({
      ok: mytheresa.ok,
      mytheresa,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[daily-catalog-refresh]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
