import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadGovernedBenchmark } from "../../../../../lib/enterprise/benchmarks";
import { entitlementsForPlan, type PlanKey } from "../../../../../lib/enterprise/entitlements";
import { OrgSectionFrame } from "../section-frame";
import { ORG_PAGE_STATES } from "../../../../../lib/enterprise/page-states";

export const dynamic = "force-dynamic";

export default async function BenchmarkingPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { membership } = await requireOrganizationAccess((await params).organization);
  const entitlement = entitlementsForPlan(membership.plan as PlanKey);
  const benchmark = entitlement.canBenchmark
    ? await loadGovernedBenchmark({ metricKey: "material_mix_cotton", plan: membership.plan })
    : null;
  const emptyTitle = !entitlement.canBenchmark
    ? "Not included on this plan"
    : benchmark?.status === "ok"
      ? undefined
      : "Insufficient benchmark data";
  return (
    <OrgSectionFrame
      title="Benchmarking"
      description="Comparisons use approved aggregate datasets with methodology, sample size, category, market, and period. Identifiable customer organizations are never queried."
      state={ORG_PAGE_STATES.benchmarking}
      emptyTitle={emptyTitle}
      emptyBody={
        entitlement.canBenchmark
          ? "Peer values appear only from governed aggregates. This page does not read other brands’ catalogs."
          : "Material mix, data quality, passport program, circularity, and consumer demand sections will render only from approved aggregated datasets."
      }
    >
      {benchmark?.status === "ok" ? (
        <p className="text-sm mb-4">
          Cotton mix median {benchmark.value}% · sample {benchmark.sampleSize}
          {benchmark.methodology ? ` · ${benchmark.methodology}` : ""}
        </p>
      ) : null}
    </OrgSectionFrame>
  );
}
