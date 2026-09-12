"use client";

import Link from "next/link";
import {
  formatCompanyCount,
  formatCompanyMoney,
  paceColor,
  type KpiSnapshot,
  type RevenueStreamProgress,
} from "../../../lib/dashboard/company-plan";
import type { CompanyHqBundle } from "../../../lib/dashboard/company-hq";

export function NorthStarKpiCard({ kpi }: { kpi: KpiSnapshot }) {
  const accent = paceColor(kpi.pace);
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_8px_28px_rgba(26,31,34,0.04)]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[10px] tracking-[0.16em] uppercase text-black/40">{kpi.label}</p>
        <span
          className="text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-full"
          style={{ color: accent, background: `${accent}18` }}
        >
          {kpi.paceLabel}
        </span>
      </div>
      <p className="text-3xl font-light tabular-nums tracking-tight">
        {kpi.key === "revenue" ? formatCompanyMoney(kpi.current) : formatCompanyCount(kpi.current)}
      </p>
      <p className="text-sm text-black/50 mt-1 tabular-nums">
        Target{" "}
        {kpi.key === "revenue" ? formatCompanyMoney(kpi.target) : formatCompanyCount(kpi.target)}
        {kpi.stretch && kpi.key === "revenue" ? (
          <span className="text-black/35"> · stretch {formatCompanyMoney(kpi.stretch)}</span>
        ) : null}
      </p>
      <div className="h-2 rounded-full bg-[#E8E4DC] overflow-hidden mt-4 mb-3">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, kpi.progressPct)}%`, background: accent }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-black/45 tabular-nums">
        <span>{kpi.progressPct.toFixed(1)}% complete</span>
        <span className="text-right">
          Gap {kpi.key === "revenue" ? formatCompanyMoney(kpi.gap) : formatCompanyCount(kpi.gap)}
        </span>
        <span>+{kpi.key === "revenue" ? formatCompanyMoney(kpi.requiredPerMonth) : formatCompanyCount(kpi.requiredPerMonth)}/mo</span>
        <span className="text-right">
          +{kpi.key === "revenue" ? formatCompanyMoney(kpi.requiredPerWeek) : formatCompanyCount(kpi.requiredPerWeek)}/wk
        </span>
      </div>
    </article>
  );
}

export function RevenueStreamBars({ streams }: { streams: RevenueStreamProgress[] }) {
  const max = Math.max(1, ...streams.map((s) => s.target));
  return (
    <div className="space-y-4">
      {streams.map((stream) => (
        <div key={stream.key}>
          <div className="flex justify-between text-sm mb-1.5 gap-4">
            <span className="text-black/70">{stream.label}</span>
            <span className="tabular-nums text-black/50 shrink-0">
              {formatCompanyMoney(stream.current)} / {formatCompanyMoney(stream.target)} ·{" "}
              {stream.progressPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#E8E4DC] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#3B7BFF]"
              style={{ width: `${Math.min(100, (stream.current / max) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-black/40 mt-1 tabular-nums">
            Gap {formatCompanyMoney(stream.gap)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function AcquisitionFunnelViz({ bundle }: { bundle: CompanyHqBundle }) {
  return (
    <div className="space-y-2">
      {bundle.acquisition.funnel.map((stage, index) => (
        <div key={stage.key} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center text-sm border-b border-black/5 py-2.5">
          <div>
            <p className="font-medium text-black/80">{stage.label}</p>
            {index > 0 && stage.conversionPct != null ? (
              <p className="text-[11px] text-black/40">{stage.conversionPct}% conversion</p>
            ) : null}
          </div>
          <span className="tabular-nums text-black/60">
            {stage.volume == null ? "—" : formatCompanyCount(stage.volume)}
          </span>
          <span className="tabular-nums text-[11px] text-black/40 w-16 text-right">
            {stage.wowChange != null ? `+${stage.wowChange} wk` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function WeeklyReviewTable({ bundle }: { bundle: CompanyHqBundle }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[10px] tracking-[0.14em] uppercase text-black/40 border-b border-black/10">
          <th className="py-2 text-left font-medium">Metric</th>
          <th className="py-2 text-right font-medium">This week</th>
          <th className="py-2 text-right font-medium">Target</th>
          <th className="py-2 text-right font-medium">Variance</th>
        </tr>
      </thead>
      <tbody>
        {bundle.weeklyReview.map((row) => (
          <tr key={row.label} className="border-b border-black/5">
            <td className="py-2.5">{row.label}</td>
            <td className="py-2.5 text-right tabular-nums">
              {row.label.toLowerCase().includes("revenue")
                ? formatCompanyMoney(row.current)
                : formatCompanyCount(row.current)}
            </td>
            <td className="py-2.5 text-right tabular-nums text-black/45">
              {row.target > 0
                ? row.label.toLowerCase().includes("revenue")
                  ? formatCompanyMoney(row.target)
                  : formatCompanyCount(row.target)
                : "—"}
            </td>
            <td
              className="py-2.5 text-right tabular-nums"
              style={{ color: row.variance >= 0 ? "#22A06B" : "#E86A3C" }}
            >
              {row.target > 0
                ? row.variance >= 0
                  ? `+${row.variance}`
                  : String(row.variance)
                : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MilestonesGrid({ bundle }: { bundle: CompanyHqBundle }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {bundle.milestones.map((m) => (
        <article key={m.quarter} className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-[10px] tracking-[0.16em] uppercase text-black/40">{m.quarter}</p>
          <h3 className="font-serif text-lg mt-1">{m.title}</h3>
          <p className="text-[11px] text-black/45 mt-1">{m.revenueNote}</p>
          <ul className="mt-3 space-y-1 text-sm text-black/65">
            {m.items.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

export function HqSectionFrame({
  title,
  description,
  children,
  href,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-serif text-xl">{title}</h2>
          {description ? <p className="text-sm text-black/50 mt-1">{description}</p> : null}
        </div>
        {href ? (
          <Link href={href} className="text-xs tracking-wide uppercase text-black/45 hover:text-black/70 shrink-0">
            Open →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
