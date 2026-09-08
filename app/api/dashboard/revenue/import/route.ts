import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../../lib/dashboard/auth";
import { parseAffiliateReport } from "../../../../../lib/dashboard/revenue";
import { importAffiliateRows } from "../../../../../lib/dashboard/revenue-import-core";
import { getServerSupabase } from "../../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.roles.some((r) => ["founder", "admin", "analyst"].includes(r))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const contentType = request.headers.get("content-type") || "";
  let text = "";
  let filename = "upload.csv";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (file && typeof file === "object" && "text" in file) {
      text = await (file as File).text();
      filename = (file as File).name || filename;
    } else {
      text = String(form.get("text") || "");
    }
  } else if (contentType.includes("application/json")) {
    const body = await request.json();
    text = String(body.text || body.csv || "");
    filename = String(body.filename || filename);
  } else {
    text = await request.text();
  }

  if (!text.trim()) {
    return NextResponse.json({ message: "Empty report. Upload CSV/TSV text or file." }, { status: 400 });
  }

  const { rows, headers, delimiter } = parseAffiliateReport(text);
  if (!rows.length) {
    return NextResponse.json(
      { message: "No transaction rows parsed. Check headers.", headers, delimiter },
      { status: 400 }
    );
  }

  const result = await importAffiliateRows(supabase, session.workspaceId, rows, {
    source: "manual_upload",
    filename,
    extra: { headers, delimiter, imported_by: session.internalUserId },
    notify: true,
  });

  await supabase
    .from("hq_data_sources")
    .update({
      status: "connected",
      last_success_at: new Date().toISOString(),
      records_imported: result.upserted,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", session.workspaceId)
    .eq("key", "rakuten_revenue");

  return NextResponse.json({
    batchId: result.batchId,
    rowsSeen: result.rowsSeen,
    upserted: result.upserted,
    newTransactions: result.newTransactions.length,
    catalogMatched: result.catalogMatched,
    headers,
    delimiter,
  });
}

export async function GET() {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const { data } = await supabase
    .from("hq_revenue_import_batches")
    .select("*")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ batches: data || [] });
}
