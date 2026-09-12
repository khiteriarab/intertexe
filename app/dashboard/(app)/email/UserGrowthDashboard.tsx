"use client";

import { useId, useMemo, useState } from "react";
import {
  USER_GROWTH_COLORS,
  USER_GROWTH_SCOREBOARD_DEADLINE_ISO,
  USER_GROWTH_TARGET,
  computeScoreboardTargets,
  formatUserCount,
  formatUserCountCompact,
  paceColor,
  type UserGrowthTrajectoryPoint,
} from "../../../../lib/dashboard/user-growth-plan";
import type { EmailLeverRow, UserGrowthEngineBundle, WeeklySignupRow } from "../../../../lib/dashboard/user-growth-engine";

const PLOT_W = 720;
const PLOT_H = 160;

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

function ScoreTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-4 py-3.5">
      <p className="text-[10px] tracking-[0.16em] uppercase text-black/40">{label}</p>
      <p className="text-xl sm:text-2xl font-medium tabular-nums mt-1.5 text-[var(--hq-ink,#1a1a1a)]">{value}</p>
      {hint ? <p className="text-[11px] text-black/45 mt-1">{hint}</p> : null}
    </div>
  );
}

function PhoneMetricCard({
  eyebrow,
  value,
  detail,
}: {
  eyebrow: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(26,31,34,0.04)]">
      <p className="text-[10px] tracking-[0.18em] uppercase text-black/38">{eyebrow}</p>
      <p className="text-3xl font-medium tabular-nums mt-2 tracking-tight">{value}</p>
      <p className="text-sm text-black/55 mt-1">{detail}</p>
    </div>
  );
}

function GrowthTrajectoryChart({
  points,
}: {
  points: UserGrowthTrajectoryPoint[];
}) {
  const gradientId = useId();
  if (points.length < 2) {
    return <p className="text-sm text-black/55">Trajectory appears once weekly signup data is available.</p>;
  }

  const maxVal = Math.max(USER_GROWTH_TARGET, ...points.map((p) => p.target), ...points.map((p) => p.actual ?? 0));
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

  return (
    <div className="flex gap-2">
      <svg viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} preserveAspectRatio="none" className="w-full block" style={{ height: PLOT_H }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={USER_GROWTH_COLORS.actual} stopOpacity="0.12" />
            <stop offset="100%" stopColor={USER_GROWTH_COLORS.actual} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={targetPath} fill="none" stroke={USER_GROWTH_COLORS.target} strokeWidth={2} strokeDasharray="6 4" />
        {actualPath ? (
          <>
            <path d={`${actualPath} L${x(points.indexOf(actualPoints.at(-1)!)).toFixed(1)},${PLOT_H} L${x(points.indexOf(actualPoints[0]!)).toFixed(1)},${PLOT_H} Z`} fill={`url(#${gradientId})`} />
            <path d={actualPath} fill="none" stroke={USER_GROWTH_COLORS.actual} strokeWidth={2.5} />
          </>
        ) : null}
      </svg>
    </div>
  );
}

function WeeklySignupsChart({ rows }: { rows: WeeklySignupRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.signups));
  return (
    <div className="flex items-end gap-1 h-24">
      {rows.map((row) => (
        <div key={row.weekStart} className="flex-1 min-w-0">
          <div
            className="w-full rounded-t-sm"
            style={{
              height: `${Math.max(4, (row.signups / max) * 96)}px`,
              background: USER_GROWTH_COLORS.actual,
              opacity: 0.85,
            }}
            title={`${formatWeek(row.weekStart)}: ${row.signups}`}
          />
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
                  <div className="h-2 bg-[#E8E4DC] rounded-full overflow-hidden">
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

export function UserGrowthDashboard({ bundle }: { bundle: UserGrowthEngineBundle }) {
  const { accounts, activated, activationRate, pace, scoreboard: liveScoreboard } = bundle;
  const [scenarioCurrent, setScenarioCurrent] = useState<number | null>(null);
  const accent = paceColor(pace.pace);

  const scoreboard = useMemo(
    () =>
      scenarioCurrent == null
        ? liveScoreboard
        : computeScoreboardTargets({ currentTotal: scenarioCurrent, asOfIso: bundle.fetchedAt }),
    [scenarioCurrent, liveScoreboard, bundle.fetchedAt]
  );

  const weekProgress = scoreboard.perWeek > 0 ? Math.min(100, (accounts.d7 / scoreboard.perWeek) * 100) : 0;
  const monthProgress = scoreboard.perMonth > 0 ? Math.min(100, (accounts.d30 / scoreboard.perMonth) * 100) : 0;
  const activatedGoal = Math.round(USER_GROWTH_TARGET * 0.6);
  const activatedRemaining = Math.max(0, activatedGoal - activated.total);
  const activatedPace = computeScoreboardTargets({
    currentTotal: activated.total,
    asOfIso: bundle.fetchedAt,
  });
  const activatedProgressPct = activatedGoal > 0 ? (activated.total / activatedGoal) * 100 : 0;

  return (
    <div className="mb-8 space-y-6">
      {/* Phone-style headline cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <PhoneMetricCard
          eyebrow="Annual"
          value="25K"
          detail={`members by ${scoreboard.deadlineLabel}`}
        />
        <PhoneMetricCard
          eyebrow="This month"
          value={`+${formatUserCount(accounts.d30)}`}
          detail={`net new · target +${formatUserCount(scoreboard.perMonth)}`}
        />
        <PhoneMetricCard
          eyebrow="This week"
          value={`+${formatUserCount(accounts.d7)}`}
          detail={`net new · target +${formatUserCount(scoreboard.perWeek)}`}
        />
      </div>

      {/* Live current + recalculating targets */}
      <section className="rounded-2xl border border-black/10 bg-white p-6 sm:p-8">
        <p className="text-[10px] tracking-[0.2em] uppercase text-black/40 mb-4">
          How many members does INTERTEXE have right now?
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <div className="flex-1">
            <p className="text-4xl sm:text-5xl font-light tabular-nums tracking-tight">
              {formatUserCount(accounts.total)}
            </p>
            <p className="text-sm text-black/50 mt-2">
              Live from registered accounts · updated {new Date(bundle.fetchedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScenarioCurrent(accounts.total)}
              className="text-xs tracking-wide uppercase border border-black/15 px-3 py-2 rounded-lg hover:bg-black/[0.03]"
            >
              Sync to live
            </button>
            <button
              type="button"
              onClick={() => setScenarioCurrent(0)}
              className="text-xs tracking-wide uppercase border border-black/15 px-3 py-2 rounded-lg hover:bg-black/[0.03]"
            >
              Model from zero
            </button>
          </div>
        </div>

        {scenarioCurrent != null && scenarioCurrent !== accounts.total ? (
          <label className="block mb-6">
            <span className="text-[11px] text-black/45">Scenario model (targets recalculate)</span>
            <input
              type="number"
              min={0}
              max={USER_GROWTH_TARGET}
              value={scenarioCurrent}
              onChange={(e) => setScenarioCurrent(Math.max(0, Number(e.target.value) || 0))}
              className="mt-2 w-full max-w-xs text-2xl tabular-nums border border-black/15 rounded-xl px-4 py-3"
            />
          </label>
        ) : null}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <ScoreTile label="Goal" value={`${formatUserCount(scoreboard.goal)} members`} />
          <ScoreTile label="Per month" value={`+${formatUserCount(scoreboard.perMonth)}`} hint="net new required" />
          <ScoreTile label="Per week" value={`+${formatUserCount(scoreboard.perWeek)}`} hint="net new required" />
          <ScoreTile label="Per day" value={`+${formatUserCount(scoreboard.perDay)}`} hint="average required" />
        </div>

        <div className="rounded-xl border border-black/8 bg-[#faf8f5] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl text-[var(--hq-ink,#1a1a1a)]">This is the scoreboard</h2>
              <p className="text-sm text-black/55 mt-1">
                {formatUserCount(scoreboard.remaining)} members still to acquire
              </p>
            </div>
            <p className="text-sm tabular-nums text-black/50">{scoreboard.progressPct.toFixed(1)}% of target</p>
          </div>
          <div className="h-3 rounded-full bg-[#E8E4DC] overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, scoreboard.progressPct)}%`,
                background: `linear-gradient(90deg, ${USER_GROWTH_COLORS.actual}, ${accent})`,
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-black/45 tabular-nums">
            <span>{formatUserCount(scoreboard.current)} current</span>
            <span className="text-black/35">Goal trajectory</span>
            <span>{formatUserCount(scoreboard.goal)}</span>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        {/* Monthly checkpoints */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <h3 className="font-serif text-lg mb-1">Monthly checkpoints</h3>
          <p className="text-[11px] text-black/45 mb-4">
            Where total membership should be if growth is roughly even · Oct 2026 → Sep 2027
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[280px]">
              <thead>
                <tr className="text-[10px] tracking-[0.14em] uppercase text-black/40 border-b border-black/10">
                  <th className="py-2 pr-4 text-left font-medium">Checkpoint</th>
                  <th className="py-2 text-right font-medium">Total members</th>
                </tr>
              </thead>
              <tbody>
                {bundle.monthlyCheckpoints.map((row) => (
                  <tr
                    key={row.checkpoint}
                    className={`border-b border-black/5 ${row.isCurrent ? "bg-[#faf8f5]" : ""}`}
                  >
                    <td className="py-2.5 pr-4">
                      {row.checkpoint}
                      {row.isCurrent ? (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-black/40">now</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-medium">
                      {formatUserCount(row.totalMembers)}
                      <span className="text-black/35 font-normal text-[11px] ml-2">
                        (+{formatUserCount(row.netNew)})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-black/40 mt-4 tabular-nums">
            Actual today: {formatUserCount(accounts.total)} · plan checkpoint:{" "}
            {formatUserCount(pace.targetToday)} ·{" "}
            {accounts.total >= pace.targetToday ? "at or ahead" : `${formatUserCount(pace.targetToday - accounts.total)} behind`}
          </p>
        </section>

        {/* Weekly operating target */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <h3 className="font-serif text-lg mb-1">Weekly operating target</h3>
          <p className="text-[11px] text-black/45 mb-5">Use this every Monday morning on the founder dashboard.</p>

          <div className="mb-4">
            <div className="flex justify-between items-baseline text-sm mb-2">
              <span className="text-black/60">Net new members this week</span>
              <span className="text-xl font-medium tabular-nums">+{formatUserCount(accounts.d7)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-[#E8E4DC] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${weekProgress}%`, background: accent }}
              />
            </div>
            <p className="text-[11px] text-black/40 mt-1 tabular-nums">
              Target +{formatUserCount(scoreboard.perWeek)} · {weekProgress.toFixed(0)}% of weekly pace
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <ScoreTile label="4-week target" value={formatUserCount(scoreboard.fourWeekTarget)} />
            <ScoreTile label="Quarter target" value={formatUserCount(scoreboard.quarterTarget)} />
          </div>

          <div className="rounded-xl border border-black/8 bg-[#faf8f5] px-4 py-4">
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/38 mb-2">Sunday review question</p>
            <p className="font-serif text-base leading-snug">
              Did we add at least {formatUserCount(scoreboard.perWeek)} net new members this week?
            </p>
            <p className="text-[11px] text-black/45 mt-2 leading-relaxed">
              If not: what acquisition channel missed, and what changes Monday?
            </p>
          </div>
        </section>
      </div>

      {/* Secondary goal: activated members */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-serif text-lg">Activated members</h3>
            <p className="text-[11px] text-black/45 mt-1">
              First scan = activated · target {formatUserCount(activatedGoal)} (60% of {formatUserCount(USER_GROWTH_TARGET)})
            </p>
          </div>
          <p className="text-sm tabular-nums text-black/50">
            {activationRate != null ? `${activationRate}% activation rate` : "—"}
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <ScoreTile label="Activated total" value={formatUserCount(activated.total)} />
          <ScoreTile label="This week" value={`+${formatUserCount(activated.d7)}`} />
          <ScoreTile
            label="Required / week"
            value={`+${formatUserCount(activatedPace.perWeek)}`}
            hint={`${formatUserCount(activatedRemaining)} to go`}
          />
        </div>
        <div className="h-2 rounded-full bg-[#E8E4DC] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, activatedProgressPct)}%`,
              background: USER_GROWTH_COLORS.ahead,
            }}
          />
        </div>
      </section>

      {/* Funnel inputs */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
        <h3 className="font-serif text-lg mb-1">Acquisition funnel · inputs</h3>
        <p className="text-[11px] text-black/45 mb-5">
          Outcomes below — email delivered → new account → activated member. When a number misses, inspect the step before it.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {bundle.funnel.map((step, index) => (
            <div key={step.label} className="relative rounded-xl border border-black/8 px-4 py-3">
              {index > 0 ? (
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 hidden lg:inline text-black/25">→</span>
              ) : null}
              <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">{step.label}</p>
              <p className="text-2xl font-medium tabular-nums mt-1">{formatUserCount(step.value)}</p>
              <p className="text-[11px] text-black/40 mt-0.5">{step.period}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-black/40 mt-4">
          Month pace: {monthProgress.toFixed(0)}% of +{formatUserCount(scoreboard.perMonth)} target · Pace:{" "}
          <span style={{ color: accent }}>{pace.label}</span>
        </p>
      </section>

      {/* Trajectory + weekly bars */}
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <h3 className="text-sm font-medium mb-1">Cumulative path to 25,000</h3>
          <p className="text-[11px] text-black/45 mb-4">Registered users vs milestone plan through {USER_GROWTH_SCOREBOARD_DEADLINE_ISO.slice(0, 4)}.</p>
          <GrowthTrajectoryChart points={bundle.trajectory} />
        </section>
        <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <h3 className="text-sm font-medium mb-1">Weekly signups</h3>
          <p className="text-[11px] text-black/45 mb-4">New accounts by ISO week</p>
          <WeeklySignupsChart rows={bundle.weeklySignups} />
        </section>
      </div>

      <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
        <h3 className="text-sm font-medium mb-1">Email programs → growth levers</h3>
        <p className="text-[11px] text-black/45 mb-5">Delivered volume (7d) by lifecycle stage</p>
        <EmailLeversChart levers={bundle.emailLevers} />
      </section>
    </div>
  );
}
