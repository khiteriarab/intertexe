import Link from "next/link";
import type {
  PaidAcquisitionReport,
  PaidPlatformSummary,
  TrackingComponentStatus,
} from "../../../lib/dashboard/paid-acquisition";
import { formatCount } from "../../../lib/dashboard/metrics";
import { HqCard, HqMetricGrid } from "./HqUi";

function money(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function statusLabel(s: TrackingComponentStatus) {
  switch (s) {
    case "WORKING":
      return "Working";
    case "PARTIAL":
      return "Partial";
    case "NOT_IMPLEMENTED":
      return "Not implemented";
    case "NEEDS_EXTERNAL_CONFIG":
      return "Needs external config";
    default:
      return s;
  }
}

function PlatformToday({ summary }: { summary: PaidPlatformSummary }) {
  return (
    <div className="border border-black/10 rounded-lg p-4">
      <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-3">{summary.label}</p>
      <HqMetricGrid
        items={[
          { label: "Spend", value: money(summary.spend), hint: "From ad platform — not wired" },
          {
            label: "Attributed installs",
            value: summary.attributedInstalls == null ? "—" : formatCount(summary.attributedInstalls),
            hint: "Requires MMP / TikTok or Meta app events",
          },
          {
            label: "Accounts",
            value: formatCount(summary.accounts),
            hint: "First-party signup attribution",
          },
          {
            label: "Activated",
            value: formatCount(summary.activatedUsers),
            hint: "Users with ≥1 scan",
          },
          { label: "Affiliate clicks", value: formatCount(summary.affiliateClicks) },
          { label: "Revenue", value: money(summary.revenue) },
          { label: "ROAS", value: summary.roas == null ? "—" : summary.roas.toFixed(2) },
        ]}
      />
      <p className="text-[11px] text-black/45 mt-3 leading-relaxed">{summary.trackingNote}</p>
    </div>
  );
}

function TrackingMatrix({
  title,
  rows,
}: {
  title: string;
  rows: Record<string, TrackingComponentStatus>;
}) {
  const keys = ["click", "install", "account", "scan", "save", "affiliate_click", "purchase"];
  return (
    <div>
      <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {keys.map((k) => (
          <span
            key={k}
            className="text-[10px] px-2 py-1 rounded border border-black/10 text-black/60"
            title={statusLabel(rows[k] || "NOT_IMPLEMENTED")}
          >
            {k.replace(/_/g, " ")}: {statusLabel(rows[k] || "NOT_IMPLEMENTED")}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PaidAcquisitionSection({
  report,
  compact = false,
}: {
  report: PaidAcquisitionReport;
  compact?: boolean;
}) {
  const paidRows = [
    ["Spend", money(report.today.meta.spend), money(report.today.tiktok.spend)],
    ["Impressions", "—", "—"],
    ["Clicks", "—", "—"],
    ["App Store visits", "—", "—"],
    [
      "Attributed installs",
      report.today.meta.attributedInstalls == null ? "—" : formatCount(report.today.meta.attributedInstalls),
      report.today.tiktok.attributedInstalls == null ? "—" : formatCount(report.today.tiktok.attributedInstalls),
    ],
    ["Accounts", formatCount(report.today.meta.accounts), formatCount(report.today.tiktok.accounts)],
    ["Activated", formatCount(report.today.meta.activatedUsers), formatCount(report.today.tiktok.activatedUsers)],
    ["Cost / account", money(report.today.meta.costPerAccount), money(report.today.tiktok.costPerAccount)],
    ["Cost / activated", money(report.today.meta.costPerActivated), money(report.today.tiktok.costPerActivated)],
    ["Retailer clicks", formatCount(report.today.meta.affiliateClicks), formatCount(report.today.tiktok.affiliateClicks)],
    ["Commission", money(report.today.meta.commission), money(report.today.tiktok.commission)],
  ] as const;

  return (
    <HqCard className="mb-6" title="Paid acquisition">
      <p className="text-sm text-black/55 leading-relaxed mb-4">
        First-party funnel by channel.{" "}
        <strong className="font-medium text-black/70">
          Promote → App Store does not prove install attribution.
        </strong>{" "}
        Spend and platform-attributed installs require TikTok/Meta app events or an MMP.
      </p>

      {report.error ? (
        <p className="text-sm text-amber-900 mb-4">Could not load: {report.error}</p>
      ) : null}

      {compact ? (
        <>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3">Metric</th>
                  <th className="py-2 pr-3">Meta</th>
                  <th className="py-2">TikTok</th>
                </tr>
              </thead>
              <tbody>
                {paidRows.map(([label, meta, tiktok]) => (
                  <tr key={label} className="border-t border-black/5">
                    <td className="py-2 pr-3 text-black/55">{label}</td>
                    <td className="py-2 pr-3 tabular-nums">{meta}</td>
                    <td className="py-2 tabular-nums">{tiktok}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-black/40 mb-3 leading-relaxed">
            Spend, impressions, clicks, App Store visits, and attributed installs stay as — until Meta/TikTok ads
            APIs are connected. CPI is not inferred from Apple downloads.
          </p>
          <Link
            href="/dashboard/acquisition#paid-acquisition"
            className="text-[11px] tracking-widest uppercase underline underline-offset-4"
          >
            Full paid acquisition audit →
          </Link>
        </>
      ) : (
        <>
          <p className="text-[10px] tracking-[0.18em] uppercase text-black/40 mb-3">Today</p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <PlatformToday summary={report.today.tiktok} />
            <PlatformToday summary={report.today.meta} />
          </div>

          <p className="text-[10px] tracking-[0.18em] uppercase text-black/40 mb-3">
            By creative (first-party, trailing registrations)
          </p>
          {report.creatives.length ? (
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-black/40">
                  <tr>
                    <th className="py-2 pr-3">Platform</th>
                    <th className="py-2 pr-3">Campaign</th>
                    <th className="py-2 pr-3">Creative</th>
                    <th className="py-2 pr-3">Accounts</th>
                    <th className="py-2 pr-3">Activated</th>
                    <th className="py-2 pr-3">Clicks</th>
                    <th className="py-2 pr-3">Revenue</th>
                    <th className="py-2">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {report.creatives.map((row) => (
                    <tr key={`${row.platform}-${row.campaign}-${row.creative}`} className="border-t border-black/5">
                      <td className="py-2 pr-3 capitalize">{row.platform}</td>
                      <td className="py-2 pr-3 max-w-[140px] truncate" title={row.campaign}>
                        {row.campaign}
                      </td>
                      <td className="py-2 pr-3 max-w-[140px] truncate" title={row.creative}>
                        {row.creative}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{formatCount(row.accounts)}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatCount(row.activatedUsers)}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatCount(row.affiliateClicks)}</td>
                      <td className="py-2 pr-3 tabular-nums">{money(row.revenue)}</td>
                      <td className="py-2 tabular-nums">{money(row.spend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-black/50 mb-6">
              No TikTok/Meta first-touch rows yet. Use tagged smart links (
              <code className="text-xs">utm_campaign</code> + <code className="text-xs">utm_content</code> per
              creative) — direct App Store Promote URLs cannot distinguish Creative A vs B inside INTERTEXE.
            </p>
          )}

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <TrackingMatrix title="TikTok" rows={report.trackingStatus.tiktok} />
            <TrackingMatrix title="Meta" rows={report.trackingStatus.meta} />
            <TrackingMatrix title="INTERTEXE first-party" rows={report.trackingStatus.intertexe} />
          </div>

          <p className="text-[11px] text-black/40">
            To compare creative quality: tag each Promote destination with{" "}
            <code className="text-xs">https://www.intertexe.com/open?next=/scanner&amp;utm_source=tiktok&amp;utm_medium=paid&amp;utm_campaign=…&amp;utm_content=creative_a</code>{" "}
            (requires app install via Universal Link path).{" "}
            <Link href="/dashboard/campaigns" className="underline underline-offset-2">
              Campaign registry →
            </Link>
          </p>
        </>
      )}
    </HqCard>
  );
}
