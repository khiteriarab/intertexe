import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { passportStateLabel } from "../../../../../lib/enterprise/issue-copy";
import { loadDecisionIntelligence } from "../../../../../lib/enterprise/decision-intelligence";
import { loadOrgAnalytics } from "../../../../../lib/enterprise/module-queries";
import {
  imageMapFromLiveFixture,
  loadConsumerSignals,
} from "../../../../../lib/enterprise/consumer-signals";
import livePilotProducts from "../../../../../lib/enterprise/fixtures/intertexe-live-10-products.json";
import {
  EntDonutChart,
  EntRadialActivityChart,
  EntRoundedBarChart,
  ISSUE_COLORS,
  LIFECYCLE_COLORS,
} from "../../../components/EnterpriseCharts";
import { EntModulePage, entLinkClass } from "../../../components/EnterpriseModuleUi";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const imageBySku = imageMapFromLiveFixture(livePilotProducts);
  const [data, signals, decisions] = await Promise.all([
    loadOrgAnalytics(client, membership.organizationId),
    loadConsumerSignals(client, membership.organizationId, { limit: 10, imageBySku }),
    loadDecisionIntelligence(client, membership.organizationId, membership.slug),
  ]);
  const base = `/dashboard/${membership.slug}`;

  const stateRows = Object.entries(data.overview.productStateCounts)
    .filter(([, value]) => value > 0)
    .map(([state, value]) => ({
      key: state,
      label: passportStateLabel(state),
      value,
      color: LIFECYCLE_COLORS[state as keyof typeof LIFECYCLE_COLORS] || "rgba(154, 148, 140, 0.45)",
    }));

  const issueRows = [
    { key: "open", label: "Open", value: data.issues.open, color: ISSUE_COLORS.open },
    { key: "resolved", label: "Resolved", value: data.issues.resolved, color: ISSUE_COLORS.resolved },
    { key: "missing", label: "Missing fields", value: data.issues.missingFields, color: ISSUE_COLORS.missing },
    { key: "conflicts", label: "Conflicts", value: data.issues.conflicts, color: ISSUE_COLORS.conflicts },
  ].filter((row) => row.value > 0);

  const activityRows = [
    { label: "Imports", value: data.activityCounts.imports, color: ISSUE_COLORS.open },
    { label: "Publishes", value: data.activityCounts.publishes, color: LIFECYCLE_COLORS.published },
    { label: "Updates", value: data.activityCounts.updates, color: ISSUE_COLORS.missing },
    { label: "Reviews", value: data.activityCounts.reviews, color: ISSUE_COLORS.conflicts },
    { label: "Other", value: data.activityCounts.other, color: "rgba(154, 148, 140, 0.45)" },
  ].filter((row) => row.value > 0);

  const totalStates = stateRows.reduce((sum, row) => sum + row.value, 0);
  const readyOrLive = data.passports.published + data.passports.ready;
  const readyPct = data.catalog.total > 0 ? Math.round((readyOrLive / data.catalog.total) * 100) : 0;

  return (
    <EntModulePage
      title="Analytics"
      meta={
        <>
          <span>
            <strong>{readyPct}%</strong> passport-ready
          </span>
          <span>
            <strong>{data.issues.open}</strong> open issues
          </span>
          <span>
            <strong>{data.catalog.imports}</strong> imports
          </span>
        </>
      }
    >
      {decisions.length > 0 ? (
        <section className="mb-10">
          <p className="ent-section-eyebrow mb-3">Decision intelligence</p>
          <ul className="grid md:grid-cols-2 gap-4">
            {decisions.slice(0, 6).map((insight) => (
              <li key={insight.id} className="ent-panel-nested p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--ent-ink)]">{insight.title}</p>
                    <p className="text-sm text-[var(--ent-muted)] mt-1">{insight.body}</p>
                  </div>
                  <span className="text-lg tabular-nums text-[var(--ent-petrol-deep)]">{insight.metric}</span>
                </div>
                <Link href={insight.href} className={`${entLinkClass} mt-4 inline-flex`}>
                  {insight.action} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {signals.summary.productCount > 0 ? (
        <section className="mb-10 rounded-[var(--ent-radius-2xl)] p-6 md:p-8 ent-animate-in border border-[var(--ent-border)] bg-[rgba(244,240,234,0.45)]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <p className="ent-section-eyebrow mb-2">Consumer layer</p>
              <h2 className="ent-widget-title">Material intelligence beyond compliance</h2>
              <p className="text-sm text-[var(--ent-muted)] mt-2 max-w-xl">
                Governed shopper signals layered on passport readiness — what pure B2B compliance tools cannot show.
              </p>
            </div>
            <Link href={`${base}/benchmarking`} className={entLinkClass}>
              Open signals & benchmarks →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="ent-panel-nested px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--ent-muted-light)]">Opportunity</p>
              <p className="ent-display text-2xl tabular-nums mt-1">{signals.summary.opportunityScore ?? "—"}</p>
            </div>
            <div className="ent-panel-nested px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--ent-muted-light)]">Avg natural</p>
              <p className="ent-display text-2xl tabular-nums mt-1">{signals.summary.avgNaturalPct ?? "—"}%</p>
            </div>
            <div className="ent-panel-nested px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--ent-muted-light)]">Active insights</p>
              <p className="ent-display text-2xl tabular-nums mt-1">{signals.insights.length}</p>
            </div>
            <div className="ent-panel-nested px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--ent-muted-light)]">Live products</p>
              <p className="ent-display text-2xl tabular-nums mt-1">{signals.summary.productCount}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 mb-10">
        <section className="ent-animate-in">
          <h2 className="ent-serif text-[1.35rem] text-[var(--ent-ink)] mb-2">How much of my catalog is passport-ready?</h2>
          <p className="text-sm text-[var(--ent-muted)] mb-6 max-w-lg">
            Share of active products that are ready to publish or already live.
          </p>
          {totalStates > 0 ? (
            <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center">
              <EntDonutChart
                segments={stateRows}
                centerValue={`${readyPct}%`}
                centerLabel="Ready"
                size={220}
                strokeWidth={26}
              />
              <EntRoundedBarChart rows={stateRows.map((r) => ({ label: r.label, value: r.value, color: r.color }))} height={140} />
            </div>
          ) : (
            <p className="text-sm text-[var(--ent-muted)]">No products in catalog yet.</p>
          )}
        </section>

        <section
          className="rounded-[var(--ent-radius-2xl)] p-6 md:p-8 ent-animate-in"
          style={{ background: "var(--ent-gradient-hero)" }}
        >
          <h2 className="ent-serif text-[1.35rem] text-white mb-2">Passport states</h2>
          <p className="text-sm text-white/65 mb-6">Published, ready, and incomplete today.</p>
          <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
            <EntDonutChart
              light={false}
              segments={[
                { key: "published", label: "Published", value: data.passports.published, color: LIFECYCLE_COLORS.published },
                { key: "ready", label: "Ready", value: data.passports.ready, color: "#8eb4ba" },
                { key: "incomplete", label: "Incomplete", value: data.passports.incomplete, color: "rgba(255,255,255,0.35)" },
                { key: "update", label: "Update required", value: data.passports.updateRequired, color: LIFECYCLE_COLORS.update_required },
              ].filter((s) => s.value > 0)}
              centerValue={String(readyOrLive)}
              centerLabel="Ready or live"
              size={180}
              strokeWidth={22}
            />
            <ul className="space-y-3 text-sm text-white/75">
              <li className="flex justify-between"><span>Published</span><span className="tabular-nums text-white">{data.passports.published}</span></li>
              <li className="flex justify-between"><span>Ready to publish</span><span className="tabular-nums text-white">{data.passports.ready}</span></li>
              <li className="flex justify-between"><span>Incomplete</span><span className="tabular-nums text-white">{data.passports.incomplete}</span></li>
              <li className="flex justify-between"><span>Update required</span><span className="tabular-nums text-white">{data.passports.updateRequired}</span></li>
            </ul>
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 pb-4">
        <section>
          <h2 className="ent-serif text-[1.35rem] text-[var(--ent-ink)] mb-2">Where are my data gaps?</h2>
          <p className="text-sm text-[var(--ent-muted)] mb-6">Open, resolved, and conflict findings in the catalog.</p>
          {issueRows.length > 0 ? (
            <EntRoundedBarChart rows={issueRows.map((r) => ({ label: r.label, value: r.value, color: r.color }))} height={120} />
          ) : (
            <p className="text-sm text-[var(--ent-muted)]">No issues recorded.</p>
          )}
        </section>

        <section>
          <h2 className="ent-serif text-[1.35rem] text-[var(--ent-ink)] mb-2">What has changed recently?</h2>
          <p className="text-sm text-[var(--ent-muted)] mb-6">Recent event types from recorded activity — not a time series.</p>
          {activityRows.length > 0 ? (
            <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
              <EntRadialActivityChart rows={activityRows} size={180} />
              <ul className="space-y-2 text-sm text-[var(--ent-muted)]">
                {activityRows.map((row) => (
                  <li key={row.label} className="flex justify-between gap-4">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-[var(--ent-ink)]">{row.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[var(--ent-muted)]">No activity events yet.</p>
          )}
        </section>
      </div>

      <Link href={`${base}/activity`} className={`${entLinkClass} mt-8 inline-flex`}>
        View full activity feed →
      </Link>
    </EntModulePage>
  );
}
