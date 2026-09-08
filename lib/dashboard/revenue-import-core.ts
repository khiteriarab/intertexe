import type { SupabaseClient } from "@supabase/supabase-js";
import { sendOpsAlertEmail, ALERT_EMAIL } from "../feed-sync/ops-monitor";
import type { ParsedAffiliateRow } from "./revenue";
import { enrichAffiliateRows } from "./revenue-enrichment";

export type ImportAffiliateResult = {
  upserted: number;
  batchId: string | null;
  rowsSeen: number;
  newTransactions: Array<{
    external_transaction_id: string;
    advertiser_name: string | null;
    product_name: string | null;
    commission_amount: number | null;
    sales_amount: number | null;
    transaction_date: string | null;
    sku: string | null;
    u1: string | null;
  }>;
  catalogMatched: number;
};

async function loadExistingIds(
  supabase: SupabaseClient,
  workspaceId: string,
  ids: string[]
): Promise<Set<string>> {
  const existing = new Set<string>();
  const chunk = 200;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk).filter(Boolean);
    if (!slice.length) continue;
    const { data } = await supabase
      .from("hq_affiliate_transactions")
      .select("external_transaction_id")
      .eq("workspace_id", workspaceId)
      .in("external_transaction_id", slice);
    for (const row of data || []) {
      if (row.external_transaction_id) existing.add(String(row.external_transaction_id));
    }
  }
  return existing;
}

export async function notifyNewCommissionSales(
  newRows: ImportAffiliateResult["newTransactions"]
): Promise<{ sent: boolean; error?: string }> {
  const withCommission = newRows.filter((r) => Number(r.commission_amount || 0) > 0);
  if (!withCommission.length) return { sent: false };

  const lines = withCommission.slice(0, 25).map((r) => {
    const comm = Number(r.commission_amount || 0).toFixed(2);
    const sale = Number(r.sales_amount || 0).toFixed(2);
    const when = r.transaction_date ? String(r.transaction_date).slice(0, 10) : "—";
    return `• ${when} · ${r.advertiser_name || "Advertiser"} · ${r.product_name || r.sku || "Product"} · $${comm} comm / $${sale} sale · u1=${r.u1 || "—"}`;
  });

  const subject = `INTERTEXE HQ: ${withCommission.length} new affiliate commission${withCommission.length === 1 ? "" : "s"}`;
  const text = [
    `${withCommission.length} new commission row(s) imported from Rakuten.`,
    "",
    ...lines,
    "",
    "Open HQ → Commerce for the full ledger.",
    "https://www.intertexe.com/dashboard/commerce",
  ].join("\n");

  const html = `<p><strong>${withCommission.length}</strong> new commission row(s) imported.</p><ul>${withCommission
    .slice(0, 25)
    .map(
      (r) =>
        `<li>${String(r.transaction_date || "").slice(0, 10)} · ${r.advertiser_name || "Advertiser"} · ${r.product_name || r.sku || "Product"} · $${Number(r.commission_amount || 0).toFixed(2)}</li>`
    )
    .join("")}</ul><p><a href="https://www.intertexe.com/dashboard/commerce">Open Commerce dashboard</a></p>`;

  const result = await sendOpsAlertEmail({ subject, text, html });
  return { sent: Boolean(result.ok), error: result.error || undefined };
}

export async function importAffiliateRows(
  supabase: SupabaseClient,
  workspaceId: string,
  rows: ParsedAffiliateRow[],
  meta: { source: string; filename: string; extra?: Record<string, unknown>; notify?: boolean }
): Promise<ImportAffiliateResult> {
  const enriched = await enrichAffiliateRows(supabase, rows);
  const catalogMatched = enriched.filter((r) => r.raw?.catalog_uuid).length;

  const { data: batch } = await supabase
    .from("hq_revenue_import_batches")
    .insert({
      workspace_id: workspaceId,
      network: "rakuten",
      filename: meta.filename,
      rows_seen: enriched.length,
      status: "running",
      metadata: {
        source: meta.source,
        catalog_matched: catalogMatched,
        ...(meta.extra || {}),
      },
    })
    .select("id")
    .maybeSingle();

  const extIds = enriched
    .map((r) => r.external_transaction_id)
    .filter(Boolean)
    .map(String);
  const existingBefore = await loadExistingIds(supabase, workspaceId, extIds);

  let upserted = 0;
  const newTransactions: ImportAffiliateResult["newTransactions"] = [];

  for (const r of enriched) {
    const extId = r.external_transaction_id ? String(r.external_transaction_id) : "";
    const isNew = extId && !existingBefore.has(extId);

    const { error } = await supabase.from("hq_affiliate_transactions").upsert(
      {
        workspace_id: workspaceId,
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
        status: r.status && r.status !== "demo" ? r.status : "imported",
        u1: r.u1,
        raw: { ...(r.raw || {}), import_source: meta.source },
        import_batch_id: batch?.id || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,network,external_transaction_id" }
    );
    if (!error) {
      upserted += 1;
      if (isNew) {
        newTransactions.push({
          external_transaction_id: extId,
          advertiser_name: r.advertiser_name,
          product_name: r.product_name,
          commission_amount: r.commission_amount,
          sales_amount: r.sales_amount,
          transaction_date: r.transaction_date,
          sku: r.sku,
          u1: r.u1,
        });
      }
    }
  }

  if (batch?.id) {
    await supabase
      .from("hq_revenue_import_batches")
      .update({
        status: "success",
        rows_upserted: upserted,
        finished_at: new Date().toISOString(),
        metadata: {
          source: meta.source,
          catalog_matched: catalogMatched,
          new_transactions: newTransactions.length,
          ...(meta.extra || {}),
        },
      })
      .eq("id", batch.id);
  }

  if (meta.notify !== false && newTransactions.length) {
    await notifyNewCommissionSales(newTransactions);
  }

  return {
    upserted,
    batchId: batch?.id || null,
    rowsSeen: enriched.length,
    newTransactions,
    catalogMatched,
  };
}

export { ALERT_EMAIL };
