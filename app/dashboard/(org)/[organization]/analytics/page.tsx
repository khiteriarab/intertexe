import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { passportStateLabel } from "../../../../../lib/enterprise/issue-copy";
import { loadOrgAnalytics } from "../../../../../lib/enterprise/module-queries";
import { EntStackedBarChart, LIFECYCLE_COLORS } from "../../../components/EnterpriseCharts";
import {
  EntModuleMetrics,
  EntModulePage,
  EntModuleSection,
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

  const stateRows = Object.entries(data.overview.productStateCounts).map(([state, value]) => ({
    label: passportStateLabel(state),
    value,
    color: LIFECYCLE_COLORS[state as keyof typeof LIFECYCLE_COLORS] || "rgba(154, 148, 140, 0.45)",
  }));

  return (
    <EntModulePage
      title="Analytics"
      description="Operational metrics from your organization's current catalog, passports, issues, and recorded activity."
    >
      <EntModuleMetrics
        items={[
          { label: "Total products", value: data.catalog.total },
          { label: "Published passports", value: data.passports.published },
          { label: "Open issues", value: data.issues.open },
          { label: "Catalog imports", value: data.catalog.imports },
        ]}
      />

      <div className="grid lg:grid-cols-2 gap-12 mb-12">
        <EntModuleSection title="Passports">
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span className="text-[var(--ent-muted)]">Published</span><span className="tabular-nums">{data.passports.published}</span></li>
            <li className="flex justify-between"><span className="text-[var(--ent-muted)]">Ready to publish</span><span className="tabular-nums">{data.passports.ready}</span></li>
            <li className="flex justify-between"><span className="text-[var(--ent-muted)]">Incomplete</span><span className="tabular-nums">{data.passports.incomplete}</span></li>
            <li className="flex justify-between"><span className="text-[var(--ent-muted)]">Update required</span><span className="tabular-nums">{data.passports.updateRequired}</span></li>
          </ul>
        </EntModuleSection>

        <EntModuleSection title="Issues">
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span className="text-[var(--ent-muted)]">Open</span><span className="tabular-nums">{data.issues.open}</span></li>
            <li className="flex justify-between"><span className="text-[var(--ent-muted)]">Resolved</span><span className="tabular-nums">{data.issues.resolved}</span></li>
            <li className="flex justify-between"><span className="text-[var(--ent-muted)]">Missing fields</span><span className="tabular-nums">{data.issues.missingFields}</span></li>
            <li className="flex justify-between"><span className="text-[var(--ent-muted)]">Conflicts</span><span className="tabular-nums">{data.issues.conflicts}</span></li>
          </ul>
        </EntModuleSection>
      </div>

      <EntModuleSection title="Product state distribution">
        <EntStackedBarChart rows={stateRows} />
      </EntModuleSection>

      <EntModuleSection title="Recorded activity (recent sample)">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
          <li><span className="text-[var(--ent-muted)]">Imports</span><p className="text-xl tabular-nums mt-1">{data.activityCounts.imports}</p></li>
          <li><span className="text-[var(--ent-muted)]">Publishes</span><p className="text-xl tabular-nums mt-1">{data.activityCounts.publishes}</p></li>
          <li><span className="text-[var(--ent-muted)]">Updates</span><p className="text-xl tabular-nums mt-1">{data.activityCounts.updates}</p></li>
          <li><span className="text-[var(--ent-muted)]">Reviews</span><p className="text-xl tabular-nums mt-1">{data.activityCounts.reviews}</p></li>
          <li><span className="text-[var(--ent-muted)]">Other</span><p className="text-xl tabular-nums mt-1">{data.activityCounts.other}</p></li>
        </ul>
        <p className="text-xs text-[var(--ent-muted-light)] mt-4">Counts derived from the most recent activity events. No historical trend chart is shown unless time-series data exists.</p>
      </EntModuleSection>

      <Link href={`${base}/activity`} className={entLinkClass}>
        View full activity feed →
      </Link>
    </EntModulePage>
  );
}
