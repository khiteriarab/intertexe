import Link from "next/link";
import { requireHqSession } from "../../../../lib/dashboard/auth";
import {
  fetchHqAcquisitionReport,
  type AcquisitionBucket,
} from "../../../../lib/dashboard/acquisition";
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
  await requireHqSession();
  const report = await fetchHqAcquisitionReport();

  return (
    <div>
      <HqPageHeader
        title="Acquisition"
        description="Revenue and behavior by immutable first-touch. Purchases join only when Rakuten u1 matches a Supabase user id. Missing first-touch = Unknown — never fabricated."
        action={
          <Link
            href="/dashboard/consumers"
            className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white"
          >
            Consumers
          </Link>
        }
      />

      {report.error ? <HqEmptyState title="Could not load acquisition" body={report.error} /> : null}

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
