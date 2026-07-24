/**
 * Pull Rakuten revenue/report-like files from the same Affiliate FTP used for catalog,
 * plus optional Advanced Reports API when credentials are present.
 *
 * Env:
 *   RAKUTEN_FTP_HOST / RAKUTEN_FTP_USERNAME / RAKUTEN_FTP_PASSWORD
 *   RAKUTEN_REVENUE_FTP_DIR   — optional subdirectory (default: scan known report dirs)
 *   RAKUTEN_REPORTS_TOKEN    — optional Publisher Reports API bearer (future)
 */
import { Client as FtpClient } from "basic-ftp";
import { Writable } from "node:stream";
import { gunzipSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import { parseAffiliateReport } from "./revenue";

const REPORT_NAME_RE =
  /(transaction|transactions|commission|commissions|payment|payments|revenue|report|sales)/i;

function getService() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function downloadFtpText(client: FtpClient, remotePath: string): Promise<string> {
  const chunks: Buffer[] = [];
  const writable = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      cb();
    },
  });
  await client.downloadTo(writable, remotePath);
  let buf = Buffer.concat(chunks);
  if (remotePath.toLowerCase().endsWith(".gz")) {
    buf = gunzipSync(buf);
  }
  return buf.toString("utf8");
}

async function listReportCandidates(
  client: FtpClient,
  dir: string,
  depth: number,
  out: Array<{ path: string; name: string; size: number }>
) {
  if (depth > 3) return;
  let list;
  try {
    list = await client.list(dir);
  } catch {
    return;
  }
  for (const entry of list) {
    const name = entry.name;
    const path = dir === "/" || dir === "" ? `/${name}` : `${dir.replace(/\/$/, "")}/${name}`;
    if (entry.isDirectory) {
      // Prefer report-ish folders; still recurse one level into MID dirs
      if (depth === 0 || REPORT_NAME_RE.test(name) || /^\d+$/.test(name)) {
        await listReportCandidates(client, path, depth + 1, out);
      }
      continue;
    }
    const lower = name.toLowerCase();
    if (!/\.(csv|tsv|txt)(\.gz)?$/.test(lower)) continue;
    if (!REPORT_NAME_RE.test(name) && !REPORT_NAME_RE.test(dir)) continue;
    out.push({ path, name, size: entry.size || 0 });
  }
}

export async function pullRakutenRevenueReports(opts?: {
  workspaceId?: string;
  dryRun?: boolean;
  maxFiles?: number;
}) {
  const supabase = getService();
  if (!supabase) throw new Error("Supabase not configured");

  let workspaceId = opts?.workspaceId;
  if (!workspaceId) {
    const { data: ws } = await supabase
      .from("hq_workspaces")
      .select("id")
      .eq("slug", "intertexe")
      .maybeSingle();
    workspaceId = ws?.id;
  }
  if (!workspaceId) throw new Error("intertexe workspace missing");

  const host = process.env.RAKUTEN_FTP_HOST || "aftp.linksynergy.com";
  const user = process.env.RAKUTEN_FTP_USERNAME || process.env.RAKUTEN_FTP_USER;
  const pass = process.env.RAKUTEN_FTP_PASSWORD;
  if (!user || !pass) {
    return {
      ok: false as const,
      reason: "ftp_credentials_missing",
      message:
        "Set RAKUTEN_FTP_USERNAME + RAKUTEN_FTP_PASSWORD (same as catalog), or upload CSV manually in Commerce.",
      imported: 0,
      files: [] as string[],
    };
  }

  const client = new FtpClient(60_000);
  client.ftp.verbose = false;
  const candidates: Array<{ path: string; name: string; size: number }> = [];

  try {
    await client.access({ host, user, password: pass, secure: false });
    const startDir = process.env.RAKUTEN_REVENUE_FTP_DIR || "/";
    await listReportCandidates(client, startDir, 0, candidates);
  } catch (err: any) {
    client.close();
    return {
      ok: false as const,
      reason: "ftp_error",
      message: err?.message || "FTP failed",
      imported: 0,
      files: [],
    };
  }

  const maxFiles = opts?.maxFiles ?? 5;
  const selected = candidates
    .sort((a, b) => b.size - a.size)
    .slice(0, maxFiles);

  if (opts?.dryRun) {
    client.close();
    return {
      ok: true as const,
      reason: "dry_run",
      message: `Found ${candidates.length} candidate report files`,
      imported: 0,
      files: selected.map((f) => f.path),
      candidates: candidates.length,
    };
  }

  let imported = 0;
  const files: string[] = [];
  const errors: string[] = [];

  for (const file of selected) {
    try {
      const text = await downloadFtpText(client, file.path);
      const { rows } = parseAffiliateReport(text);
      if (!rows.length) {
        errors.push(`${file.path}: no rows parsed`);
        continue;
      }

      const { data: batch } = await supabase
        .from("hq_revenue_import_batches")
        .insert({
          workspace_id: workspaceId,
          network: "rakuten",
          filename: file.path,
          rows_seen: rows.length,
          status: "running",
          metadata: { source: "ftp", size: file.size },
        })
        .select("id")
        .maybeSingle();

      let upserted = 0;
      for (const r of rows) {
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
            status: r.status || "imported",
            u1: r.u1,
            raw: r.raw,
            import_batch_id: batch?.id || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,network,external_transaction_id" }
        );
        if (!error) upserted += 1;
      }

      if (batch?.id) {
        await supabase
          .from("hq_revenue_import_batches")
          .update({
            status: "success",
            rows_upserted: upserted,
            finished_at: new Date().toISOString(),
          })
          .eq("id", batch.id);
      }

      imported += upserted;
      files.push(file.path);
    } catch (err: any) {
      errors.push(`${file.path}: ${err?.message || "failed"}`);
    }
  }

  client.close();

  if (imported > 0) {
    await supabase
      .from("hq_data_sources")
      .update({
        status: "connected",
        last_success_at: new Date().toISOString(),
        records_imported: imported,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("key", "rakuten_revenue");
  }

  return {
    ok: true as const,
    reason: selected.length ? "imported" : "no_report_files_on_ftp",
    message: selected.length
      ? `Imported ${imported} rows from ${files.length} file(s)`
      : "No transaction/report CSV files found on FTP (catalog feeds only). Upload manually or set RAKUTEN_REVENUE_FTP_DIR.",
    imported,
    files,
    candidates: candidates.length,
    errors,
  };
}
