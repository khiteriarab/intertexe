import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchHqDppPage, formatCount } from "../../../../lib/dashboard/metrics";
import { HqCard, HqEmptyState, HqMetricGrid, HqPageHeader } from "../../components/HqUi";

export const metadata = { title: "Digital Product Passport" };
export const dynamic = "force-dynamic";

export default async function HqDppPage() {
  await requireHqSession();
  const d = await fetchHqDppPage();

  return (
    <div>
      <HqPageHeader
        title="Digital Product Passport"
        description="Enterprise compliance layer for EU textile DPP — composition, origin, care, readiness."
      />

      <HqMetricGrid
        items={[
          { label: "Approved products", value: formatCount(d.approved) },
          {
            label: "DPP ready",
            value: formatCount(d.dppReady),
            hint: d.dppReadyPct != null ? `${d.dppReadyPct}%` : undefined,
          },
          {
            label: "Has composition",
            value: formatCount(d.withComposition),
            hint: d.compositionPct != null ? `${d.compositionPct}%` : undefined,
          },
          {
            label: "Has country of origin",
            value: formatCount(d.withOrigin),
            hint: d.originPct != null ? `${d.originPct}%` : undefined,
          },
        ]}
      />

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <HqCard title="Coverage">
          <ul className="space-y-2 text-sm text-black/70">
            <li className="flex justify-between gap-3">
              <span>Care instructions</span>
              <span className="tabular-nums">
                {formatCount(d.withCare)}
                {d.carePct != null ? ` · ${d.carePct}%` : ""}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Composition</span>
              <span className="tabular-nums">
                {formatCount(d.withComposition)}
                {d.compositionPct != null ? ` · ${d.compositionPct}%` : ""}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Origin</span>
              <span className="tabular-nums">
                {formatCount(d.withOrigin)}
                {d.originPct != null ? ` · ${d.originPct}%` : ""}
              </span>
            </li>
          </ul>
        </HqCard>
        <HqCard title="Enterprise path">
          <p className="text-sm text-black/60 leading-relaxed">
            This module is the public Platform story’s internal twin: help US brands selling into the EU generate
            DPP-ready material records from verified composition data — not marketing copy.
          </p>
          {d.error ? <p className="text-xs text-red-700 mt-3">{d.error}</p> : null}
        </HqCard>
      </div>

      {d.approved == null ? (
        <div className="mt-6">
          <HqEmptyState
            title="DPP counts unavailable"
            body="Products table query failed or timed out. Retry when Supabase is healthy."
          />
        </div>
      ) : null}
    </div>
  );
}
