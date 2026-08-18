"use client";

/**
 * Charts for the founder $50K command center.
 *
 * Axis and series labels are HTML, not SVG text, so they keep real CSS font
 * sizes (>= 11px) on a phone. Only the plotted geometry lives in SVG.
 * Every series pairs its color with a label and a line style or pattern.
 */
import { useId, useState } from "react";
import {
  PLAN_COLORS,
  formatPercent,
  formatPlanDate,
  formatPlanMoney,
  streamMeta,
  type FunnelRow,
} from "../../../../lib/dashboard/revenue-plan";

type TrajectoryPoint = {
  weekStart: string;
  target: number;
  actual: number | null;
  gap: number | null;
  isFuture: boolean;
};

const PLOT_W = 720;
const PLOT_H = 200;

/** Reads as plain language: behind plan, ahead of plan, or exactly on it. */
function gapPhrase(gap: number | null): string {
  if (gap == null) return "";
  if (gap > 0) return `gap ${formatPlanMoney(gap)} behind plan`;
  if (gap < 0) return `${formatPlanMoney(-gap)} ahead of plan`;
  return "exactly on plan";
}

function niceCeiling(max: number): number {
  if (max <= 0) return 1000;
  const steps = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 75000, 100000];
  return steps.find((s) => s >= max) || Math.ceil(max / 10000) * 10000;
}

export function TrajectoryChart({
  points,
  milestones,
}: {
  points: TrajectoryPoint[];
  milestones: Array<{ name: string; targetDate: string; cumulative: number }>;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();

  if (points.length < 2) {
    return (
      <p className="text-sm text-black/55">
        The weekly trajectory appears once the plan window has started and targets are readable.
      </p>
    );
  }

  const maxTarget = Math.max(...points.map((p) => p.target), ...points.map((p) => p.actual ?? 0));
  const yMax = niceCeiling(maxTarget);
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
        <LegendItem color={PLAN_COLORS.mauve} label="Actual booked" style="solid" />
        <LegendItem color={PLAN_COLORS.plan} label="Target trajectory" style="dashed" />
      </div>

      <div className="flex gap-2">
        <div
          className="flex flex-col justify-between text-[11px] text-black/40 tabular-nums shrink-0 text-right"
          style={{ height: PLOT_H }}
          aria-hidden="true"
        >
          {[...gridValues].reverse().map((v) => (
            <span key={v}>{v >= 1000 ? `${Math.round(v / 1000)}k` : v}</span>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="none"
            className="w-full block"
            style={{ height: PLOT_H }}
            role="img"
            aria-label={`Cumulative booked revenue against the target trajectory from ${formatPlanDate(
              points[0].weekStart
            )} to ${formatPlanDate(points[points.length - 1].weekStart)}.`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PLAN_COLORS.mauve} stopOpacity="0.16" />
                <stop offset="100%" stopColor={PLAN_COLORS.mauve} stopOpacity="0" />
              </linearGradient>
            </defs>

            {gridValues.map((v) => (
              <line
                key={v}
                x1="0"
                x2={PLOT_W}
                y1={y(v)}
                y2={y(v)}
                stroke={PLAN_COLORS.ink}
                strokeOpacity="0.08"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {milestones
              .filter((m) => m.cumulative > 0)
              .map((m) => {
                const index = points.findIndex((p) => p.weekStart >= m.targetDate);
                const at = index === -1 ? PLOT_W : x(index);
                return (
                  <line
                    key={m.targetDate}
                    x1={at}
                    x2={at}
                    y1="0"
                    y2={PLOT_H}
                    stroke={PLAN_COLORS.ink}
                    strokeOpacity="0.18"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

            {actualPath ? (
              <path
                d={`${actualPath} L${x(points.indexOf(actualPoints[actualPoints.length - 1])).toFixed(
                  1
                )},${PLOT_H} L0,${PLOT_H} Z`}
                fill={`url(#${gradientId})`}
                stroke="none"
              />
            ) : null}

            <path
              d={targetPath}
              fill="none"
              stroke={PLAN_COLORS.plan}
              strokeWidth="1.5"
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />

            {actualPath ? (
              <path
                d={actualPath}
                fill="none"
                stroke={PLAN_COLORS.mauve}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {active ? (
              <line
                x1={x(activeIndex as number)}
                x2={x(activeIndex as number)}
                y1="0"
                y2={PLOT_H}
                stroke={PLAN_COLORS.ink}
                strokeOpacity="0.35"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>

          {/* Keyboard- and pointer-accessible hit areas, one per week. */}
          <div className="relative -mt-[200px]" style={{ height: PLOT_H }}>
            <div className="flex h-full">
              {points.map((p, i) => (
                <button
                  key={p.weekStart}
                  type="button"
                  className="flex-1 h-full focus:outline-none focus-visible:bg-black/[0.06]"
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(i)}
                  onBlur={() => setActiveIndex(null)}
                  aria-label={`Week of ${formatPlanDate(p.weekStart)}. Target ${formatPlanMoney(
                    p.target
                  )}. ${
                    p.actual == null
                      ? "Actual not yet recorded."
                      : `Actual ${formatPlanMoney(p.actual)}. ${gapPhrase(p.gap)}.`
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between text-[11px] text-black/40 mt-1">
            <span>{formatPlanDate(points[0].weekStart)}</span>
            <span className="hidden sm:inline">Sep 30 · $5,000</span>
            <span>Dec 31 · $50,000</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-black/55 mt-3 tabular-nums min-h-[16px]" role="status" aria-live="polite">
        {active
          ? `Week of ${formatPlanDate(active.weekStart)} · target ${formatPlanMoney(active.target)} · actual ${
              active.actual == null ? "not recorded" : formatPlanMoney(active.actual)
            }${active.gap == null ? "" : ` · ${gapPhrase(active.gap)}`}`
          : "Hover or tab across the chart for target, actual and gap by week."}
      </p>
    </div>
  );
}

export function LegendItem({
  color,
  label,
  style = "solid",
}: {
  color: string;
  label: string;
  style?: "solid" | "dashed" | "hatch" | "dots";
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] text-black/60">
      <span
        aria-hidden="true"
        className="inline-block w-6 h-[3px] rounded-sm"
        style={
          style === "dashed"
            ? { backgroundImage: `repeating-linear-gradient(to right, ${color} 0 5px, transparent 5px 9px)` }
            : style === "hatch"
              ? { backgroundImage: `repeating-linear-gradient(45deg, ${color} 0 2px, transparent 2px 4px)`, height: 8 }
              : style === "dots"
                ? { backgroundImage: `radial-gradient(${color} 40%, transparent 42%)`, backgroundSize: "4px 4px", height: 8 }
                : { backgroundColor: color }
        }
      />
      {label}
    </span>
  );
}

export function FunnelChart({
  rows,
  deadlineLabel,
  weakestKey,
}: {
  rows: FunnelRow[];
  deadlineLabel: string;
  weakestKey?: string | null;
}) {
  const scale = Math.max(...rows.map((r) => Math.max(r.actual, r.target)), 1);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
        <LegendItem color={PLAN_COLORS.mauve} label="Actual" />
        <LegendItem color={PLAN_COLORS.plan} label={`Target by ${deadlineLabel}`} style="dashed" />
      </div>
      <ul className="space-y-3">
        {rows.map((row) => {
          const behind = row.target > 0 && row.actual < row.target;
          const isWeakest = weakestKey === row.key;
          return (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] text-black/70">
                  {row.label}
                  {isWeakest ? (
                    <span
                      className="ml-2 text-[10px] tracking-[0.1em] uppercase"
                      style={{ color: PLAN_COLORS.terracotta }}
                    >
                      Furthest behind
                    </span>
                  ) : null}
                </span>
                <span className="text-[12px] tabular-nums text-black/70 shrink-0">
                  {row.actual}
                  <span className="text-black/35"> / {row.target}</span>
                  {row.conversionFromPrevious != null ? (
                    <span className="text-black/35"> · {formatPercent(row.conversionFromPrevious)} conv.</span>
                  ) : null}
                </span>
              </div>
              <div className="relative h-3 mt-1.5 bg-black/[0.04] rounded-sm overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{
                    width: `${(row.actual / scale) * 100}%`,
                    backgroundColor: behind ? PLAN_COLORS.mauve : PLAN_COLORS.sage,
                  }}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 border-l-2 border-dashed"
                  style={{
                    left: `${Math.min(100, (row.target / scale) * 100)}%`,
                    borderColor: PLAN_COLORS.plan,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StreamMixChart({
  rows,
  showTargets = true,
}: {
  rows: Array<{ stream: string; label: string; scope: string; booked: number; target: number; unitPlan: string }>;
  showTargets?: boolean;
}) {
  const totalTarget = rows.reduce((s, r) => s + r.target, 0) || 1;
  const totalBooked = rows.reduce((s, r) => s + r.booked, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] tracking-[0.14em] uppercase text-black/40">Booked</span>
        <span className="text-[12px] tabular-nums text-black/60">{formatPlanMoney(totalBooked)}</span>
      </div>
      <div className="flex h-4 rounded-sm overflow-hidden bg-black/[0.04]" role="img" aria-label={
        totalBooked === 0
          ? "No booked revenue recorded yet."
          : rows.filter((r) => r.booked > 0).map((r) => `${r.label} ${formatPlanMoney(r.booked)}`).join(", ")
      }>
        {rows
          .filter((r) => r.booked > 0)
          .map((row) => {
            const meta = streamMeta(row.stream);
            return (
              <div
                key={row.stream}
                style={{
                  width: `${(row.booked / Math.max(totalBooked, 1)) * 100}%`,
                  backgroundColor: meta?.color || PLAN_COLORS.ink,
                }}
                title={`${row.label} · ${formatPlanMoney(row.booked)}`}
              />
            );
          })}
      </div>

      {showTargets ? (
        <>
          <div className="flex items-baseline justify-between mt-4 mb-2">
            <span className="text-[11px] tracking-[0.14em] uppercase text-black/40">December target mix</span>
            <span className="text-[12px] tabular-nums text-black/60">{formatPlanMoney(totalTarget)}</span>
          </div>
          <div className="flex h-4 rounded-sm overflow-hidden bg-black/[0.04]">
            {rows.map((row) => {
              const meta = streamMeta(row.stream);
              return (
                <div
                  key={row.stream}
                  style={{
                    width: `${(row.target / totalTarget) * 100}%`,
                    backgroundColor: meta?.color || PLAN_COLORS.ink,
                    opacity: 0.4,
                  }}
                  title={`${row.label} target · ${formatPlanMoney(row.target)}`}
                />
              );
            })}
          </div>
        </>
      ) : null}

      <ul className="mt-4 space-y-2">
        {rows.map((row) => {
          const meta = streamMeta(row.stream);
          return (
            <li key={row.stream} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="flex items-center gap-2 min-w-0">
                <LegendItem
                  color={meta?.color || PLAN_COLORS.ink}
                  label={row.label}
                  style={meta?.pattern || "solid"}
                />
                <span
                  className="text-[10px] tracking-[0.1em] uppercase text-black/40 border border-black/10 rounded px-1 shrink-0"
                  title={row.scope === "personal" ? "Contracted personally by @khiteri" : "Contracted through INTERTEXE"}
                >
                  {row.scope === "personal" ? "Personal" : "Company"}
                </span>
              </span>
              <span className="tabular-nums text-black/70 shrink-0">
                {formatPlanMoney(row.booked)}
                <span className="text-black/35"> / {formatPlanMoney(row.target)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const ACTIVITY_SERIES: Array<{ key: "personalized_outreach" | "snapshot_sent" | "meeting" | "proposal"; label: string; color: string }> = [
  { key: "personalized_outreach", label: "Personalized outreach", color: PLAN_COLORS.mauve },
  { key: "snapshot_sent", label: "Snapshots sent", color: PLAN_COLORS.mauveDeep },
  { key: "meeting", label: "Meetings", color: PLAN_COLORS.sage },
  { key: "proposal", label: "Proposals", color: PLAN_COLORS.gold },
];

export function WeeklyActivityChart({
  weeks,
  targets,
}: {
  weeks: Array<{ weekStart: string; counts: Record<string, number> }>;
  targets: Record<string, number>;
}) {
  if (!weeks.length) {
    return (
      <p className="text-sm text-black/55">
        No activity recorded yet. Log a personalized outreach, snapshot, meeting or proposal to start the
        weekly comparison.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
        {ACTIVITY_SERIES.map((s) => (
          <LegendItem key={s.key} color={s.color} label={`${s.label} · target ${targets[s.key] ?? 0}/wk`} />
        ))}
      </div>
      <div className="space-y-4">
        {ACTIVITY_SERIES.map((series) => {
          const target = targets[series.key] ?? 0;
          const max = Math.max(target, ...weeks.map((w) => w.counts[series.key] || 0), 1);
          return (
            <div key={series.key}>
              <p className="text-[12px] text-black/70 mb-1.5">{series.label}</p>
              <div className="flex items-end gap-1.5" style={{ height: 48 }}>
                {weeks.map((week) => {
                  const value = week.counts[series.key] || 0;
                  const met = target > 0 && value >= target;
                  return (
                    <div
                      key={week.weekStart}
                      className="relative flex items-end w-full max-w-[22px]"
                      style={{ height: 48 }}
                      title={`Week of ${formatPlanDate(week.weekStart)} · ${value} vs target ${target}`}
                    >
                      <div
                        className="w-full rounded-t-sm"
                        style={{
                          height: `${Math.max(2, (value / max) * 48)}px`,
                          backgroundColor: series.color,
                          opacity: met ? 1 : 0.55,
                        }}
                      />
                      {target > 0 ? (
                        <div
                          aria-hidden="true"
                          className="absolute left-0 right-0 border-t border-dashed"
                          style={{ bottom: `${(target / max) * 48}px`, borderColor: PLAN_COLORS.plan }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-black/40 mt-2">
        Week of {formatPlanDate(weeks[0].weekStart)} through {formatPlanDate(weeks[weeks.length - 1].weekStart)} ·
        one bar per week, dashed line is the weekly target
      </p>
    </div>
  );
}
