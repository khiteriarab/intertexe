/**
 * CommonJS twin of sync-outcome-classify.ts for GitHub Actions (ops-monitor.cjs).
 */

const SAFETY_RE =
  /kill_switches|ingest_blocked|ingest blocked|FEED_STAGE_DRY_RUN|catalog_publish_blocked|feed_ingest_blocked|refusing live products|stage_only_do_not_use|__stage_only/i;

const FTP_AUTH_RE =
  /530|login incorrect|FTP authentication failed|authentication problem|sql:\s*no rows in result set/i;

const FTP_LISTING_RE =
  /could not list|450 Could not list|Zero catalog files|FTP listing failed|FTP connection\/listing/i;

const REQUIRE_ESM_RE = /require is not defined|ERR_REQUIRE_ESM|Cannot use import statement/i;

function isSafetyBlockMessage(message) {
  return SAFETY_RE.test(String(message || ""));
}

function isFtpAuthMessage(message) {
  return FTP_AUTH_RE.test(String(message || ""));
}

function isFtpListingMessage(message) {
  return FTP_LISTING_RE.test(String(message || ""));
}

function classifySyncMessages(messages) {
  const list = (messages || []).map(String).filter(Boolean);
  const safetyBlocks = [];
  const ftpAuthErrors = [];
  const ftpListingErrors = [];
  const requireEsmErrors = [];
  const otherErrors = [];

  for (const m of list) {
    if (isSafetyBlockMessage(m)) safetyBlocks.push(m);
    else if (isFtpAuthMessage(m)) ftpAuthErrors.push(m);
    else if (REQUIRE_ESM_RE.test(m)) requireEsmErrors.push(m);
    else if (isFtpListingMessage(m)) ftpListingErrors.push(m);
    else otherErrors.push(m);
  }

  let kind = "none";
  // Prefer safety_block when kill-switch messages are present and there is no real FTP auth /
  // ESM failure. Prior ops bugs co-added "Zero catalog files" on intentional blocks.
  if (ftpAuthErrors.length) kind = "ftp_auth";
  else if (requireEsmErrors.length) kind = "require_esm";
  else if (safetyBlocks.length) kind = "safety_block";
  else if (ftpListingErrors.length) kind = "ftp_listing";
  else if (otherErrors.length) kind = "operational";
  else kind = "none";

  return {
    kind,
    safetyBlocks: [...new Set(safetyBlocks)],
    ftpAuthErrors: [...new Set(ftpAuthErrors)],
    ftpListingErrors: [...new Set(ftpListingErrors)],
    requireEsmErrors: [...new Set(requireEsmErrors)],
    otherErrors: [...new Set(otherErrors)],
  };
}

function describeLatestSyncRun(latest) {
  if (!latest) {
    return { label: "No sync run recorded", kind: "none", ftpAuthOk: null, intentionalBlock: false };
  }
  if (latest.intentionalSafetyBlock || latest.ingestBlocked || latest.failureKind === "safety_block") {
    return {
      label:
        "Blocked intentionally by catalog safety controls (stage-only / kill switches) — not an FTP credential failure",
      kind: "safety_block",
      ftpAuthOk: true,
      intentionalBlock: true,
    };
  }
  const classified = classifySyncMessages([
    ...(latest.errors || []),
    ...(latest.warnings || []),
  ]);
  if (classified.kind === "safety_block") {
    return {
      label:
        "Blocked intentionally by catalog safety controls (stage-only / kill switches) — not an FTP credential failure",
      kind: "safety_block",
      ftpAuthOk: true,
      intentionalBlock: true,
    };
  }
  if (classified.kind === "ftp_auth") {
    return {
      label: "FTP authentication failed",
      kind: "ftp_auth",
      ftpAuthOk: false,
      intentionalBlock: false,
    };
  }
  if (classified.kind === "ftp_listing") {
    return {
      label: "FTP listing failed",
      kind: "ftp_listing",
      ftpAuthOk: null,
      intentionalBlock: false,
    };
  }
  if (latest.status === "success") {
    return {
      label: "Success",
      kind: "none",
      ftpAuthOk: true,
      intentionalBlock: false,
    };
  }
  return {
    label: latest.status === "warning" ? "Warning" : "Operational failure",
    kind: classified.kind,
    ftpAuthOk: classified.ftpAuthErrors.length ? false : null,
    intentionalBlock: false,
  };
}

function summarizeCatalogOpsForBriefing(runs, latest) {
  const historicalFtpAuth = [];
  const historicalFtpListing = [];
  const historicalRequireEsm = [];
  const historicalOperational = [];
  const intentionalSafetyBlocks = [];
  const genuineFailures = [];

  for (const r of runs || []) {
    const msgs = [...(r.errors || []), ...(r.warnings || [])].map(String);
    const classified = classifySyncMessages(msgs);
    const intentional =
      Boolean(r.intentionalSafetyBlock) ||
      Boolean(r.ingestBlocked) ||
      r.failureKind === "safety_block" ||
      classified.kind === "safety_block";

    if (intentional) {
      intentionalSafetyBlocks.push(r);
      continue;
    }
    if (classified.ftpAuthErrors.length) {
      historicalFtpAuth.push(...classified.ftpAuthErrors);
      genuineFailures.push(r);
    } else if (classified.ftpListingErrors.length) {
      historicalFtpListing.push(...classified.ftpListingErrors);
      genuineFailures.push(r);
    } else if (classified.requireEsmErrors.length) {
      historicalRequireEsm.push(...classified.requireEsmErrors);
      genuineFailures.push(r);
    } else if (r.status === "failure" || (r.status === "warning" && classified.otherErrors.length)) {
      historicalOperational.push(...classified.otherErrors);
      genuineFailures.push(r);
    }
  }

  const latestDesc = describeLatestSyncRun(latest);
  const currentFtpAuth = latestDesc.intentionalBlock
    ? "pass (latest controlled test authenticated; ingest then blocked by safety controls)"
    : latestDesc.ftpAuthOk === true
      ? "pass"
      : latestDesc.ftpAuthOk === false
        ? "fail"
        : historicalFtpAuth.length
          ? "unknown (historical FTP auth failures in period; latest run inconclusive)"
          : "unknown";

  return {
    intentionalSafetyBlockCount: intentionalSafetyBlocks.length,
    genuineFailureCount: genuineFailures.length,
    historicalFtpAuthNotes: [...new Set(historicalFtpAuth)].slice(0, 6),
    historicalFtpListingNotes: [...new Set(historicalFtpListing)].slice(0, 6),
    historicalRequireEsmNotes: [...new Set(historicalRequireEsm)].slice(0, 4),
    historicalOperationalNotes: [...new Set(historicalOperational)].slice(0, 6),
    latestLabel: latestDesc.label,
    latestKind: latestDesc.kind,
    latestIntentionalBlock: latestDesc.intentionalBlock,
    latestFinishedAt: latest?.finishedAt ? String(latest.finishedAt) : null,
    latestGithubRunUrl: latest?.githubRunUrl ? String(latest.githubRunUrl) : null,
    currentFtpAuthStatus: currentFtpAuth,
    remaining530InLatest: Boolean(
      [...(latest?.errors || []), ...(latest?.warnings || [])].some((m) => /530/.test(String(m)))
    ),
    requireEsmFixedInLatest: !Boolean(
      [...(latest?.errors || []), ...(latest?.warnings || [])].some((m) =>
        /require is not defined|ERR_REQUIRE_ESM/i.test(String(m))
      )
    ),
    suggestedNextStep:
      latestDesc.intentionalBlock || latestDesc.kind === "none"
        ? "Next safe step: stage-only dry run with FEED_STAGE_DRY_RUN=1 (do not re-enable nightly live ingest)."
        : String(latest?.suggestedNextStep || "Inspect HQ Operations / Actions logs."),
  };
}

module.exports = {
  classifySyncMessages,
  describeLatestSyncRun,
  summarizeCatalogOpsForBriefing,
  isSafetyBlockMessage,
  isFtpAuthMessage,
  isFtpListingMessage,
};
