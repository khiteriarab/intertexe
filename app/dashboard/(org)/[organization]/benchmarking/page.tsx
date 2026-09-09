import Link from "next/link";
import { Suspense } from "react";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { resolveBenchmarkSegmentSelection } from "../../../../../lib/enterprise/benchmark-segments";
import { loadCategoryBenchmarkDrilldown } from "../../../../../lib/enterprise/category-benchmark";
import { loadOrgCompositionBenchmark } from "../../../../../lib/enterprise/composition-benchmark";
import { loadConversionIndexByCohort } from "../../../../../lib/enterprise/conversion-cohorts";
import {
  imageMapFromLiveFixture,
  loadConsumerSignals,
} from "../../../../../lib/enterprise/consumer-signals";
import livePilotProducts from "../../../../../lib/enterprise/fixtures/intertexe-live-10-products.json";
import { passportStateLabel } from "../../../../../lib/enterprise/issue-copy";
import { loadOrgBenchmarking } from "../../../../../lib/enterprise/module-queries";
import { pageStateForNavHref } from "../../../../../lib/enterprise/page-states";
import { EntCategoryBenchmarkDrilldown } from "../../../components/EntCategoryBenchmarkDrilldown";
import { EntConsumerSignals } from "../../../components/EntConsumerSignals";
import { EntConversionCohortTable } from "../../../components/EntConversionCohortTable";
import { EntDualModelFlywheel } from "../../../components/EntDualModelFlywheel";
import { EntFabricPeerComparison } from "../../../components/EntFabricBenchmark";
import { EntPeerSegmentPicker } from "../../../components/EntPeerSegmentPicker";
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
  searchParams,
}: {
  params: Promise<{ organization: string }>;
  searchParams: Promise<{ market?: string; segment?: string }>;
}) {
  const { organization } = await params;
  const query = await searchParams;
  const selection = resolveBenchmarkSegmentSelection(query);
  const { membership, client } = await requireOrganizationAccess(organization);
  const imageBySku = imageMapFromLiveFixture(livePilotProducts);
  const [data, composition, signals, conversionCohorts] = await Promise.all([
    loadOrgBenchmarking(client, membership.organizationId),
    loadOrgCompositionBenchmark(client, membership.organizationId, membership.plan, {
      market: selection.market,
      peerSegment: selection.peerSegment,
    }),
    loadConsumerSignals(client, membership.organizationId, { limit: 10, imageBySku }),
    loadConversionIndexByCohort(client, selection),
  ]);
  const categoryDrilldown = await loadCategoryBenchmarkDrilldown(client, selection, data.categoryRows);
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
    <EntModulePage title="Benchmarking" state={pageStateForNavHref("benchmarking")}>
      {data.productCount === 0 ? (
        <EntEmptyState
          title="No catalog to benchmark yet"
          body="Import products to see passport readiness, fiber composition, consumer signals, and peer comparisons."
          ctaHref={`${base}/products`}
          ctaLabel="Go to Products"
        />
      ) : (
        <>
          <Suspense fallback={null}>
            <EntPeerSegmentPicker market={selection.market} peerSegment={selection.peerSegment} />
          </Suspense>

          <EntDualModelFlywheel base={base} />

          <EntConsumerSignals base={base} signals={signals} />

          <EntFabricPeerComparison
            fiberRows={composition.stats.fiberRows}
            peerRows={composition.peerRows}
            market={composition.market}
            marketLabel={composition.marketLabel}
            segmentLabel={composition.segmentLabel}
            base={base}
          />

          <div className="mb-10 max-w-2xl">
            <EntConversionCohortTable bundle={conversionCohorts} />
          </div>

          <EntModuleMetrics
            items={[
              { label: "Products in catalog", value: data.productCount },
              { label: "Composition coverage", value: `${composition.stats.compositionCoveragePct ?? 0}%` },
              { label: "Natural fiber share", value: `${composition.stats.naturalFiberShare ?? 0}%`, accent: true },
              {
                label: "Published",
                value: `${data.publishedPct}%`,
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

          <EntCategoryBenchmarkDrilldown bundle={categoryDrilldown} />

          <Link href={`${base}/analytics`} className={`${entLinkClass} mt-10 inline-flex`}>
            View analytics →
          </Link>
        </>
      )}
    </EntModulePage>
  );
}
