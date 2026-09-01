import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { passportStateLabel } from "../../../../../lib/enterprise/issue-copy";
import { loadOrgBenchmarking } from "../../../../../lib/enterprise/module-queries";
import { EntDonutChart, EntStackedBarChart, LIFECYCLE_COLORS } from "../../../components/EnterpriseCharts";
import {
  EntEmptyState,
  EntModuleMetrics,
  EntModulePage,
  EntVisualPanel,
  entLinkClass,
} from "../../../components/EnterpriseModuleUi";

export const dynamic = "force-dynamic";

export default async function BenchmarkingPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const data = await loadOrgBenchmarking(client, membership.organizationId);
  const base = `/dashboard/${membership.slug}`;

  const stateRows = Object.entries(data.byState)
    .filter(([, value]) => value > 0)
    .map(([state, value]) => ({
      key: state,
      label: passportStateLabel(state),
      value,
      color: LIFECYCLE_COLORS[state as keyof typeof LIFECYCLE_COLORS] || "rgba(154, 148, 140, 0.45)",
    }));

  return (
    <EntModulePage
      title="Benchmarking"
      description="Portfolio benchmarks from your catalog — internal comparisons, not industry or competitor data."
      zone="butter"
    >
      {data.productCount === 0 ? (
        <EntEmptyState
          title="No catalog to benchmark yet"
          body="Import products to see passport readiness and category distribution across your portfolio."
          ctaHref={`${base}/products`}
          ctaLabel="Go to Products"
        />
      ) : (
        <>
          <EntModuleMetrics
            items={[
              { label: "Products in catalog", value: data.productCount },
              { label: "Published", value: `${data.publishedPct}%`, accent: true },
              { label: "Ready to publish", value: `${data.readyPct}%` },
              {
                label: "Data completeness",
                value: data.completenessBuckets.high + data.completenessBuckets.mid,
                hint: `${data.completenessBuckets.unknown} without score`,
              },
            ]}
          />

          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-5 md:gap-6 mb-6">
            <EntVisualPanel tone="blush" title="Passport readiness" subtitle="Share of catalog by workflow state">
              <EntDonutChart
                segments={stateRows}
                centerValue={`${data.publishedPct}%`}
                centerLabel="Published"
                size={240}
              />
            </EntVisualPanel>
            <EntVisualPanel tone="stone" title="State distribution">
              <EntStackedBarChart rows={stateRows} tall />
            </EntVisualPanel>
          </div>

          <EntVisualPanel tone="cream" title="By category">
            <ul className="space-y-3">
              {data.categoryRows.map((row) => (
                <li key={row.category} className="ent-panel-nested px-5 py-4 grid sm:grid-cols-[1.2fr_repeat(4,auto)] gap-3 items-baseline text-sm">
                  <span className="font-medium text-[var(--ent-ink)]">{row.category}</span>
                  <span className="text-[var(--ent-muted)]">{row.total} products</span>
                  <span className="text-[var(--ent-muted)]">{row.published} published</span>
                  <span className="text-[var(--ent-muted)]">{row.ready} ready</span>
                  <span className="text-[var(--ent-muted)]">{row.openIssues} open issues</span>
                </li>
              ))}
            </ul>
          </EntVisualPanel>

          <Link href={`${base}/analytics`} className={`${entLinkClass} mt-10 inline-flex`}>
            View analytics →
          </Link>
        </>
      )}
    </EntModulePage>
  );
}
