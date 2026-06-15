export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-service-client";
import { EMAIL_FROM } from "@/lib/email-constants";
import { CATALOG_ALERT_EMAIL } from "@/lib/catalog-daily-report";

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

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  const { data: row } = await supabase
    .from("system_status")
    .select("updated_at")
    .eq("key", "rakuten_feed_sync")
    .maybeSingle();

  const lastSync = row?.updated_at ? new Date(row.updated_at) : null;
  const hoursSinceSync = lastSync
    ? (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)
    : null;
  const stale = !lastSync || (hoursSinceSync ?? 0) > 48;

  let emailed = false;
  if (stale && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || EMAIL_FROM,
          to: [CATALOG_ALERT_EMAIL],
          subject: `INTERTEXE feed sync stale (${hoursSinceSync != null ? Math.round(hoursSinceSync) : "unknown"}h)`,
          html: `<p>Rakuten feed sync has not run in ${hoursSinceSync != null ? Math.round(hoursSinceSync) : "unknown"} hours. Last sync: ${lastSync?.toISOString() ?? "never"}.</p>`,
        }),
      });
      emailed = res.ok;
    } catch (e) {
      console.error("[feed-sync-stale-alert]", e);
    }
  }

  return NextResponse.json({
    status: stale ? (emailed ? "alert sent" : "stale") : "ok",
    stale,
    last_sync: lastSync?.toISOString() ?? null,
    hours_since_sync: hoursSinceSync != null ? Math.round(hoursSinceSync) : null,
    emailed,
  });
}
