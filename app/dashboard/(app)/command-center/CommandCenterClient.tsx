"use client";

/**
 * Founder-only $50K command center.
 *
 * Two views: Revenue & Pipeline (default) and Product & Growth.
 * The scope control keeps INTERTEXE company revenue separate from @khiteri
 * personal revenue while still allowing the combined founder plan.
 */
import { useMemo, useState, type FormEvent } from "react";
import { HqCard } from "../../components/HqUi";
import {
  BookingLegend,
  CumulativeMixBar,
  FunnelChart,
  LegendItem,
  ScaledBookingPlan,
  StreamMixChart,
  TrajectoryChart,
  WeeklyActivityChart,
} from "./PlanCharts";
import {
  PLAN_BOOKING_SUBTITLE,
  PLAN_COLORS,
  PLAN_DECISION_GATE,
  PLAN_MUST_HAPPEN_NEXT,
  REVENUE_STREAMS,
  formatPercent,
  formatPlanDate,
  formatPlanMoney,
  paceColor,
  paceLabel,
  type RevenueScope,
} from "../../../../lib/dashboard/revenue-plan";
import type { CommandCenterBundle, DataAvailability } from "../../../../lib/dashboard/revenue-command-center";

const SCOPES: Array<{ key: RevenueScope; label: string; hint: string }> = [
  { key: "combined", label: "Combined plan", hint: "Company plus personal revenue for the $50,000 founder objective" },
  { key: "company", label: "INTERTEXE company", hint: "Founding Material Data Pilots sold on /platform, integrations, affiliate and INTERTEXE partnerships" },
  { key: "personal", label: "@khiteri personal", hint: "Creator partnerships contracted personally" },
];

function Availability({ availability }: { availability: DataAvailability }) {
  const copy: Record<DataAvailability, { label: string; color: string }> = {
    live: { label: "Live", color: PLAN_COLORS.sage },
    manual: { label: "Manual entry", color: PLAN_COLORS.gold },
    pending: { label: "Awaiting data", color: PLAN_COLORS.gold },
    unavailable: { label: "Not connected", color: PLAN_COLORS.terracotta },
  };
  const item = copy[availability];
  return (
    <span className="text-[10px] tracking-[0.1em] uppercase" style={{ color: item.color }}>
      {item.label}
    </span>
  );
}

function Metric({
  label,
  value,
  lines,
  accent,
}: {
  label: string;
  value: string;
  lines: string[];
  accent?: string;
}) {
  return (
    <div className="bg-white border border-black/10 rounded-xl p-4">
      <p className="text-[10px] tracking-[0.14em] uppercase text-black/45">{label}</p>
      <p className="text-2xl font-medium mt-2 tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {lines.map((line) => (
        <p key={line} className="text-[11px] text-black/50 mt-1 leading-relaxed">
          {line}
        </p>
      ))}
    </div>
  );
}

export function CommandCenterClient({ bundle }: { bundle: CommandCenterBundle }) {
  const [scope, setScope] = useState<RevenueScope>("combined");
  const [view, setView] = useState<"revenue" | "growth">("revenue");
  const totals = bundle.totals[scope];

  const streamMix = useMemo(
    () => bundle.streamMix.filter((row) => scope === "combined" || row.scope === scope),
    [bundle.streamMix, scope]
  );

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <div
          className="inline-flex flex-wrap rounded-lg border border-black/10 bg-white p-1"
          role="tablist"
          aria-label="Dashboard view"
        >
          {(
            [
              { key: "revenue", label: "Revenue & Pipeline" },
              { key: "growth", label: "Product & Growth" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={view === tab.key}
              onClick={() => setView(tab.key)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                view === tab.key ? "bg-black text-white" : "text-black/60 hover:bg-black/[0.04]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="lg:ml-auto">
          <label className="text-[10px] tracking-[0.14em] uppercase text-black/45 block mb-1">
            Accounting scope
          </label>
          <div className="inline-flex flex-wrap rounded-lg border border-black/10 bg-white p-1">
            {SCOPES.map((item) => (
              <button
                key={item.key}
                type="button"
                title={item.hint}
                onClick={() => setScope(item.key)}
                aria-pressed={scope === item.key}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  scope === item.key ? "bg-black text-white" : "text-black/60 hover:bg-black/[0.04]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-black/50 mb-5 leading-relaxed max-w-3xl">
        Showing <span className="font-medium text-black/70">{SCOPES.find((s) => s.key === scope)?.label}</span>.{" "}
        {SCOPES.find((s) => s.key === scope)?.hint}.
        {scope === "combined"
          ? " Combined revenue is the founder objective and is never reported as INTERTEXE company revenue."
          : ""}
      </p>

      {!bundle.planTablesReady ? (
        <div className="mb-6 rounded-xl border border-dashed border-black/20 bg-white px-5 py-4">
          <p className="text-sm font-medium">Deals and payments are not stored yet</p>
          <p className="text-sm text-black/55 mt-1 max-w-2xl leading-relaxed">
            The plan targets below are the seeded September and December milestones. Booked revenue, cash
            collected and pipeline stay empty until{" "}
            <code className="text-[12px]">20260820_hq_revenue_command_center.sql</code> is applied. Nothing here is
            filled with sample revenue.
          </p>
        </div>
      ) : null}

      {view === "revenue" ? (
        <RevenueView bundle={bundle} scope={scope} totals={totals} streamMix={streamMix} />
      ) : (
        <GrowthView bundle={bundle} />
      )}
    </div>
  );
}

function RevenueView({
  bundle,
  scope,
  totals,
  streamMix,
}: {
  bundle: CommandCenterBundle;
  scope: RevenueScope;
  totals: CommandCenterBundle["totals"][RevenueScope];
  streamMix: CommandCenterBundle["streamMix"];
}) {
  const next = bundle.nextMilestone;
  const percentComplete = next && next.cumulative > 0 ? totals.booked / next.cumulative : null;

  return (
    <div className="space-y-6">
      <HqCard>
        <h2 className="text-xl font-semibold tracking-tight">Scaled booking plan</h2>
        <p className="text-sm text-black/50 mt-1">{PLAN_BOOKING_SUBTITLE}</p>
        <p className="text-[12px] text-black/45 mt-2 leading-relaxed max-w-2xl">
          Pilot is the $5,000 Founding Material Data Pilot sold on{" "}
          <a href="/platform" className="underline decoration-black/20 hover:decoration-black">
            /platform
          </a>
          . Five paid pilots, one integration, then creator and affiliate buffer to $50K.
        </p>
        <div className="mt-5">
          <ScaledBookingPlan />
        </div>
      </HqCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Metric
          label="Booked toward next milestone"
          value={formatPlanMoney(totals.booked)}
          lines={[
            next ? `Target ${formatPlanMoney(next.cumulative)} by ${formatPlanDate(next.targetDate)}` : "No milestone set",
            percentComplete == null ? "—" : `${formatPercent(percentComplete)} complete`,
            `${formatPlanMoney(totals.gapToNextMilestone)} still required`,
          ]}
        />
        <Metric
          label="Cash collected"
          value={formatPlanMoney(totals.cashCollected)}
          lines={[
            "Cleared payments only",
            `${formatPlanMoney(totals.outstanding)} signed but not collected`,
          ]}
        />
        <Metric
          label="Weighted pipeline"
          value={formatPlanMoney(totals.weightedPipeline)}
          lines={["Open deal value × stage probability", "Not counted as booked revenue"]}
          accent={PLAN_COLORS.gold}
        />
        <Metric
          label="Forecast at Dec 31"
          value={formatPlanMoney(totals.forecastAtDeadline)}
          lines={[
            paceLabel(totals.pace),
            `Plan expects ${formatPlanMoney(totals.targetToday)} booked today`,
          ]}
          accent={paceColor(totals.pace)}
        />
      </div>

      <HqCard title="Target trajectory versus actual">
        <TrajectoryChart points={bundle.trajectory} milestones={bundle.milestones} />
        <ul className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {bundle.milestones
            .filter((m) => m.cumulative > 0)
            .map((m) => (
              <li key={m.targetDate} className="text-[11px] leading-relaxed">
                <p className="tabular-nums text-black/70">
                  {formatPlanDate(m.targetDate)} · {formatPlanMoney(m.cumulative)}
                </p>
                <p className="text-black/40">+{formatPlanMoney(m.increment)} in period</p>
                <p className="text-black/40 mt-1">{m.logic}</p>
              </li>
            ))}
        </ul>
      </HqCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <HqCard>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-medium">Commercial funnel</h2>
              <p className="text-[11px] text-black/45 mt-1">
                December shape: 150 accounts · 60 snapshots · 30 meetings · 15 proposals · 5 paid pilots · 1
                integration.
              </p>
            </div>
            <Availability availability={bundle.funnel.availability} />
          </div>
          <CumulativeMixBar rows={streamMix} />
          <div className="mt-3 mb-5">
            <BookingLegend />
          </div>
          <FunnelChart
            rows={bundle.funnel.december}
            deadlineLabel="Dec 31"
            weakestKey={bundle.funnel.weakest?.key}
          />
          <details className="mt-5">
            <summary className="text-xs text-black/55 cursor-pointer">September leading targets</summary>
            <div className="mt-3">
              <FunnelChart
                rows={bundle.funnel.september}
                deadlineLabel="Sep 30"
                weakestKey={bundle.funnel.weakest?.key}
              />
            </div>
          </details>
        </HqCard>

        <HqCard title="Revenue mix">
          <StreamMixChart rows={streamMix} />
          {scope !== "combined" ? (
            <p className="text-[11px] text-black/45 mt-4">
              Filtered to {scope === "company" ? "INTERTEXE company" : "@khiteri personal"} streams.
            </p>
          ) : null}
        </HqCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <HqCard>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium"
            style={{ backgroundColor: "#E4EEFF", color: PLAN_COLORS.pilot }}
          >
            {PLAN_DECISION_GATE.label}
          </span>
          <p className="text-sm text-black/65 mt-3 leading-relaxed">{PLAN_DECISION_GATE.text}</p>
        </HqCard>
        <HqCard>
          <h2 className="text-sm font-medium mb-3">What must happen next</h2>
          <ol className="space-y-2.5">
            {PLAN_MUST_HAPPEN_NEXT.map((item, i) => (
              <li key={item} className="flex gap-3 text-[13px] leading-relaxed text-black/70">
                <span className="tabular-nums text-black/35 shrink-0 w-4">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </HqCard>
      </div>

      <HqCard title="Weekly activity versus target">
        <WeeklyActivityChart weeks={bundle.weeklyActivity} targets={bundle.weeklyTargets} />
        <p className="text-[11px] text-black/45 mt-4 leading-relaxed">
          Only explicitly recorded personalized work counts. Bulk and automated email is excluded.
        </p>
      </HqCard>

      <HqCard title="Next actions">
        {bundle.nextActions.length === 0 ? (
          <p className="text-sm text-black/55">
            {bundle.planTablesReady
              ? "No overdue actions, unanswered proposals or stalled opportunities."
              : "Record an opportunity to generate the priority action list."}
          </p>
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {bundle.nextActions.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{item.company}</span>
                  <span className="text-[12px] tabular-nums text-black/60">
                    {item.amount == null ? "—" : formatPlanMoney(item.amount)} · {item.stageLabel}
                  </span>
                </div>
                <p className="text-[12px] text-black/60 mt-1">{item.opportunity}</p>
                <p className="text-[12px] mt-1">
                  <span className="text-black/45">Next action: </span>
                  {item.nextAction}
                  {item.dueDate ? (
                    <span
                      className="ml-2 tabular-nums"
                      style={item.overdue ? { color: PLAN_COLORS.terracotta } : { color: "rgba(0,0,0,0.45)" }}
                    >
                      {item.overdue ? "Overdue " : "Due "}
                      {formatPlanDate(item.dueDate)}
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-black/40 mt-1">{item.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </HqCard>

      <RecordForms bundle={bundle} />
    </div>
  );
}

function GrowthView({ bundle }: { bundle: CommandCenterBundle }) {
  const { apiReadiness, apiOperating } = bundle;

  return (
    <div className="space-y-6">
      <HqCard
        title={
          apiReadiness.commerciallyReady
            ? "Material Intelligence API — operating metrics"
            : "Material Intelligence API — commercial readiness"
        }
      >
        {apiReadiness.commerciallyReady ? null : (
          <p className="text-[12px] text-black/55 mb-4 leading-relaxed">
            {apiReadiness.passed} of {apiReadiness.total} checks pass. The API is not commercially ready while
            production tables or keys are missing.
          </p>
        )}

        {!apiReadiness.commerciallyReady ? (
          <ul className="space-y-2">
            {apiReadiness.checks.map((check) => (
              <li key={check.key} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-[3px] w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center text-[10px] leading-none text-white"
                  style={
                    check.passed
                      ? { backgroundColor: PLAN_COLORS.sage, borderColor: PLAN_COLORS.sage }
                      : { borderColor: "rgba(0,0,0,0.2)" }
                  }
                >
                  {check.passed ? "✓" : ""}
                </span>
                <span className="min-w-0">
                  <span className="text-[13px] text-black/80">{check.label}</span>
                  <span className="sr-only">{check.passed ? " — passed" : " — not passed"}</span>
                  <span className="block text-[11px] text-black/45">
                    {check.detail} <Availability availability={check.availability} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Active clients", value: apiOperating.activeClients, kind: "count" as const },
            { label: "Requests (30d)", value: apiOperating.requests30d, kind: "count" as const },
            { label: "Exact match", value: apiOperating.exactMatchRate, kind: "rate" as const },
            { label: "Manufacturer only", value: apiOperating.manufacturerOnlyRate, kind: "rate" as const },
            { label: "Not found", value: apiOperating.notFoundRate, kind: "rate" as const },
            { label: "Error rate", value: apiOperating.errorRate, kind: "rate" as const },
            { label: "Rate-limit events", value: apiOperating.rateLimitEvents, kind: "count" as const },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] tracking-[0.14em] uppercase text-black/40">{item.label}</p>
              <p className="text-lg font-medium tabular-nums mt-1">
                {item.value == null
                  ? "—"
                  : item.kind === "rate"
                    ? formatPercent(item.value, 1)
                    : item.value.toLocaleString("en-US")}
              </p>
            </div>
          ))}
        </div>
        {apiOperating.availability !== "live" ? (
          <p className="text-[11px] text-black/45 mt-3">
            <Availability availability={apiOperating.availability} /> — operating metrics appear once the API
            serves authenticated requests in production.
          </p>
        ) : null}

        {apiOperating.evidenceDistribution.length ? (
          <div className="mt-5">
            <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">Evidence status</p>
            <ul className="space-y-1">
              {apiOperating.evidenceDistribution.map((row) => (
                <li key={row.status} className="flex justify-between text-[12px]">
                  <span className="text-black/65">{row.status}</span>
                  <span className="tabular-nums text-black/65">{row.count.toLocaleString("en-US")}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ConfirmChecks bundle={bundle} />
      </HqCard>

      <HqCard title="Consumer distribution">
        <p className="text-[11px] text-black/45 mb-3 leading-relaxed">
          Acquisition, data and affiliate-enablement channels. The app and extension are not assigned revenue in
          the December plan.
        </p>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] tracking-[0.12em] uppercase text-black/40">
                <th className="pb-2 font-normal">Channel</th>
                <th className="pb-2 font-normal text-right">Last 30 days</th>
                <th className="pb-2 font-normal">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {bundle.consumer.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-3 text-black/75">{row.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-black/75">
                    {row.value == null
                      ? "—"
                      : row.id === "affiliate_commission"
                        ? formatPlanMoney(row.value)
                        : row.value.toLocaleString("en-US")}
                  </td>
                  <td className="py-2 text-black/45">
                    {row.note}
                    {row.action ? <span className="block text-black/40">{row.action}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-black/45 mt-3 leading-relaxed">
          Chrome Web Store installs are never inferred from website clicks. Attribution uses the first-party
          source values <code className="text-[11px]">chrome_extension</code>,{" "}
          <code className="text-[11px]">saved_inspiration</code>,{" "}
          <code className="text-[11px]">account_clickout</code> and{" "}
          <code className="text-[11px]">ios_product_detail</code>. Legacy events without a source stay unknown.
        </p>
      </HqCard>

      <HqCard title="Data source audit">
        <ul className="divide-y divide-black/[0.06]">
          {bundle.sources.map((source) => (
            <li key={source.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px] text-black/80">{source.label}</span>
                <Availability availability={source.availability} />
              </div>
              <p className="text-[11px] text-black/45 mt-0.5 leading-relaxed">{source.detail}</p>
              {source.action ? (
                <p className="text-[11px] mt-0.5" style={{ color: PLAN_COLORS.mauve }}>
                  {source.action}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </HqCard>
    </div>
  );
}

function ConfirmChecks({ bundle }: { bundle: CommandCenterBundle }) {
  const manual = bundle.apiReadiness.checks.filter((c) => c.availability === "manual");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!manual.length) return null;

  async function confirm(checkKey: string, confirmed: boolean) {
    setBusy(checkKey);
    setMessage(null);
    const res = await fetch("/api/dashboard/revenue-command-center", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "confirmation", checkKey, confirmed }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMessage(json.message || "Could not save that confirmation.");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="mt-6 pt-5 border-t border-black/[0.08]">
      <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">Founder confirmation</p>
      {message ? (
        <p className="text-[12px] mb-2" style={{ color: PLAN_COLORS.terracotta }}>
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {manual.map((check) => (
          <button
            key={check.key}
            type="button"
            disabled={busy === check.key}
            onClick={() => confirm(check.key, !check.passed)}
            className="text-[11px] border border-black/15 rounded-md px-2.5 py-1.5 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
          >
            {check.passed ? "Unconfirm" : "Confirm"}: {check.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RecordForms({ bundle }: { bundle: CommandCenterBundle }) {
  const [open, setOpen] = useState<"deal" | "payment" | "activity" | null>(null);

  return (
    <HqCard title="Record revenue">
      <p className="text-[11px] text-black/45 mb-3 leading-relaxed">
        Manual entry for anything without an integration: creator or brand partnerships, payments, opportunity
        updates and activity. Records are marked as manual in the data layer.
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "deal", label: "Add opportunity" },
            { key: "payment", label: "Record payment" },
            { key: "activity", label: "Log activity" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setOpen(open === item.key ? null : item.key)}
            aria-expanded={open === item.key}
            className={`text-xs tracking-wide border rounded-md px-3 py-2 transition-colors ${
              open === item.key ? "bg-black text-white border-black" : "border-black/15 hover:bg-black/[0.04]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {open === "deal" ? <DealForm bundle={bundle} /> : null}
      {open === "payment" ? <PaymentForm bundle={bundle} /> : null}
      {open === "activity" ? <ActivityForm bundle={bundle} /> : null}
    </HqCard>
  );
}

const FIELD =
  "mt-1 w-full bg-white border border-black/15 rounded-md px-2.5 py-2 text-base sm:text-[13px] text-black";
const LABEL = "text-[10px] tracking-[0.12em] uppercase text-black/45 block";

function useSubmit() {
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(method: "POST" | "PATCH", payload: Record<string, unknown>) {
    setState("saving");
    setError(null);
    const res = await fetch("/api/dashboard/revenue-command-center", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState("idle");
      setError(json.message || "Could not save this record.");
      return false;
    }
    setState("done");
    window.location.reload();
    return true;
  }

  return { state, error, send };
}

function DealForm({ bundle }: { bundle: CommandCenterBundle }) {
  const { state, error, send } = useSubmit();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await send("POST", { kind: "deal", ...data });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid sm:grid-cols-2 gap-3 max-w-2xl">
      <label className={LABEL}>
        Company
        <input required name="companyName" className={FIELD} />
      </label>
      <label className={LABEL}>
        Opportunity
        <input name="opportunity" placeholder="Founding Material Data Pilot" className={FIELD} />
      </label>
      <label className={LABEL}>
        Amount (USD)
        <input required name="amount" type="number" min="0" step="100" className={FIELD} />
      </label>
      <label className={LABEL}>
        Revenue stream
        <select name="revenueStream" className={FIELD} defaultValue="api_pilot">
          {REVENUE_STREAMS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} ({s.scope === "personal" ? "personal" : "company"})
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        Stage
        <select name="stage" className={FIELD} defaultValue="qualified">
          {bundle.stages.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} · {formatPercent(s.probability)}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        Expected close
        <input name="expectedCloseDate" type="date" className={FIELD} />
      </label>
      <label className={LABEL}>
        Next action
        <input name="nextAction" placeholder="Send pilot proposal" className={FIELD} />
      </label>
      <label className={LABEL}>
        Next action due
        <input name="nextActionAt" type="date" className={FIELD} />
      </label>
      <SubmitRow state={state} error={error} label="Save opportunity" />
    </form>
  );
}

function PaymentForm({ bundle }: { bundle: CommandCenterBundle }) {
  const { state, error, send } = useSubmit();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await send("POST", { kind: "payment", ...data });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid sm:grid-cols-2 gap-3 max-w-2xl">
      <label className={LABEL}>
        Opportunity
        <select name="dealId" className={FIELD} defaultValue="">
          <option value="">Not linked to an opportunity</option>
          {bundle.deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.companyName} · {formatPlanMoney(deal.amount)}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        Revenue stream
        <select name="revenueStream" className={FIELD} defaultValue="api_pilot">
          {REVENUE_STREAMS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        Amount (USD)
        <input required name="amount" type="number" step="0.01" className={FIELD} />
      </label>
      <label className={LABEL}>
        Type
        <select name="kind" className={FIELD} defaultValue="payment">
          <option value="payment">Payment</option>
          <option value="refund">Refund</option>
        </select>
      </label>
      <label className={LABEL}>
        Status
        <select name="status" className={FIELD} defaultValue="cleared">
          <option value="cleared">Cleared</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </label>
      <label className={LABEL}>
        Paid on
        <input name="paidAt" type="date" className={FIELD} />
      </label>
      <label className={LABEL}>
        Invoice reference
        <input name="invoiceReference" className={FIELD} />
      </label>
      <div className="sm:col-span-2">
        <p className="text-[11px] text-black/45 leading-relaxed">
          Only cleared payments count as cash collected. A refund is stored as a negative amount and reduces
          collected cash without changing booked revenue. Partial payments are separate rows against the same
          opportunity.
        </p>
      </div>
      <SubmitRow state={state} error={error} label="Save payment" />
    </form>
  );
}

function ActivityForm({ bundle }: { bundle: CommandCenterBundle }) {
  const { state, error, send } = useSubmit();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await send("POST", { kind: "activity", ...data });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid sm:grid-cols-2 gap-3 max-w-2xl">
      <label className={LABEL}>
        Activity
        <select name="activityType" className={FIELD} defaultValue="personalized_outreach">
          <option value="qualified_account">Qualified account scored</option>
          <option value="personalized_outreach">Personalized outreach sent</option>
          <option value="snapshot_sent">Snapshot sent</option>
          <option value="meeting">Meeting completed</option>
          <option value="proposal">Proposal sent</option>
        </select>
      </label>
      <label className={LABEL}>
        Completed on
        <input name="completedAt" type="date" className={FIELD} />
      </label>
      <label className={LABEL}>
        Opportunity
        <select name="dealId" className={FIELD} defaultValue="">
          <option value="">Not linked</option>
          {bundle.deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.companyName}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        Note
        <input name="notes" className={FIELD} />
      </label>
      <SubmitRow state={state} error={error} label="Log activity" />
    </form>
  );
}

function SubmitRow({
  state,
  error,
  label,
}: {
  state: "idle" | "saving" | "done";
  error: string | null;
  label: string;
}) {
  return (
    <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={state !== "idle"}
        className="text-xs tracking-widest uppercase bg-black text-white rounded-md px-4 py-2.5 disabled:opacity-50"
      >
        {state === "saving" ? "Saving…" : label}
      </button>
      {error ? (
        <span className="text-[12px]" style={{ color: PLAN_COLORS.terracotta }}>
          {error}
        </span>
      ) : null}
      <LegendItem color={PLAN_COLORS.gold} label="Stored as manual entry" />
    </div>
  );
}
