import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../lib/dashboard/auth";
import { parseAffiliateReport } from "../../../../lib/dashboard/revenue";
import { getServerSupabase } from "../../../../lib/supabase-service-client";

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

  const { data: batch, error: batchErr } = await supabase
    .from("hq_revenue_import_batches")
    .insert({
      workspace_id: session.workspaceId,
      network: "rakuten",
      filename,
      imported_by_internal_user_id: session.internalUserId,
      rows_seen: rows.length,
      status: "running",
      metadata: { headers, delimiter },
    })
    .select("id")
    .maybeSingle();

  if (batchErr || !batch?.id) {
    return NextResponse.json({ message: batchErr?.message || "Batch create failed" }, { status: 500 });
  }

  let upserted = 0;
  let skipped = 0;
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => ({
      workspace_id: session.workspaceId,
      network: "rakuten",
      external_transaction_id: r.external_transaction_id,
      order_id: r.order_id,
      transaction_date: r.transaction_date,
      process_date: r.process_date,
      click_date: r.click_date,
      advertiser_id: r.advertiser_id,
      advertiser_name: r.advertiser_name,
      sku: r.sku,
      product_name: r.product_name,
      product_id: r.product_id,
      quantity: r.quantity,
      sales_amount: r.sales_amount,
      commission_amount: r.commission_amount,
      currency: r.currency || "USD",
      status: r.status || "imported",
      u1: r.u1,
      raw: r.raw,
      import_batch_id: batch.id,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("hq_affiliate_transactions")
      .upsert(chunk, { onConflict: "workspace_id,network,external_transaction_id" })
      .select("id");

    if (error) {
      // Unique partial index may not support ON CONFLICT via PostgREST — fall back insert-ignore style
      for (const row of chunk) {
        const { error: insErr } = await supabase.from("hq_affiliate_transactions").insert(row);
        if (insErr) {
          if (/duplicate|unique/i.test(insErr.message)) skipped += 1;
          else {
            await supabase
              .from("hq_revenue_import_batches")
              .update({
                status: "error",
                error_message: insErr.message,
                rows_upserted: upserted,
                rows_skipped: skipped,
                finished_at: new Date().toISOString(),
              })
              .eq("id", batch.id);
            return NextResponse.json({ message: insErr.message, upserted, skipped }, { status: 500 });
          }
        } else upserted += 1;
      }
    } else {
      upserted += data?.length || chunk.length;
    }
  }

  await supabase
    .from("hq_revenue_import_batches")
    .update({
      status: "success",
      rows_upserted: upserted,
      rows_skipped: skipped,
      finished_at: new Date().toISOString(),
    })
    .eq("id", batch.id);

  await supabase
    .from("hq_data_sources")
    .update({
      status: "connected",
      last_success_at: new Date().toISOString(),
      records_imported: upserted,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", session.workspaceId)
    .eq("key", "rakuten_revenue");

  return NextResponse.json({
    batchId: batch.id,
    rowsSeen: rows.length,
    upserted,
    skipped,
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
