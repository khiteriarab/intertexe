import Link from "next/link";
import type { OrgOverviewData } from "../../../lib/enterprise/queries";
import type { CatalogCompositionStats } from "../../../lib/enterprise/composition-benchmark";
import { entLinkClass } from "./EnterpriseUi";

export function EntPilotFindings({
  base,
  overview,
  composition,
}: {
  base: string;
  overview: OrgOverviewData;
  composition: { stats: CatalogCompositionStats };
}) {
  if (overview.productCount === 0) return null;

  const readyOrPublished = overview.readyCount + overview.publishedCount;
  const readinessPct = Math.round((readyOrPublished / overview.productCount) * 100);
  const naturalShare = composition.stats.naturalFiberShare;

  const findings = [
    {
      label: "Products in workspace",
      value: String(overview.productCount),
      detail: "Imported and normalized in your pilot catalog",
    },
    {
      label: "Open issues",
      value: String(overview.issueCount),
      detail: overview.issueCount ? "Conflicts and gaps surfaced — not overwritten" : "No blocking findings right now",
    },
    {
      label: "Passport-ready",
      value: `${readinessPct}%`,
      detail: `${readyOrPublished} products ready or published`,
    },
    {
      label: "Material coverage",
      value: composition.stats.compositionCoveragePct != null ? `${composition.stats.compositionCoveragePct}%` : "—",
      detail:
        naturalShare != null ? `${naturalShare}% natural fiber share across catalog` : "Composition data still filling in",
    },
  ];

  return (
    <section className="ent-pilot-findings mb-10 md:mb-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
        <div>
          <p className="ent-section-eyebrow">What INTERTEXE found</p>
          <h2 className="ent-serif text-[1.65rem] md:text-[1.85rem] text-[var(--ent-ink)] leading-tight">
            Intelligence from your first {overview.productCount} products
          </h2>
        </div>
        <Link href={`${base}/upgrade`} className={entLinkClass}>
          Continue beyond 10 products →
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {findings.map((item) => (
          <article key={item.label} className="ent-pilot-finding-card">
            <p className="ent-pilot-finding-label">{item.label}</p>
            <p className="ent-pilot-finding-value">{item.value}</p>
            <p className="ent-pilot-finding-detail">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
