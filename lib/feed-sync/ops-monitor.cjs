/**
 * Nightly Rakuten sync operational monitoring for INTERTEXE HQ + Resend alerts.
 * Email delivery failures never throw — they are recorded on the run log.
 *
 * CJS entry for GitHub Actions / Node scripts. Next.js imports ops-monitor.ts instead
 * (createRequire(import.meta.url) breaks under webpack page-data collection).
 */

const LATEST_KEY = "rakuten_nightly_sync_latest";
const HISTORY_KEY = "rakuten_nightly_sync_history";
const FOUNDER_REPORTS_KEY = "hq_founder_reports";
const ALERT_EMAIL = process.env.FEED_ALERT_EMAIL || "info@intertexe.com";
const HISTORY_LIMIT = 30;
const FOUNDER_REPORT_LIMIT = 26;
/** Matches GitHub Actions rakuten-feed-sync schedule (daily 02:00 UTC). */
const CRON_HOUR_UTC = 2;
const VOLUME_DROP_RATIO = 0.3; // warn if upserted < 30% of recent median
/** Merchant feed considered stale when no live product last_seen within this window. */
const STALE_MERCHANT_HOURS = Number(process.env.STALE_MERCHANT_HOURS || 72);

function nextScheduledRunIso(from = new Date()) {
  const d = new Date(from);
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), CRON_HOUR_UTC, 0, 0, 0)
  );
  if (next <= d) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

function githubRunUrl() {
  const server = process.env.GITHUB_SERVER_URL || "https://github.com";
  const repo = process.env.GITHUB_REPOSITORY || "khiteriarab/intertexe";
  const runId = process.env.GITHUB_RUN_ID;
  if (!runId) return null;
  return `${server}/${repo}/actions/runs/${runId}`;
}

function asMessages(errors) {
  if (!Array.isArray(errors)) return [];
  return errors
    .map((e) => (typeof e === "string" ? e : e?.message || JSON.stringify(e)))
    .filter(Boolean)
    .map(String);
}

function median(nums) {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

/**
 * @param {object} input
 * @returns {{ status: 'success'|'warning'|'failure', warnings: string[], errors: string[], suggestedNextStep: string|null }}
 */
function evaluateSyncOutcome(input) {
  const errors = asMessages(input.errors);
  const warnings = [];
  const totalFiles = Number(input.totalCatalogFiles || 0);
  const processed = Number(input.filesProcessed || 0);
  const upserted = Number(input.upserted || 0);
  const before = Number(input.checkpointBefore ?? 0);
  const after = Number(input.checkpointAfter ?? before);
  const listingFailed = Boolean(input.listingFailed);
  const okFlag = input.ok !== false;
  const joined = errors.join(" | ");

  const ftpAuth =
    /530|login incorrect|authentication failed|ftp.*(auth|login)|auth.*(ftp|failed)/i.test(
      joined
    );
  const ftpConn =
    listingFailed ||
    /could not list|450|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|control socket|zero catalog/i.test(joined);
  const designerFailed =
    Boolean(input.designerFailed) || errors.some((m) => /designer_sync/i.test(m));

  if (!okFlag && errors.length) {
    /* keep */
  }
  if (ftpAuth) errors.unshift("FTP authentication failed");
  if (listingFailed || (totalFiles === 0 && !input.skippedLocked)) {
    errors.push("Zero catalog files discovered or FTP listing failed");
  }
  if (ftpConn && !listingFailed && totalFiles === 0) {
    errors.push("FTP connection/listing failure");
  }
  if (processed > 0 && upserted === 0) {
    warnings.push("Zero products upserted after processing catalog files");
  }
  // Cycle wrap resets offset to 0 — that is advancement, not a stuck checkpoint.
  const checkpointWrapped =
    Boolean(input.cycleComplete) ||
    (totalFiles > 0 && processed > 0 && after === 0 && before + processed >= totalFiles);
  if (!listingFailed && totalFiles > 0 && processed > 0 && after === before && !checkpointWrapped) {
    warnings.push("Checkpoint did not advance");
  }
  if (designerFailed) {
    warnings.push("Designer synchronization failed");
  }
  if (input.exceptionMessage) {
    errors.push(`Unexpected exception: ${input.exceptionMessage}`);
  }

  // Volume checks on full cycles only — per-chunk upsert counts vary widely with 2-file runs.
  const recentUpserts = (input.recentSuccessfulUpserts || []).map(Number).filter((n) => n > 0);
  const med = median(recentUpserts.slice(0, 5));
  if (input.cycleComplete && med != null && upserted > 0 && upserted < med * VOLUME_DROP_RATIO) {
    warnings.push(
      `Product volume dropped materially (upserted ${upserted} vs recent median ${Math.round(med)})`
    );
  } else if (input.cycleComplete && med != null && processed > 0 && upserted === 0 && med > 100) {
    warnings.push(`Product volume dropped to zero vs recent median ${Math.round(med)}`);
  }

  if (input.staleMerchants?.length) {
    warnings.push(
      `Merchant feed(s) not updated within expected period: ${input.staleMerchants.slice(0, 8).join(", ")}`
    );
  }

  const uniqueErrors = [...new Set(errors)];
  const uniqueWarnings = [...new Set(warnings)];
  let status = "success";
  if (uniqueErrors.length || listingFailed || input.workflowFailed) status = "failure";
  else if (uniqueWarnings.length) status = "warning";

  let suggestedNextStep = null;
  if (ftpAuth) suggestedNextStep = "Verify RAKUTEN_FTP_USERNAME / RAKUTEN_FTP_PASSWORD repository secrets.";
  else if (listingFailed || totalFiles === 0)
    suggestedNextStep = "Check Rakuten FTP connectivity from GitHub Actions and review listing retries.";
  else if (designerFailed)
    suggestedNextStep = "Inspect designer_sync errors in the Actions log; re-run workflow_dispatch after fix.";
  else if (uniqueWarnings.some((w) => /volume/i.test(w)))
    suggestedNextStep = "Compare this MID’s feed size with prior runs; confirm filters/gates are intentional.";
  else if (status === "failure")
    suggestedNextStep = "Open the GitHub Actions run, inspect the failed step, then re-run workflow_dispatch.";
  else if (uniqueWarnings.some((w) => /checkpoint/i.test(w)))
    suggestedNextStep = "Inspect rakuten_feed_chunk_state and the distributed lock in system_status.";

  return { status, warnings: uniqueWarnings, errors: uniqueErrors, suggestedNextStep };
}

async function sendOpsAlertEmail({ subject, text, html }) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY missing" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || "INTERTEXE <info@mail.intertexe.com>",
        to: [ALERT_EMAIL],
        subject,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function buildAlertEmail(run) {
  const subject = "INTERTEXE Alert: Nightly Catalog Sync Requires Attention";
  const lines = [
    `Severity: ${String(run.status || "failure").toUpperCase()}`,
    `UTC time: ${run.finishedAt || new Date().toISOString()}`,
    "",
    "Summary:",
    ...(run.errors || []).map((e) => `  - ERROR: ${e}`),
    ...(run.warnings || []).map((w) => `  - WARNING: ${w}`),
    "",
    `Last successful sync: ${run.lastSuccessfulAt || "unknown"}`,
    `Files discovered: ${run.totalCatalogFiles ?? "—"}`,
    `Files processed: ${run.filesProcessed ?? "—"}`,
    `Products inserted: ${run.inserted ?? "—"}`,
    `Products updated: ${run.updated ?? "—"}`,
    `Products rejected: ${run.rejected ?? "—"}`,
    `Upserted: ${run.upserted ?? "—"}`,
    `Designers synced: ${run.designersSynced ?? "—"}`,
    `Checkpoint: ${run.checkpointBefore ?? "—"} → ${run.checkpointAfter ?? "—"}`,
    run.affectedMerchants?.length
      ? `Affected merchants: ${run.affectedMerchants.join(", ")}`
      : null,
    run.githubRunUrl ? `GitHub Actions run: ${run.githubRunUrl}` : null,
    run.suggestedNextStep ? `Suggested next step: ${run.suggestedNextStep}` : null,
    "",
    "INTERTEXE HQ → Overview / Operations for sync history.",
  ].filter((x) => x != null);

  const text = lines.join("\n");
  const html = `<div style="font-family:Georgia,serif;max-width:640px;margin:0 auto;color:#1a1a1a">
  <p style="letter-spacing:0.18em;font-size:11px;text-transform:uppercase;color:#888">INTERTEXE Operations</p>
  <h1 style="font-weight:500;font-size:24px">${subject}</h1>
  <pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:13px;line-height:1.45;background:#f7f7f5;padding:16px;border-radius:8px">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</pre>
  ${
    run.githubRunUrl
      ? `<p style="margin-top:20px"><a href="${run.githubRunUrl}">Open GitHub Actions run →</a></p>`
      : ""
  }
  <p><a href="https://www.intertexe.com/dashboard/operations">Open INTERTEXE HQ Operations →</a></p>
</div>`;

  return { subject, text, html };
}

/**
 * Persist run + optionally email. Never throws for email/HQ write soft-failures beyond logging.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} input
 */
async function finalizeNightlySyncOps(supabase, input) {
  const startedAt = input.startedAt || new Date().toISOString();
  const finishedAt = input.finishedAt || new Date().toISOString();
  const durationMs = Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt));

  let history = [];
  try {
    const { data } = await supabase.from("system_status").select("value_json").eq("key", HISTORY_KEY).maybeSingle();
    history = Array.isArray(data?.value_json?.runs) ? data.value_json.runs : [];
  } catch {
    history = [];
  }

  const recentSuccessfulUpserts = history
    .filter((r) => r?.status === "success" && Number(r.upserted) > 0)
    .map((r) => Number(r.upserted));

  const lastSuccessfulAt =
    history.find((r) => r?.status === "success")?.finishedAt ||
    (input.lastSuccessfulAt || null);

  const evaluated = evaluateSyncOutcome({
    ...input,
    recentSuccessfulUpserts,
  });

  const run = {
    id: input.id || `run_${process.env.GITHUB_RUN_ID || Date.now()}`,
    event: input.event || process.env.GITHUB_EVENT_NAME || "manual",
    status: evaluated.status,
    startedAt,
    finishedAt,
    durationMs,
    checkpointBefore: Number(input.checkpointBefore ?? 0),
    checkpointAfter: Number(input.checkpointAfter ?? 0),
    totalCatalogFiles: Number(input.totalCatalogFiles ?? 0),
    filesProcessed: Number(input.filesProcessed ?? 0),
    inserted: Number(input.inserted ?? input.newProducts ?? 0),
    updated: Number(input.updated ?? input.updatedProducts ?? 0),
    rejected: Number(input.rejected ?? 0),
    upserted: Number(input.upserted ?? 0),
    designersSynced: Number(input.designersSynced ?? 0),
    errors: evaluated.errors,
    warnings: evaluated.warnings,
    suggestedNextStep: evaluated.suggestedNextStep,
    lastSuccessfulAt: evaluated.status === "success" ? finishedAt : lastSuccessfulAt,
    githubRunUrl: input.githubRunUrl || githubRunUrl(),
    githubRunId: process.env.GITHUB_RUN_ID || null,
    affectedMerchants: input.affectedMerchants || input.staleMerchants || [],
    emailSent: false,
    emailError: null,
    nextScheduledRun: nextScheduledRunIso(new Date(finishedAt)),
    source: input.source || process.env.FEED_SYNC_OWNER || "unknown",
  };

  if (evaluated.status === "success") {
    run.lastSuccessfulAt = finishedAt;
  }

  // Keep HQ run history during an intentional feed pause, but suppress alert spam.
  const alertsMuted = String(process.env.FEED_SYNC_ALERTS_MUTED || "") === "1";
  if (!alertsMuted && (evaluated.status === "failure" || evaluated.status === "warning")) {
    const mail = buildAlertEmail(run);
    const sent = await sendOpsAlertEmail(mail);
    run.emailSent = sent.ok;
    run.emailError = sent.error;
    if (!sent.ok) {
      console.warn("[ops-monitor] email delivery failed:", sent.error);
    }
  }

  const latestPayload = {
    ...run,
    displayStatus: run.status === "success" ? "Success" : run.status === "warning" ? "Warning" : "Failure",
  };

  const nextHistory = [run, ...history].slice(0, HISTORY_LIMIT);

  try {
    await supabase.from("system_status").upsert({
      key: LATEST_KEY,
      value_json: latestPayload,
      updated_at: finishedAt,
    });
    await supabase.from("system_status").upsert({
      key: HISTORY_KEY,
      value_json: { runs: nextHistory, updatedAt: finishedAt },
      updated_at: finishedAt,
    });
  } catch (err) {
    console.warn(
      "[ops-monitor] failed to persist HQ sync log:",
      err instanceof Error ? err.message : String(err)
    );
  }

  return { run: latestPayload, emailSent: run.emailSent, emailError: run.emailError };
}

async function loadNightlySyncOps(supabase) {
  const { data: latestRow } = await supabase
    .from("system_status")
    .select("value_json, updated_at")
    .eq("key", LATEST_KEY)
    .maybeSingle();
  const { data: historyRow } = await supabase
    .from("system_status")
    .select("value_json")
    .eq("key", HISTORY_KEY)
    .maybeSingle();
  const latest = latestRow?.value_json || null;
  const runs = Array.isArray(historyRow?.value_json?.runs) ? historyRow.value_json.runs : [];
  return {
    latest,
    runs,
    nextScheduledRun: latest?.nextScheduledRun || nextScheduledRunIso(),
  };
}

async function saveFounderReport(supabase, report) {
  let reports = [];
  try {
    const { data } = await supabase
      .from("system_status")
      .select("value_json")
      .eq("key", FOUNDER_REPORTS_KEY)
      .maybeSingle();
    reports = Array.isArray(data?.value_json?.reports) ? data.value_json.reports : [];
  } catch {
    reports = [];
  }
  const next = [report, ...reports].slice(0, FOUNDER_REPORT_LIMIT);
  await supabase.from("system_status").upsert({
    key: FOUNDER_REPORTS_KEY,
    value_json: { reports: next, updatedAt: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  });
  return next;
}

async function loadFounderReports(supabase) {
  const { data } = await supabase
    .from("system_status")
    .select("value_json")
    .eq("key", FOUNDER_REPORTS_KEY)
    .maybeSingle();
  return Array.isArray(data?.value_json?.reports) ? data.value_json.reports : [];
}

/**
 * Merchants with live products whose newest last_seen_at is older than STALE_MERCHANT_HOURS.
 * Never throws — returns [] on query failure.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<string[]>}
 */
async function detectStaleMerchants(supabase) {
  try {
    const cutoff = new Date(Date.now() - STALE_MERCHANT_HOURS * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("products")
      .select("retailer_mid, last_seen_at")
      .eq("is_active", true)
      .eq("approved", "yes")
      .not("retailer_mid", "is", null)
      .order("last_seen_at", { ascending: false })
      .limit(5000);
    if (error || !Array.isArray(data)) return [];

    const newestByMid = new Map();
    for (const row of data) {
      const mid = String(row.retailer_mid || "").trim();
      if (!mid) continue;
      const seen = row.last_seen_at ? Date.parse(row.last_seen_at) : 0;
      const prev = newestByMid.get(mid) || 0;
      if (seen > prev) newestByMid.set(mid, seen);
    }

    const cutoffMs = Date.parse(cutoff);
    const stale = [];
    for (const [mid, newest] of newestByMid.entries()) {
      if (!newest || newest < cutoffMs) stale.push(mid);
    }
    return stale.slice(0, 20);
  } catch {
    return [];
  }
}

module.exports = {
  LATEST_KEY,
  HISTORY_KEY,
  FOUNDER_REPORTS_KEY,
  ALERT_EMAIL,
  STALE_MERCHANT_HOURS,
  nextScheduledRunIso,
  evaluateSyncOutcome,
  finalizeNightlySyncOps,
  loadNightlySyncOps,
  saveFounderReport,
  loadFounderReports,
  detectStaleMerchants,
  sendOpsAlertEmail,
  buildAlertEmail,
};
