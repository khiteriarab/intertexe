export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { getServerSupabase } from "@/lib/supabase-service-client";
import { recordJobObservation } from "@/lib/job-guard";
import { syncHqContactsFromSheet } from "@/lib/dashboard/hq-contacts-sheet-sync";

/**
 * Hourly Google Sheets → hq_contacts ingest.
 * Writes sheet-owned identity fields only. Never emails. Never touches Gmail timestamps.
 */
export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const startedAt = new Date().toISOString();
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  const { data: ws } = await supabase.from("hq_workspaces").select("id").eq("slug", "intertexe").maybeSingle();
  if (!ws?.id) {
    await recordJobObservation({
      job: "hq-contacts-sheet-sync",
      startedAt,
      ok: false,
      detail: { error: "intertexe workspace missing" },
    }).catch(() => null);
    return NextResponse.json({ ok: false, error: "intertexe workspace missing" }, { status: 500 });
  }

  const result = await syncHqContactsFromSheet({ supabase, workspaceId: ws.id });
  const status = result.skipped && result.ok ? "not_connected" : result.ok ? "connected" : "error";
  await supabase.from("hq_data_sources").upsert(
    {
      workspace_id: ws.id,
      key: "google_contacts_sheet",
      label: "Google contacts sheet",
      status,
      sync_frequency: "hourly",
      updated_at: new Date().toISOString(),
      ...(result.ok && !result.skipped
        ? { last_success_at: new Date().toISOString(), error_message: null }
        : result.reason
          ? { error_message: result.reason.slice(0, 500) }
          : {}),
    },
    { onConflict: "workspace_id,key" }
  );

  await recordJobObservation({
    job: "hq-contacts-sheet-sync",
    startedAt,
    ok: result.ok,
    skipped: result.skipped,
    detail: {
      inserted: result.inserted,
      updated: result.updated,
      alreadyCurrent: result.alreadyCurrent,
      reason: result.reason || null,
      errors: result.errors.slice(0, 5),
    },
  }).catch(() => null);

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
