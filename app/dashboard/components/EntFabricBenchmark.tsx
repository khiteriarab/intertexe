"use client";

import Link from "next/link";
import type { PeerComparisonRow } from "../../../lib/enterprise/composition-benchmark";
import type { FiberShareRow } from "../../../lib/enterprise/composition-benchmark";
import { EntStackedBarChart } from "./EnterpriseCharts";

export function EntFabricPeerComparison({
  fiberRows,
  peerRows,
  market,
  base,
}: {
  fiberRows: FiberShareRow[];
  peerRows: PeerComparisonRow[];
  market: string;
  base: string;
}) {
  const visiblePeers = peerRows.filter((row) => row.status !== "no_catalog");
  const governedPeers = visiblePeers.filter((row) => row.status === "ok");
  const naturalRow = visiblePeers.find((row) => row.metricKey === "natural_fiber_share");
  const syntheticRow = visiblePeers.find((row) => row.metricKey === "synthetic_share");

  return (
    <section className="mb-10">
      <div className="ent-benchmark-page-hero mb-8">
        <p className="ent-section-eyebrow text-white/50">Benchmarking</p>
        <h2 className="ent-benchmark-teaser-title">Material intelligence vs governed peers</h2>
        <p className="text-sm text-white/70 mt-3 max-w-2xl leading-relaxed">
          Understand what your products are made from, how complete your material data is, and how you compare to
          approved aggregate benchmarks. INTERTEXE only surfaces peer medians from governed datasets — never fabricated
          competitor catalogs.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mt-8 max-w-xl">
          <div className="ent-benchmark-stat">
            <p className="ent-benchmark-stat-value">{naturalRow?.yours ?? "—"}%</p>
            <p className="ent-benchmark-stat-label">Your natural fiber share</p>
            {naturalRow?.peerMedian != null ? (
              <p className="text-xs text-white/45 mt-1">Peer median {naturalRow.peerMedian}%</p>
            ) : null}
          </div>
          <div className="ent-benchmark-stat">
            <p className="ent-benchmark-stat-value">{syntheticRow?.yours ?? "—"}%</p>
            <p className="ent-benchmark-stat-label">Your synthetic share</p>
            {syntheticRow?.peerMedian != null ? (
              <p className="text-xs text-white/45 mt-1">Peer median {syntheticRow.peerMedian}%</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="ent-widget-card ent-widget-card-elevated p-6 md:p-8">
          <p className="ent-section-eyebrow">Your catalog</p>
          <h3 className="ent-widget-title">Fiber distribution</h3>
          {fiberRows.length ? (
            <>
              <div className="mt-6">
                <EntStackedBarChart
                  rows={fiberRows.map((row) => ({
                    label: row.label,
                    value: row.sharePct,
                    color: row.color,
                  }))}
                  tall
                />
              </div>
              <ul className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {fiberRows.slice(0, 10).map((row) => (
                  <li key={row.fiberCode} className="flex items-center justify-between text-sm gap-4">
                    <span className="flex items-center gap-2 text-[var(--ent-ink-soft)] min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                      <span className="truncate">{row.label}</span>
                    </span>
                    <span className="ent-display text-base tabular-nums shrink-0">{row.sharePct}%</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-[var(--ent-muted)] mt-6">
              No parsed composition data yet. Import products with composition fields to unlock fiber analytics.
            </p>
          )}
        </div>

        <div className="ent-widget-card ent-widget-card-elevated p-6 md:p-8">
          <p className="ent-section-eyebrow">Governed peers · {market.replaceAll("_", " ")}</p>
          <h3 className="ent-widget-title">Your brand vs peer median</h3>
          <div className="mt-6 overflow-x-auto">
            <table className="ent-benchmark-table w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>You</th>
                  <th>Peer median</th>
                  <th>Δ</th>
                </tr>
              </thead>
              <tbody>
                {visiblePeers.map((row) => (
                  <tr key={row.metricKey}>
                    <td className="text-[var(--ent-ink-soft)]">{row.label}</td>
                    <td className="font-semibold tabular-nums">{row.yours != null ? `${row.yours}%` : "—"}</td>
                    <td className="tabular-nums text-[var(--ent-muted)]">
                      {row.peerMedian != null ? `${row.peerMedian}%` : "—"}
                    </td>
                    <td className="tabular-nums">
                      {row.delta != null ? (
                        <span className={row.delta >= 0 ? "text-[var(--ent-forest)]" : "text-[var(--ent-raspberry)]"}>
                          {row.delta > 0 ? "+" : ""}
                          {row.delta}%
                        </span>
                      ) : (
                        <span className="text-[var(--ent-muted-light)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visiblePeers.some((row) => row.status === "insufficient") ? (
            <p className="text-xs text-[var(--ent-muted-light)] mt-4 leading-relaxed">
              Metrics marked without a peer median are still below the governed sample threshold. They appear
              automatically when approved datasets are published for your plan.
            </p>
          ) : null}
          {governedPeers[0]?.methodology ? (
            <p className="text-[11px] text-[var(--ent-muted-light)] mt-3">Methodology: {governedPeers[0].methodology}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-6">
        <Link href={`${base}/products`} className="ent-link-subtle">
          Review catalog composition →
        </Link>
        <Link href={`${base}/workflows`} className="ent-link-subtle">
          Assign workflow owners →
        </Link>
      </div>
    </section>
  );
}
