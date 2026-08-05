import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import { fetchHqOverviewMetrics, fetchHqCommercePage } from "../../../../lib/dashboard/metrics";
import {
  loadNightlySyncOps,
  saveFounderReport,
  sendOpsAlertEmail,
  summarizeCatalogOpsForBriefing,
} from "../../../../lib/feed-sync/ops-monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function loadAcquisitionSafe() {
  try {
    const mod = await import("../../../../lib/dashboard/acquisition");
    return await mod.fetchHqAcquisitionReport();
  } catch {
    return {
      bySource: [] as Array<{
        key: string;
        label: string;
        customers: number;
        purchasers?: number;
        sales: number;
        commission: number;
      }>,
      byCampaign: [] as Array<{
        key: string;
        label: string;
        customers: number;
        sales: number;
        commission: number;
      }>,
      totals: { unknown: null as number | null },
    };
  }
}

/**
 * Monday founder operations summary → info@intertexe.com + HQ Founder Reports.
 * Secure with Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const { data: workspace } = await supabase
    .from("hq_workspaces")
    .select("id, name, slug")
    .eq("slug", "intertexe")
    .maybeSingle();
  if (!workspace) return NextResponse.json({ message: "Workspace missing" }, { status: 404 });

  const weekEnd = new Date();
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStartIso = weekStart.toISOString();

  const [metrics, commerce, acquisition, syncOps, regs7d, topProducts] = await Promise.all([
    fetchHqOverviewMetrics(),
    fetchHqCommercePage(workspace.id),
    loadAcquisitionSafe(),
    loadNightlySyncOps(supabase),
    (async () => {
      try {
        const { count } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .gte("created_at", weekStartIso);
        return count ?? null;
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        const { data } = await supabase
          .from("hq_affiliate_transactions")
          .select("product_name, sku, sales_amount, quantity")
          .eq("workspace_id", workspace.id)
          .gte("transaction_date", weekStartIso)
          .order("sales_amount", { ascending: false })
          .limit(40);
        if (!Array.isArray(data)) return [] as Array<{ name: string; sales: number }>;
        const byName = new Map<string, number>();
        for (const row of data) {
          const name = String(row.product_name || row.sku || "Unknown").trim();
          byName.set(name, (byName.get(name) || 0) + Number(row.sales_amount || 0));
        }
        return [...byName.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, sales]) => ({ name, sales }));
      } catch {
        return [] as Array<{ name: string; sales: number }>;
      }
    })(),
  ]);

  const runs = (syncOps.runs || []).filter((r) => {
    const t = r.finishedAt ? Date.parse(String(r.finishedAt)) : 0;
    return t >= weekStart.getTime();
  });
  const successRuns = runs.filter((r) => r.status === "success");
  const catalogOps = summarizeCatalogOpsForBriefing(
    runs as Array<Record<string, unknown>>,
    (syncOps.latest || null) as Record<string, unknown> | null
  );
  const genuineFailedCount = catalogOps.genuineFailureCount;
  const sum = (key: string) =>
    runs.reduce((acc, r) => acc + Number((r as Record<string, unknown>)[key] || 0), 0);

  const warnings: string[] = [];
  if (genuineFailedCount) {
    warnings.push(
      `${genuineFailedCount} genuine catalog sync failure(s) in the last 7 days (excludes intentional safety blocks)`
    );
  }
  if (catalogOps.intentionalSafetyBlockCount) {
    warnings.push(
      `${catalogOps.intentionalSafetyBlockCount} run(s) blocked intentionally by catalog safety controls (not FTP credential failures)`
    );
  }
  if (!commerce.revenueConnected || commerce.revenueIsDemo) {
    warnings.push("Verified affiliate revenue is not fully connected (demo or missing)");
  }
  if ((commerce.unmatchedTx30d || 0) > 0) {
    warnings.push(`${commerce.unmatchedTx30d} unmatched affiliate transactions (30d)`);
  }
  if ((acquisition.totals?.unknown || 0) > 0) {
    warnings.push(`${acquisition.totals.unknown} consumers with unknown first-touch attribution`);
  }
  const latest = syncOps.latest;
  if (catalogOps.latestIntentionalBlock) {
    warnings.push(
      "Latest controlled test: FTP credentials OK; ingest blocked intentionally by stage-only / kill-switch safety (not an FTP failure)"
    );
  } else if (latest?.status === "failure") {
    warnings.push(`Latest sync status: ${latest.status} (${catalogOps.latestLabel})`);
  } else if (latest?.status === "warning" && !catalogOps.latestIntentionalBlock) {
    warnings.push(`Latest sync status: ${latest.status}`);
  }
  const latestStale = Array.isArray(latest?.affectedMerchants)
    ? (latest.affectedMerchants as string[])
    : Array.isArray(latest?.staleMerchants)
      ? (latest.staleMerchants as string[])
      : [];
  if (latestStale.length) {
    warnings.push(`Stale merchant feeds: ${latestStale.slice(0, 8).join(", ")}`);
  }
  if (latest?.emailError) {
    warnings.push(`Ops alert email delivery previously failed (see HQ Operations; credentials not logged)`);
  }

  const historicalFeedNotes = [
    ...catalogOps.historicalFtpAuthNotes.map((n) => `[historical FTP auth] ${n}`),
    ...catalogOps.historicalFtpListingNotes.map((n) => `[historical FTP listing] ${n}`),
    ...catalogOps.historicalRequireEsmNotes.map((n) => `[historical require/ESM] ${n}`),
    ...catalogOps.historicalOperationalNotes.map((n) => `[historical ops] ${n}`),
    ...latestStale.map((m) => `stale MID ${m}`),
  ].slice(0, 12);

  const catalog = {
    successfulSyncs: successRuns.length,
    failedOrWarningSyncs: genuineFailedCount,
    intentionalSafetyBlocks: catalogOps.intentionalSafetyBlockCount,
    newProducts: sum("inserted"),
    updatedProducts: sum("updated"),
    rejectedProducts: sum("rejected"),
    designersSynced: sum("designersSynced"),
    filesProcessed: sum("filesProcessed"),
    newMerchants: "n/a (auto-discovered MIDs; see Actions logs)",
    staleOrFailingFeeds: historicalFeedNotes,
    currentFtpAuthStatus: catalogOps.currentFtpAuthStatus,
    latestControlledTest: catalogOps.latestLabel,
    latestControlledTestAt: catalogOps.latestFinishedAt,
    latestControlledTestUrl: catalogOps.latestGithubRunUrl,
    remaining530InLatest: catalogOps.remaining530InLatest,
    requireEsmIssuePresentInLatest: !catalogOps.requireEsmFixedInLatest,
    suggestedNextStep: catalogOps.suggestedNextStep,
  };

  const commerceBlock = {
    affiliateOrders: commerce.transactions7d ?? null,
    grossSales: commerce.sales7d ?? null,
    commission: commerce.commission7d ?? null,
    topRetailers: (commerce.topRevenueAdvertisers || []).slice(0, 5),
    topPurchasedProducts: topProducts,
    revenueConnected: Boolean(commerce.revenueConnected && !commerce.revenueIsDemo),
  };

  const consumers = {
    registrations: regs7d,
    knownConsumers: metrics.usersTotal.value,
    activeUsersHint: metrics.scansLast7d.value,
    scans7d: metrics.scansLast7d.value,
    favorites: metrics.favoritesTotal.value,
    affiliateClickouts7d:
      (metrics.clickoutsLast7d.value || 0) +
      (metrics.scannerClickoutsLast7d.value || 0) +
      (metrics.editorialClickoutsLast7d.value || 0),
  };

  const acquisitionBlock = {
    topSources: (acquisition.bySource || []).slice(0, 5).map((b) => ({
      label: b.label,
      customers: b.customers,
      sales: b.sales,
      commission: b.commission,
    })),
    topCampaigns: (acquisition.byCampaign || []).slice(0, 5).map((b) => ({
      label: b.label,
      customers: b.customers,
      sales: b.sales,
      commission: b.commission,
    })),
    attributableRevenue: (acquisition.bySource || [])
      .filter((b) => b.key !== "unknown")
      .reduce((a, b) => a + Number(b.sales || 0), 0),
    unknownAttributionCustomers: acquisition.totals?.unknown ?? null,
    unknownAttributionPurchasers: (acquisition.bySource || []).find((b) => b.key === "unknown")
      ?.purchasers,
  };

  const report = {
    id: `founder_${weekStart.toISOString().slice(0, 10)}`,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    generatedAt: new Date().toISOString(),
    subject: "INTERTEXE weekly founder operations summary",
    catalog,
    commerce: commerceBlock,
    consumers,
    acquisition: acquisitionBlock,
    warnings,
    emailSent: false,
    emailError: null as string | null,
  };

  const text = [
    "INTERTEXE — Weekly founder operations summary",
    `Period (UTC): ${weekStart.toISOString().slice(0, 10)} → ${weekEnd.toISOString().slice(0, 10)}`,
    "",
    "CATALOG",
    `  Successful syncs: ${catalog.successfulSyncs}`,
    `  Genuine failed/warning syncs: ${catalog.failedOrWarningSyncs}`,
    `  Intentional safety blocks (not FTP failures): ${catalog.intentionalSafetyBlocks}`,
    `  New products: ${catalog.newProducts}`,
    `  Updated products: ${catalog.updatedProducts}`,
    `  Rejected products: ${catalog.rejectedProducts}`,
    `  Designers synced: ${catalog.designersSynced}`,
    `  Files processed: ${catalog.filesProcessed}`,
    "",
    "CATALOG — CURRENT CREDENTIAL STATUS",
    `  Current FTP authentication: ${catalog.currentFtpAuthStatus}`,
    `  Remaining 530 in latest run: ${catalog.remaining530InLatest ? "yes" : "no"}`,
    `  require is not defined in latest run: ${catalog.requireEsmIssuePresentInLatest ? "yes (still present)" : "no (fixed)"}`,
    "",
    "CATALOG — LATEST CONTROLLED TEST",
    `  Result: ${catalog.latestControlledTest}`,
    `  Finished (UTC): ${catalog.latestControlledTestAt || "—"}`,
    catalog.latestControlledTestUrl
      ? `  Actions run: ${catalog.latestControlledTestUrl}`
      : null,
    `  Suggested next step: ${catalog.suggestedNextStep}`,
    "",
    "CATALOG — HISTORICAL FAILURES IN PERIOD",
    `  Notes: ${
      catalog.staleOrFailingFeeds.length
        ? catalog.staleOrFailingFeeds.join("; ")
        : "none (or only intentional safety blocks)"
    }`,
    "",
    "COMMERCE",
    `  Affiliate orders (7d): ${commerceBlock.affiliateOrders ?? "—"}`,
    `  Gross sales (7d): ${commerceBlock.grossSales ?? "—"}`,
    `  Commission (7d): ${commerceBlock.commission ?? "—"}`,
    `  Top retailers: ${
      (commerceBlock.topRetailers || [])
        .map((r: { brand?: string }) => r.brand || "—")
        .join(", ") || "—"
    }`,
    `  Top products: ${
      (commerceBlock.topPurchasedProducts || []).map((p) => p.name).join(", ") || "—"
    }`,
    `  Revenue connected: ${commerceBlock.revenueConnected ? "yes" : "no"}`,
    "",
    "CONSUMERS",
    `  Registrations (7d): ${consumers.registrations ?? "—"}`,
    `  Known consumers: ${consumers.knownConsumers ?? "—"}`,
    `  Scans (7d): ${consumers.scans7d ?? "—"}`,
    `  Favorites: ${consumers.favorites ?? "—"}`,
    `  Affiliate clickouts (7d): ${consumers.affiliateClickouts7d ?? "—"}`,
    "",
    "ACQUISITION",
    `  Attributable sales (sources excl. unknown): ${acquisitionBlock.attributableRevenue}`,
    `  Unknown-attribution customers: ${acquisitionBlock.unknownAttributionCustomers ?? "—"}`,
    `  Top sources: ${
      (acquisitionBlock.topSources || [])
        .map((s) => `${s.label} (${s.customers})`)
        .join(", ") || "—"
    }`,
    `  Top campaigns: ${
      (acquisitionBlock.topCampaigns || [])
        .map((c) => `${c.label} (${c.customers})`)
        .join(", ") || "—"
    }`,
    "",
    "WARNINGS",
    ...(warnings.length ? warnings.map((w) => `  - ${w}`) : ["  - none"]),
    "",
    "Open HQ: https://www.intertexe.com/dashboard/operations",
  ]
    .filter((x) => x != null)
    .join("\n");

  const html = `<div style="font-family:Georgia,serif;max-width:640px;margin:0 auto;color:#1a1a1a">
  <p style="letter-spacing:0.18em;font-size:11px;text-transform:uppercase;color:#888">INTERTEXE Founder</p>
  <h1 style="font-weight:500;font-size:26px">Weekly operations summary</h1>
  <pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:13px;line-height:1.45;background:#f7f7f5;padding:16px;border-radius:8px">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</pre>
  <p style="margin-top:20px"><a href="https://www.intertexe.com/dashboard/operations">Open INTERTEXE HQ Operations →</a></p>
</div>`;

  const sent = await sendOpsAlertEmail({
    subject: report.subject,
    text,
    html,
  });
  report.emailSent = sent.ok;
  report.emailError = sent.error;

  try {
    await saveFounderReport(supabase, report);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        emailSent: sent.ok,
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    emailSent: sent.ok,
    emailError: sent.error,
    reportId: report.id,
    warnings,
  });
}
