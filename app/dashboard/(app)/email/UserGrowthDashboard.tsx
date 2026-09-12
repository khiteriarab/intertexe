"use client";

import { useId, useState } from "react";
import {
  USER_GROWTH_COLORS,
  USER_GROWTH_TARGET,
  formatUserCount,
  formatUserCountCompact,
  paceColor,
  type UserGrowthTrajectoryPoint,
} from "../../../../lib/dashboard/user-growth-plan";
import type { EmailLeverRow, UserGrowthEngineBundle, WeeklySignupRow } from "../../../../lib/dashboard/user-growth-engine";

const PLOT_W = 720;
const PLOT_H = 180;

function formatWeek(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function niceCeiling(max: number): number {
  if (max <= 0) return 1000;
  const steps = [500, 1000, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 30000];
  return steps.find((s) => s >= max) || Math.ceil(max / 5000) * 5000;
}

function GrowthTrajectoryChart({
  points,
  milestones,
}: {
  points: UserGrowthTrajectoryPoint[];
  milestones: UserGrowthEngineBundle["milestones"];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();

  if (points.length < 2) {
    return <p className="text-sm text-black/55">Trajectory appears once weekly signup data is available.</p>;
  }

  const maxVal = Math.max(
    USER_GROWTH_TARGET,
    ...points.map((p) => p.target),
    ...points.map((p) => p.actual ?? 0)
  );
  const yMax = niceCeiling(maxVal);
  const x = (i: number) => (i / (points.length - 1)) * PLOT_W;
  const y = (v: number) => PLOT_H - (Math.min(v, yMax) / yMax) * PLOT_H;

  const targetPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.target).toFixed(1)}`).join(" ");
  const actualPoints = points.filter((p) => p.actual != null);
  const actualPath = actualPoints
    .map((p, i) => {
      const index = points.indexOf(p);
      return `${i === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(p.actual as number).toFixed(1)}`;
    })
    .join(" ");

  const active = activeIndex == null ? null : points[activeIndex];
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(yMax * r));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3">
        <LegendDot color={USER_GROWTH_COLORS.actual} label="Registered users" />
        <LegendDot color={USER_GROWTH_COLORS.target} label="Plan trajectory" dashed />
      </div>
      <div className="flex gap-2">
        <div
          className="flex flex-col justify-between text-[11px] text-black/40 tabular-nums shrink-0 text-right"
          style={{ height: PLOT_H }}
          aria-hidden="true"
        >
          {[...gridValues].reverse().map((v) => (
            <span key={v}>{formatUserCountCompact(v)}</span>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="none"
            className="w-full block"
            style={{ height: PLOT_H }}
            role="img"
            aria-label="Cumulative registered users against the 25,000 user plan through 2027."
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={USER_GROWTH_COLORS.actual} stopOpacity="0.14" />
                <stop offset="100%" stopColor={USER_GROWTH_COLORS.actual} stopOpacity="0" />
              </linearGradient>
              <pattern id="target-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke={USER_GROWTH_COLORS.target} strokeWidth="1" />
              </pattern>
            </defs>
            {gridValues.map((v) => (
              <line
                key={v}
                x1={0}
                y1={y(v)}
                x2={PLOT_W}
                y2={y(v)}
                stroke={USER_GROWTH_COLORS.track}
                strokeWidth={1}
              />
            ))}
            {milestones.map((m) => {
              const idx = points.findIndex((p) => p.weekStart >= m.targetDate.slice(0, 10));
              if (idx < 0) return null;
              return (
                <line
                  key={m.name}
                  x1={x(idx)}
                  y1={0}
                  x2={x(idx)}
                  y2={PLOT_H}
                  stroke={USER_GROWTH_COLORS.neutral}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                  opacity={0.5}
                />
              );
            })}
            <path d={`${actualPath} L${x(points.indexOf(actualPoints[actualPoints.length - 1]!)).toFixed(1)},${PLOT_H} L${x(points.indexOf(actualPoints[0]!)).toFixed(1)},${PLOT_H} Z`} fill={`url(#${gradientId})`} />
            <path d={targetPath} fill="none" stroke={USER_GROWTH_COLORS.target} strokeWidth={2} strokeDasharray="6 4" />
            <path d={actualPath} fill="none" stroke={USER_GROWTH_COLORS.actual} strokeWidth={2.5} />
            {points.map((p, i) =>
              p.actual != null ? (
                <circle
                  key={p.weekStart}
                  cx={x(i)}
                  cy={y(p.actual)}
                  r={activeIndex === i ? 5 : 3}
                  fill={USER_GROWTH_COLORS.actual}
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                />
              ) : null
            )}
          </svg>
          <div className="flex justify-between text-[10px] text-black/40 mt-1 tabular-nums">
            <span>{formatWeek(points[0].weekStart)}</span>
            <span>{formatWeek(points[Math.floor(points.length / 2)].weekStart)}</span>
            <span>2027</span>
          </div>
        </div>
      </div>
      {active ? (
        <p className="text-[11px] text-black/55 mt-3 tabular-nums">
          Week of {formatWeek(active.weekStart)} · actual {formatUserCount(active.actual ?? 0)} · plan{" "}
          {formatUserCount(active.target)}
          {active.gap != null && active.gap !== 0
            ? active.gap > 0
              ? ` · ${formatUserCount(active.gap)} behind`
              : ` · ${formatUserCount(-active.gap)} ahead`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

function WeeklySignupsChart({ rows }: { rows: WeeklySignupRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.signups));
  return (
    <div className="flex items-end gap-1.5 h-28">
      {rows.map((row) => (
        <div key={row.weekStart} className="flex-1 min-w-0 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${Math.max(4, (row.signups / max) * 100)}%`,
              background: `linear-gradient(180deg, ${USER_GROWTH_COLORS.actual} 0%, ${USER_GROWTH_COLORS.neutral}88 100%)`,
            }}
            title={`${formatWeek(row.weekStart)}: ${row.signups} signups`}
          />
          <span className="text-[8px] text-black/30 truncate w-full text-center hidden sm:block">
            {formatWeek(row.weekStart).replace(",", "")}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmailLeversChart({ levers }: { levers: EmailLeverRow[] }) {
  const max = Math.max(1, ...levers.map((l) => l.delivered7d));
  const stages = ["Acquire", "Activate", "Retain", "Convert"] as const;

  return (
    <div className="space-y-4">
      {stages.map((stage) => {
        const stageLevers = levers.filter((l) => l.stage === stage);
        if (!stageLevers.length) return null;
        return (
          <div key={stage}>
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">{stage}</p>
            <ul className="space-y-2">
              {stageLevers.map((lever) => (
                <li key={lever.label} className="grid grid-cols-[7rem_1fr_3rem] gap-3 items-center text-sm">
                  <span className="text-black/70 truncate">{lever.label}</span>
                  <div className="h-2 bg-[var(--hq-border,#E8E4DC)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, (lever.delivered7d / max) * 100)}%`,
                        background: lever.color,
                      }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums text-black/45 text-right">{lever.delivered7d}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] text-black/55">
      <span
        className="w-5 h-0.5 rounded-full"
        style={{
          background: dashed ? "transparent" : color,
          borderTop: dashed ? `2px dashed ${color}` : undefined,
        }}
      />
      {label}
    </span>
  );
}

export function UserGrowthDashboard({ bundle }: { bundle: UserGrowthEngineBundle }) {
  const { accounts, activated, activationRate, pace } = bundle;
  const accent = paceColor(pace.pace);

  return (
    <div className="mb-8 space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-black/10 bg-[#faf8f5] p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(-14deg, transparent, transparent 28px, rgba(196,165,116,0.07) 28px, rgba(196,165,116,0.07) 29px)",
          }}
        />
        <div className="relative">
          <p className="text-[10px] tracking-[0.22em] uppercase text-[#9c7b8b] mb-2">North star · 2027</p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-light tabular-nums tracking-tight">
                {formatUserCount(accounts.total)}
                <span className="text-black/30 text-xl sm:text-2xl font-normal"> / {formatUserCount(USER_GROWTH_TARGET)} users</span>
              </h2>
              <p className="text-sm text-black/55 mt-2 max-w-xl leading-relaxed">
                Registered accounts by end of 2027. Email lifecycle, founder outreach, and product loops feed this curve —
                delivery ops below, growth trajectory here.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <MetricPill label="Pace" value={pace.label} accent={accent} />
              <MetricPill label="This week" value={`+${accounts.d7}`} hint="new accounts" />
              <MetricPill label="Required / wk" value={String(pace.requiredWeekly)} hint={`${pace.weeksRemaining} weeks left`} />
            </div>
          </div>

          <div className="mb-2 flex justify-between text-[10px] tracking-widest uppercase text-black/40">
            <span>Progress</span>
            <span className="tabular-nums">{pace.progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full bg-[#E8E4DC] overflow-hidden mb-6">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, pace.progressPct)}%`,
                background: `linear-gradient(90deg, ${USER_GROWTH_COLORS.actual}, ${accent})`,
              }}
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Plan target today", value: formatUserCount(pace.targetToday) },
              { label: "Gap to 25k", value: formatUserCount(pace.gapToGoal) },
              { label: "Activated", value: formatUserCount(activated.total), hint: activationRate != null ? `${activationRate}% of accounts` : undefined },
              { label: "New this month", value: `+${accounts.d30}`, hint: "last 30 days" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-black/8 bg-white/80 px-4 py-3">
                <p className="text-[10px] tracking-widest uppercase text-black/40">{item.label}</p>
                <p className="text-xl font-medium tabular-nums mt-1">{item.value}</p>
                {item.hint ? <p className="text-[11px] text-black/45 mt-0.5">{item.hint}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="hq-card p-5 sm:p-6">
          <h3 className="text-sm font-medium mb-1">Path to 25,000</h3>
          <p className="text-[11px] text-black/45 mb-5">Cumulative registered users vs milestone plan through Dec 2027.</p>
          <GrowthTrajectoryChart points={bundle.trajectory} milestones={bundle.milestones} />
          <ul className="mt-6 grid sm:grid-cols-2 gap-2 text-[11px] text-black/50">
            {bundle.milestones.slice(1).map((m) => (
              <li key={m.name} className="flex justify-between gap-2 border-t border-black/5 pt-2">
                <span>{m.name}</span>
                <span className="tabular-nums shrink-0">{formatUserCount(m.cumulative)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="hq-card p-5 sm:p-6">
          <h3 className="text-sm font-medium mb-1">Weekly signups</h3>
          <p className="text-[11px] text-black/45 mb-5">New accounts by ISO week (user_preferences).</p>
          <WeeklySignupsChart rows={bundle.weeklySignups} />
        </section>
      </div>

      <section className="hq-card p-5 sm:p-6">
        <h3 className="text-sm font-medium mb-1">Email programs → growth levers</h3>
        <p className="text-[11px] text-black/45 mb-5">
          Delivered volume (7d) mapped to acquire · activate · retain · convert. Counts are sends, not attributed signups.
        </p>
        <EmailLeversChart levers={bundle.emailLevers} />
      </section>
    </div>
  );
}

function MetricPill({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/90 px-4 py-3 min-w-[120px]">
      <p className="text-[10px] tracking-widest uppercase text-black/40">{label}</p>
      <p className="text-lg font-medium tabular-nums mt-0.5" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {hint ? <p className="text-[10px] text-black/40">{hint}</p> : null}
    </div>
  );
}
