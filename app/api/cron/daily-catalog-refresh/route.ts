export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-service-client";
import { sendCatalogDailyEmail } from "@/lib/catalog-daily-report";

function authorize(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Priority Mytheresa sync + daily catalog health email to info@intertexe.com. */
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

    const supabase = getServerSupabase();
    let emailResult: { sent: boolean; snapshot?: Awaited<ReturnType<typeof sendCatalogDailyEmail>>["snapshot"] } = {
      sent: false,
    };

    if (supabase) {
      const syncSummary = mytheresa.ok
        ? `Mytheresa OK — upserted ${mytheresa.upserted ?? 0}, normalized ${mytheresa.normalized ?? 0}`
        : `Mytheresa partial — errors ${mytheresa.errors?.length ?? 0}`;
      emailResult = await sendCatalogDailyEmail(supabase, { syncSummary });
    }

    return NextResponse.json({
      ok: mytheresa.ok,
      mytheresa,
      email: emailResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[daily-catalog-refresh]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
