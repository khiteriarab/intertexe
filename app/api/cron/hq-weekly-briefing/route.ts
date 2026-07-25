import { NextRequest, NextResponse } from "next/server";
import { createRequire } from "module";
import path from "path";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import { fetchHqOverviewMetrics, fetchHqCommercePage } from "../../../../lib/dashboard/metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const require = createRequire(path.join(process.cwd(), "package.json"));
const {
  loadNightlySyncOps,
  saveFounderReport,
  sendOpsAlertEmail,
} = require("./lib/feed-sync/ops-monitor.cjs") as {
  loadNightlySyncOps: (sb: unknown) => Promise<{
    latest: Record<string, unknown> | null;
    runs: Array<Record<string, unknown>>;
  }>;
  saveFounderReport: (sb: unknown, report: Record<string, unknown>) => Promise<unknown>;
  sendOpsAlertEmail: (args: {
    subject: string;
    text: string;
    html: string;
  }) => Promise<{ ok: boolean; error: string | null }>;
};

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

  const [metrics, commerce, acquisition, syncOps] = await Promise.all([
    fetchHqOverviewMetrics(),
    fetchHqCommercePage(workspace.id),
    loadAcquisitionSafe(),
    loadNightlySyncOps(supabase),
  ]);

  const runs = (syncOps.runs || []).filter((r) => {
    const t = r.finishedAt ? Date.parse(String(r.finishedAt)) : 0;
    return t >= weekStart.getTime();
  });
  const successRuns = runs.filter((r) => r.status === "success");
  const failedRuns = runs.filter((r) => r.status === "failure" || r.status === "warning");
  const sum = (key: string) =>
    runs.reduce((acc, r) => acc + Number((r as Record<string, unknown>)[key] || 0), 0);

  const warnings: string[] = [];
  if (failedRuns.length) {
    warnings.push(`${failedRuns.length} catalog sync run(s) needed attention in the last 7 days`);
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
  if (latest?.status === "failure" || latest?.status === "warning") {
    warnings.push(`Latest nightly sync status: ${latest.status}`);
  }

  const catalog = {
    successfulSyncs: successRuns.length,
    failedOrWarningSyncs: failedRuns.length,
    newProducts: sum("inserted"),
    updatedProducts: sum("updated"),
    rejectedProducts: sum("rejected"),
    designersSynced: sum("designersSynced"),
    filesProcessed: sum("filesProcessed"),
    newMerchants: "n/a (auto-discovered MIDs; see Actions logs)",
    staleOrFailingFeeds: failedRuns
      .flatMap((r) => (Array.isArray(r.errors) ? r.errors : []))
      .slice(0, 8),
  };

  const commerceBlock = {
    affiliateOrders: commerce.transactions7d ?? null,
    grossSales: commerce.sales7d ?? null,
    commission: commerce.commission7d ?? null,
    topRetailers: (commerce.topRevenueAdvertisers || []).slice(0, 5),
    topPurchasedProducts: [] as Array<{ name: string }>,
    revenueConnected: Boolean(commerce.revenueConnected && !commerce.revenueIsDemo),
  };

  const consumers = {
    registrations: metrics.usersToday.value,
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
    `  Failed/warning syncs: ${catalog.failedOrWarningSyncs}`,
    `  New products: ${catalog.newProducts}`,
    `  Updated products: ${catalog.updatedProducts}`,
    `  Rejected products: ${catalog.rejectedProducts}`,
    `  Designers synced: ${catalog.designersSynced}`,
    `  Files processed: ${catalog.filesProcessed}`,
    "",
    "COMMERCE",
    `  Gross sales (7d): ${commerceBlock.grossSales ?? "—"}`,
    `  Commission (7d): ${commerceBlock.commission ?? "—"}`,
    `  Revenue connected: ${commerceBlock.revenueConnected ? "yes" : "no"}`,
    "",
    "CONSUMERS",
    `  Known consumers: ${consumers.knownConsumers ?? "—"}`,
    `  Scans (7d): ${consumers.scans7d ?? "—"}`,
    `  Favorites: ${consumers.favorites ?? "—"}`,
    `  Affiliate clickouts (7d): ${consumers.affiliateClickouts7d ?? "—"}`,
    "",
    "ACQUISITION",
    `  Attributable sales (sources excl. unknown): ${acquisitionBlock.attributableRevenue}`,
    `  Unknown-attribution customers: ${acquisitionBlock.unknownAttributionCustomers ?? "—"}`,
    `  Top sources: ${(acquisitionBlock.topSources || [])
      .map((s) => `${s.label} (${s.customers})`)
      .join(", ") || "—"}`,
    "",
    "WARNINGS",
    ...(warnings.length ? warnings.map((w) => `  - ${w}`) : ["  - none"]),
    "",
    "Open HQ: https://www.intertexe.com/dashboard/operations",
  ].join("\n");

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
