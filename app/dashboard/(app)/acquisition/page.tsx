import Link from "next/link";
import { requireHqSession } from "../../../../lib/dashboard/auth";
import {
  fetchHqAcquisitionReport,
  type AcquisitionBucket,
} from "../../../../lib/dashboard/acquisition";
import { fetchGoogleDiscoveryMetrics } from "../../../../lib/dashboard/integration-metrics";
import { formatCount } from "../../../../lib/dashboard/metrics";
import { HqCard, HqEmptyState, HqMetricGrid, HqPageHeader } from "../../components/HqUi";

export const metadata = { title: "Acquisition" };
export const dynamic = "force-dynamic";

function money(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function days(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toFixed(1)}d`;
}

function ReportTable({
  title,
  rows,
  emptyHint,
}: {
  title: string;
  rows: AcquisitionBucket[];
  emptyHint: string;
}) {
  if (!rows.length) {
    return (
      <HqCard title={title}>
        <p className="text-sm text-black/50">{emptyHint}</p>
      </HqCard>
    );
  }
  return (
    <HqCard title={title}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-black/40">
            <tr>
              <th className="py-2 pr-3 font-medium">Dimension</th>
              <th className="py-2 pr-3 font-medium">Customers</th>
              <th className="py-2 pr-3 font-medium">Purchasers</th>
              <th className="py-2 pr-3 font-medium">Revenue</th>
              <th className="py-2 pr-3 font-medium">Commission</th>
              <th className="py-2 pr-3 font-medium">Avg order</th>
              <th className="py-2 pr-3 font-medium">CLV</th>
              <th className="py-2 pr-3 font-medium">Reg→buy</th>
              <th className="py-2 pr-3 font-medium">Scans/buy</th>
              <th className="py-2 font-medium">Favs/buy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-black/5">
                <td className="py-2 pr-3 max-w-[200px] truncate" title={row.label}>
                  {row.label}
                </td>
                <td className="py-2 pr-3 tabular-nums">{formatCount(row.customers)}</td>
                <td className="py-2 pr-3 tabular-nums">{formatCount(row.purchasers)}</td>
                <td className="py-2 pr-3 tabular-nums">{money(row.sales)}</td>
                <td className="py-2 pr-3 tabular-nums">{money(row.commission)}</td>
                <td className="py-2 pr-3 tabular-nums">{money(row.avgOrder)}</td>
                <td className="py-2 pr-3 tabular-nums">{money(row.lifetimeValue)}</td>
                <td className="py-2 pr-3 tabular-nums">{days(row.avgDaysToPurchase)}</td>
                <td className="py-2 pr-3 tabular-nums">
                  {row.avgScansBeforePurchase == null ? "—" : row.avgScansBeforePurchase.toFixed(1)}
                </td>
                <td className="py-2 tabular-nums">
                  {row.avgFavoritesBeforePurchase == null
                    ? "—"
                    : row.avgFavoritesBeforePurchase.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HqCard>
  );
}

export default async function HqAcquisitionPage() {
  const session = await requireHqSession();
  const [report, google] = await Promise.all([
    fetchHqAcquisitionReport(),
    fetchGoogleDiscoveryMetrics(session.workspaceId),
  ]);

  return (
    <div>
      <HqPageHeader
        title="Acquisition"
        description="How are people discovering INTERTEXE? Website and Search Console answer demand; first-touch tables answer which channels become customers and revenue."
        action={
          <Link
            href="/dashboard/consumers"
            className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white"
          >
            Consumers
          </Link>
        }
      />

      <HqCard className="mb-6" title="Web discovery (Google)">
        {google.connected ? (
          <>
            <HqMetricGrid
              items={[
                {
                  label: "Sessions (7d)",
                  value: formatCount(google.ga4Sessions7d),
                  hint: "GA4",
                },
                {
                  label: "Users (7d)",
                  value: formatCount(google.ga4Users7d),
                  hint: "GA4",
                },
                {
                  label: "Organic clicks (7d)",
                  value: formatCount(google.gscClicks7d),
                  hint: "Search Console",
                },
                {
                  label: "Organic impressions (7d)",
                  value: formatCount(google.gscImpressions7d),
                  hint: "Search Console",
                },
              ]}
            />
            <div className="mt-5 grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">
                  Top search queries
                </p>
                {google.gscTopQueries.length ? (
                  <ul className="space-y-2 text-sm">
                    {google.gscTopQueries.map((q, i) => (
                      <li key={`${q.query || "q"}-${i}`} className="flex justify-between gap-3">
                        <span className="truncate">{q.query || "—"}</span>
                        <span className="tabular-nums text-black/50 shrink-0">
                          {formatCount(q.clicks ?? null)} clicks
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-black/50">No query rows in the latest sync yet.</p>
                )}
              </div>
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">
                  Why this matters
                </p>
                <p className="text-sm text-black/60 leading-relaxed">
                  Sessions and organic search are top-of-funnel for the public site. Compare them to
                  registrations and first scans on Today — rising web demand with flat scans means
                  discovery is not converting into product behavior.
                </p>
                <p className="text-[11px] text-black/40 mt-3">
                  Synced {google.syncedAt ? new Date(google.syncedAt).toLocaleString() : "—"}
                  {google.lastSyncStatus ? ` · ${google.lastSyncStatus}` : ""}
                  {" · "}
                  <Link href="/dashboard/settings" className="underline underline-offset-2">
                    Manage connection
                  </Link>
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-black/60 leading-relaxed">
            <p>
              Google is not connected, so web discovery is dark. Connect once in Settings — this page
              will show sessions, users, organic clicks, impressions, and top queries automatically.
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-block mt-4 text-xs tracking-widest uppercase underline underline-offset-4"
            >
              Open Settings → Integrations
            </Link>
          </div>
        )}
      </HqCard>

      {report.error ? <HqEmptyState title="Could not load acquisition" body={report.error} /> : null}

      <p className="text-[10px] tracking-[0.18em] uppercase text-black/40 mb-3">
        First-touch → customers & revenue
      </p>
      <HqMetricGrid
        items={[
          { label: "Customers", value: formatCount(report.totals.customers) },
          {
            label: "With attribution",
            value: formatCount(report.totals.withAttribution),
            hint: `${formatCount(report.totals.unknown)} Unknown`,
          },
          {
            label: "Attributed revenue",
            value: money(report.totals.sales),
            hint: `${formatCount(report.totals.purchasers)} purchasers`,
          },
          {
            label: "Commission",
            value: money(report.totals.commission),
          },
        ]}
      />

      <div className="mt-6 space-y-4">
        <ReportTable
          title="Revenue by acquisition source"
          rows={report.bySource}
          emptyHint="No customer preference rows yet."
        />
        <ReportTable
          title="Revenue by campaign"
          rows={report.byCampaign}
          emptyHint="No campaign UTMs stored yet — new signups will populate this."
        />
        <ReportTable
          title="Revenue by landing page"
          rows={report.byLandingPage}
          emptyHint="No first landing pages captured yet."
        />
        <ReportTable
          title="Revenue by influencer (utm_content)"
          rows={report.byInfluencer}
          emptyHint="No influencer content tags yet. Pass utm_content on campaign links."
        />
        <ReportTable
          title="Revenue by QR code"
          rows={report.byQrCode}
          emptyHint="No QR codes in attribution_extra yet. iOS/web can store qr_code_id without a schema change."
        />
      </div>
    </div>
  );
}
