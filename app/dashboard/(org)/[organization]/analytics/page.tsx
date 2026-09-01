import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { passportStateLabel } from "../../../../../lib/enterprise/issue-copy";
import { loadOrgAnalytics } from "../../../../../lib/enterprise/module-queries";
import {
  ACTIVITY_COLORS,
  EntAreaChart,
  EntDonutChart,
  EntRadialActivityChart,
  EntRoundedBarChart,
  EntStackedBarChart,
  ISSUE_COLORS,
  LIFECYCLE_COLORS,
} from "../../../components/EnterpriseCharts";
import {
  EntModulePage,
  EntVisualPanel,
  entLinkClass,
} from "../../../components/EnterpriseModuleUi";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const data = await loadOrgAnalytics(client, membership.organizationId);
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
    { label: "Imports", value: data.activityCounts.imports, color: ACTIVITY_COLORS.imports },
    { label: "Publishes", value: data.activityCounts.publishes, color: ACTIVITY_COLORS.publishes },
    { label: "Updates", value: data.activityCounts.updates, color: ACTIVITY_COLORS.updates },
    { label: "Reviews", value: data.activityCounts.reviews, color: ACTIVITY_COLORS.reviews },
    { label: "Other", value: data.activityCounts.other, color: ACTIVITY_COLORS.other },
  ].filter((row) => row.value > 0);

  const totalStates = stateRows.reduce((sum, row) => sum + row.value, 0);

  return (
    <EntModulePage
      title="Analytics"
      description="Operational metrics from your catalog, passports, issues, and recorded activity."
      zone="butter"
    >
      <div className="grid lg:grid-cols-2 gap-5 md:gap-6 mb-6">
        <EntVisualPanel tone="blush" title="Catalog overview" subtitle="Active products and import history">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="ent-panel-nested px-5 py-6">
              <p className="ent-display text-[3rem] leading-none text-[var(--ent-ink)]">{data.catalog.total}</p>
              <p className="text-sm text-[var(--ent-muted)] mt-2">Total products</p>
            </div>
            <div className="ent-panel-nested px-5 py-6">
              <p className="ent-display text-[3rem] leading-none text-[var(--ent-petrol-deep)]">{data.catalog.imports}</p>
              <p className="text-sm text-[var(--ent-muted)] mt-2">Catalog imports</p>
            </div>
          </div>
        </EntVisualPanel>

        <EntVisualPanel tone="petrol" title="Passport states" subtitle="Published, ready, and incomplete">
          <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
            <EntDonutChart
              light={false}
              segments={[
                { key: "published", label: "Published", value: data.passports.published, color: LIFECYCLE_COLORS.published },
                { key: "ready", label: "Ready", value: data.passports.ready, color: "#8eb4ba" },
                { key: "incomplete", label: "Incomplete", value: data.passports.incomplete, color: "rgba(255,255,255,0.35)" },
                { key: "update", label: "Update required", value: data.passports.updateRequired, color: LIFECYCLE_COLORS.update_required },
              ].filter((s) => s.value > 0)}
              centerValue={String(data.passports.published + data.passports.ready)}
              centerLabel="Ready or live"
              size={200}
              strokeWidth={24}
            />
            <ul className="space-y-3 text-sm text-white/75">
              <li className="flex justify-between"><span>Published</span><span className="tabular-nums text-white">{data.passports.published}</span></li>
              <li className="flex justify-between"><span>Ready to publish</span><span className="tabular-nums text-white">{data.passports.ready}</span></li>
              <li className="flex justify-between"><span>Incomplete</span><span className="tabular-nums text-white">{data.passports.incomplete}</span></li>
              <li className="flex justify-between"><span>Update required</span><span className="tabular-nums text-white">{data.passports.updateRequired}</span></li>
            </ul>
          </div>
        </EntVisualPanel>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5 md:gap-6 mb-6">
        <EntVisualPanel tone="cream" title="Product state distribution" subtitle="Share of catalog by passport workflow state">
          {totalStates > 0 ? (
            <div className="space-y-8">
              <EntAreaChart rows={stateRows} height={200} gradientId="analytics-area" />
              <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center">
                <EntDonutChart segments={stateRows} centerValue={String(totalStates)} centerLabel="Products" size={220} strokeWidth={26} />
                <EntRoundedBarChart rows={stateRows.map((r) => ({ label: r.label, value: r.value, color: r.color }))} height={120} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--ent-muted)]">No products in catalog yet.</p>
          )}
        </EntVisualPanel>

        <EntVisualPanel tone="stone" title="Issue mix" subtitle="Open, resolved, and conflict findings">
          {issueRows.length > 0 ? (
            <EntStackedBarChart rows={issueRows} tall />
          ) : (
            <p className="text-sm text-[var(--ent-muted)]">No issues recorded.</p>
          )}
        </EntVisualPanel>
      </div>

      <EntVisualPanel tone="butter" title="Activity composition" subtitle="Recent event types from the last recorded sample — not a historical trend">
        <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center">
          <EntRadialActivityChart rows={activityRows} size={220} />
          {activityRows.length > 0 ? (
            <EntStackedBarChart rows={activityRows} tall />
          ) : (
            <p className="text-sm text-[var(--ent-muted)]">No activity events yet.</p>
          )}
        </div>
      </EntVisualPanel>

      <Link href={`${base}/activity`} className={`${entLinkClass} mt-10 inline-flex`}>
        View full activity feed →
      </Link>
    </EntModulePage>
  );
}
