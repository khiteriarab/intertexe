export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { getServerSupabase } from "@/lib/supabase-service-client";
import { syncProvider } from "@/lib/dashboard/integrations/connections";
import { recordJobObservation } from "@/lib/job-guard";

/**
 * Hourly Gmail header ingest for known hq_contacts.
 * Skips immediately when Gmail is not connected. No catalog access.
 */
export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const startedAt = new Date().toISOString();
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  const { data: connections, error } = await supabase
    .from("hq_oauth_connections")
    .select("workspace_id, status")
    .eq("provider", "gmail")
    .in("status", ["connected", "degraded"]);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!connections?.length) {
    await recordJobObservation({
      job: "gmail-outreach-sync",
      startedAt,
      ok: true,
      skipped: true,
    }).catch(() => null);
    return NextResponse.json({ ok: true, skipped: true, reason: "gmail_not_connected" });
  }

  const results = [];
  for (const row of connections) {
    const out = await syncProvider(supabase, row.workspace_id, "gmail");
    results.push({ workspaceId: row.workspace_id, ...out });
  }

  await recordJobObservation({
    job: "gmail-outreach-sync",
    startedAt,
    ok: true,
  }).catch(() => null);

  return NextResponse.json({ ok: true, results });
}
