import { NextRequest, NextResponse } from "next/server";
import { requireHqSession } from "@/lib/dashboard/auth";
import { getServerSupabase } from "@/lib/supabase-service-client";
import {
  gmailHasSheetsScope,
  resolveContactsSheetId,
  saveContactsSheetUrl,
  syncHqContactsFromSheet,
} from "@/lib/dashboard/hq-contacts-sheet-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function markSheetSource(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  workspaceId: string,
  result: Awaited<ReturnType<typeof syncHqContactsFromSheet>>
) {
  const status = result.skipped && result.ok ? "not_connected" : result.ok ? "connected" : "error";
  const { data: existing } = await supabase
    .from("hq_data_sources")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("key", "google_contacts_sheet")
    .maybeSingle();
  await supabase.from("hq_data_sources").upsert(
    {
      workspace_id: workspaceId,
      key: "google_contacts_sheet",
      label: "Google contacts sheet",
      status,
      sync_frequency: "hourly",
      config: existing?.config || {},
      updated_at: new Date().toISOString(),
      ...(result.ok && !result.skipped
        ? { last_success_at: new Date().toISOString(), error_message: null, records_imported: result.inserted + result.updated }
        : result.reason
          ? { error_message: result.reason.slice(0, 500) }
          : {}),
    },
    { onConflict: "workspace_id,key" }
  );
}

export async function GET() {
  const session = await requireHqSession();
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const [spreadsheetId, source, gmail] = await Promise.all([
    resolveContactsSheetId(supabase, session.workspaceId),
    supabase
      .from("hq_data_sources")
      .select("status, last_success_at, error_message, config")
      .eq("workspace_id", session.workspaceId)
      .eq("key", "google_contacts_sheet")
      .maybeSingle(),
    supabase
      .from("hq_oauth_connections")
      .select("scopes, status")
      .eq("workspace_id", session.workspaceId)
      .eq("provider", "gmail")
      .maybeSingle(),
  ]);

  return NextResponse.json({
    spreadsheetId,
    sheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null,
    status: source.data?.status || "not_connected",
    lastSuccessAt: source.data?.last_success_at || null,
    errorMessage: source.data?.error_message || null,
    gmailConnected: gmail.data?.status === "connected" || gmail.data?.status === "degraded",
    gmailHasSheetsScope: gmailHasSheetsScope(gmail.data?.scopes || []),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireHqSession();
  if (!session.roles.some((r) => ["founder", "admin"].includes(r))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { sheetUrl?: string; action?: string };
  if (body.action === "sync") {
    const result = await syncHqContactsFromSheet({ supabase, workspaceId: session.workspaceId });
    await markSheetSource(supabase, session.workspaceId, result);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  }

  try {
    const saved = await saveContactsSheetUrl(supabase, session.workspaceId, String(body.sheetUrl || ""));
    return NextResponse.json({ ok: true, ...saved });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Save failed" }, { status: 400 });
  }
}
