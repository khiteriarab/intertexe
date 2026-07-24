/**
 * Pull Rakuten affiliate revenue via:
 *  1) Reporting Platform API (ran-reporting.rakutenmarketing.com) — preferred
 *  2) Affiliate FTP report CSVs (rare; usually catalog feeds only)
 *
 * Env (Reporting API — pick one style):
 *   RAKUTEN_REPORTS_URL          — full "Get API" URL from Publisher Dashboard (best)
 *   or RAKUTEN_REPORTS_TOKEN + RAKUTEN_REPORTS_KEY
 *   RAKUTEN_REPORTS_REGION       — default "en"
 *   RAKUTEN_REPORTS_NETWORK      — optional network id (e.g. 1)
 *   RAKUTEN_REPORTS_DATE_TYPE    — "transaction" | "process" (default transaction)
 *   RAKUTEN_REPORTS_LOOKBACK_DAYS — default 30
 *
 * Env (FTP fallback):
 *   RAKUTEN_FTP_HOST / RAKUTEN_FTP_USERNAME|RAKUTEN_FTP_USER / RAKUTEN_FTP_PASSWORD
 *   RAKUTEN_REVENUE_FTP_DIR
 */
import { Client as FtpClient } from "basic-ftp";
import { Writable } from "node:stream";
import { gunzipSync } from "node:zlib";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseAffiliateReport, type ParsedAffiliateRow } from "./revenue";

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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type RakutenReportsConfig = {
  token: string;
  reportKey: string;
  region: string;
  network: string | null;
  dateType: "transaction" | "process";
  lookbackDays: number;
  sourceUrl?: string;
};

/** Parse Get API URL or discrete env vars into a reporting config. */
export function resolveRakutenReportsConfig(
  env: NodeJS.ProcessEnv = process.env
): RakutenReportsConfig | null {
  const lookbackDays = Math.max(
    1,
    Math.min(90, Number(env.RAKUTEN_REPORTS_LOOKBACK_DAYS || 30) || 30)
  );
  const region = (env.RAKUTEN_REPORTS_REGION || "en").replace(/^\/+|\/+$/g, "");
  const network = env.RAKUTEN_REPORTS_NETWORK?.trim() || null;
  const dateType =
    env.RAKUTEN_REPORTS_DATE_TYPE === "process" ? "process" : "transaction";

  const rawUrl = env.RAKUTEN_REPORTS_URL?.trim();
  if (rawUrl) {
    try {
      const u = new URL(rawUrl);
      const token = u.searchParams.get("token") || "";
      const m = u.pathname.match(/\/reports\/([^/]+)/i);
      const reportKey = decodeURIComponent(m?.[1] || "");
      if (token && reportKey) {
        return {
          token,
          reportKey,
          region: u.pathname.split("/")[1] || region,
          network: u.searchParams.get("network") || network,
          dateType:
            u.searchParams.get("date_type") === "process" ? "process" : dateType,
          lookbackDays,
          sourceUrl: rawUrl,
        };
      }
    } catch {
      /* fall through to discrete vars */
    }
  }

  const token = env.RAKUTEN_REPORTS_TOKEN?.trim();
  const reportKey = env.RAKUTEN_REPORTS_KEY?.trim();
  if (!token || !reportKey) return null;

  return { token, reportKey, region, network, dateType, lookbackDays };
}

export function buildRakutenReportsFetchUrl(
  cfg: RakutenReportsConfig,
  start: Date,
  end: Date
): string {
  const base = `https://ran-reporting.rakutenmarketing.com/${cfg.region}/reports/${encodeURIComponent(cfg.reportKey)}/filters`;
  const params = new URLSearchParams({
    token: cfg.token,
    start_date: isoDate(start),
    end_date: isoDate(end),
    include_summary: "N",
    tz: "GMT",
    date_type: cfg.dateType,
  });
  if (cfg.network) params.set("network", cfg.network);
  return `${base}?${params.toString()}`;
}

export async function fetchRakutenReportingCsv(
  cfg: RakutenReportsConfig,
  opts?: { start?: Date; end?: Date }
): Promise<{ text: string; url: string; start: string; end: string }> {
  const end = opts?.end || new Date();
  const start =
    opts?.start || new Date(end.getTime() - cfg.lookbackDays * 86400000);
  const url = buildRakutenReportsFetchUrl(cfg, start, end);

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/csv,text/plain,*/*" },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Rakuten Reporting API ${res.status}: ${text.slice(0, 240) || res.statusText}`
    );
  }
  if (!text.trim()) {
    throw new Error("Rakuten Reporting API returned an empty body");
  }
  // HTML login / error pages occasionally come back as 200
  if (/<!DOCTYPE|<html/i.test(text.slice(0, 200))) {
    throw new Error(
      "Rakuten Reporting API returned HTML instead of CSV — check token/report key"
    );
  }
  return { text, url: url.replace(cfg.token, "***"), start: isoDate(start), end: isoDate(end) };
}

async function importTransactionRows(
  supabase: SupabaseClient,
  workspaceId: string,
  rows: ParsedAffiliateRow[],
  meta: { source: string; filename: string; extra?: Record<string, unknown> }
): Promise<{ upserted: number; batchId: string | null }> {
  const { data: batch } = await supabase
    .from("hq_revenue_import_batches")
    .insert({
      workspace_id: workspaceId,
      network: "rakuten",
      filename: meta.filename,
      rows_seen: rows.length,
      status: "running",
      metadata: { source: meta.source, ...(meta.extra || {}) },
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
        status: r.status && r.status !== "demo" ? r.status : "imported",
        u1: r.u1,
        raw: { ...(r.raw || {}), import_source: meta.source },
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

  return { upserted, batchId: batch?.id || null };
}

async function markRevenueConnected(
  supabase: SupabaseClient,
  workspaceId: string,
  imported: number
) {
  if (imported <= 0) return;
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

async function pullViaReportingApi(
  supabase: SupabaseClient,
  workspaceId: string,
  cfg: RakutenReportsConfig,
  dryRun?: boolean
) {
  if (dryRun) {
    const end = new Date();
    const start = new Date(end.getTime() - cfg.lookbackDays * 86400000);
    return {
      ok: true as const,
      reason: "dry_run_reports_api",
      message: `Would fetch Reporting API report "${cfg.reportKey}" (${isoDate(start)} → ${isoDate(end)})`,
      imported: 0,
      files: [cfg.reportKey],
      source: "reports_api" as const,
    };
  }

  const fetched = await fetchRakutenReportingCsv(cfg);
  const { rows } = parseAffiliateReport(fetched.text);
  if (!rows.length) {
    return {
      ok: false as const,
      reason: "reports_api_empty",
      message: `Reporting API returned CSV with 0 parseable transaction rows (${fetched.start} → ${fetched.end}). Check report columns include Transaction ID / Sales / Commissions.`,
      imported: 0,
      files: [cfg.reportKey],
      source: "reports_api" as const,
    };
  }

  const { upserted } = await importTransactionRows(supabase, workspaceId, rows, {
    source: "reports_api",
    filename: `reports-api:${cfg.reportKey}:${fetched.start}:${fetched.end}`,
    extra: {
      reportKey: cfg.reportKey,
      range: { start: fetched.start, end: fetched.end },
      dateType: cfg.dateType,
    },
  });

  await markRevenueConnected(supabase, workspaceId, upserted);

  return {
    ok: true as const,
    reason: "imported_reports_api",
    message: `Imported ${upserted} of ${rows.length} rows from Reporting API (${fetched.start} → ${fetched.end}).`,
    imported: upserted,
    files: [cfg.reportKey],
    source: "reports_api" as const,
    rowsSeen: rows.length,
  };
}

async function pullViaFtp(
  supabase: SupabaseClient,
  workspaceId: string,
  opts?: { dryRun?: boolean; maxFiles?: number }
) {
  const host = process.env.RAKUTEN_FTP_HOST || "aftp.linksynergy.com";
  const user = process.env.RAKUTEN_FTP_USERNAME || process.env.RAKUTEN_FTP_USER;
  const pass = process.env.RAKUTEN_FTP_PASSWORD;
  if (!user || !pass) {
    return {
      ok: false as const,
      reason: "ftp_credentials_missing",
      message:
        "FTP credentials missing. Prefer RAKUTEN_REPORTS_URL (Get API), or set RAKUTEN_FTP_USER + RAKUTEN_FTP_PASSWORD.",
      imported: 0,
      files: [] as string[],
      source: "ftp" as const,
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
      source: "ftp" as const,
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
      reason: "dry_run_ftp",
      message: `Found ${candidates.length} candidate report files on FTP`,
      imported: 0,
      files: selected.map((f) => f.path),
      candidates: candidates.length,
      source: "ftp" as const,
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
      const { upserted } = await importTransactionRows(supabase, workspaceId, rows, {
        source: "ftp",
        filename: file.path,
        extra: { size: file.size },
      });
      imported += upserted;
      files.push(file.path);
    } catch (err: any) {
      errors.push(`${file.path}: ${err?.message || "failed"}`);
    }
  }

  client.close();
  await markRevenueConnected(supabase, workspaceId, imported);

  return {
    ok: true as const,
    reason: selected.length ? "imported_ftp" : "no_report_files_on_ftp",
    message: selected.length
      ? `Imported ${imported} rows from ${files.length} FTP file(s)`
      : "No transaction/report CSV files on FTP (catalog feeds only). Add RAKUTEN_REPORTS_URL from Publisher Center → Reports → Get API, or upload CSV manually.",
    imported,
    files,
    candidates: candidates.length,
    errors,
    source: "ftp" as const,
  };
}

export async function pullRakutenRevenueReports(opts?: {
  workspaceId?: string;
  dryRun?: boolean;
  maxFiles?: number;
  prefer?: "reports_api" | "ftp" | "auto";
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

  const prefer = opts?.prefer || "auto";
  const reportsCfg = resolveRakutenReportsConfig();

  if ((prefer === "auto" || prefer === "reports_api") && reportsCfg) {
    try {
      return await pullViaReportingApi(supabase, workspaceId, reportsCfg, opts?.dryRun);
    } catch (err: any) {
      if (prefer === "reports_api") {
        return {
          ok: false as const,
          reason: "reports_api_error",
          message: err?.message || "Reporting API failed",
          imported: 0,
          files: [reportsCfg.reportKey],
          source: "reports_api" as const,
        };
      }
      // Fall through to FTP when auto
      const ftp = await pullViaFtp(supabase, workspaceId, opts);
      return {
        ...ftp,
        message: `Reporting API failed (${err?.message || "error"}); FTP fallback: ${ftp.message}`,
        reportsApiError: err?.message || "error",
      };
    }
  }

  if (prefer === "reports_api" && !reportsCfg) {
    return {
      ok: false as const,
      reason: "reports_api_not_configured",
      message:
        "Set RAKUTEN_REPORTS_URL (full Get API URL) or RAKUTEN_REPORTS_TOKEN + RAKUTEN_REPORTS_KEY in Vercel.",
      imported: 0,
      files: [],
      source: "reports_api" as const,
    };
  }

  return pullViaFtp(supabase, workspaceId, opts);
}
