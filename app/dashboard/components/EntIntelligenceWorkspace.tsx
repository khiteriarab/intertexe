import Link from "next/link";
import type { PlatformIntelligenceLayer } from "../../../lib/enterprise/platform-intelligence";
import {
  EntAskIntertexeCard,
  EntDemandForecastCard,
  EntEvidenceConfidenceCard,
  EntIntelligenceBriefCard,
  EntMaterialBenchmarkModule,
  EntRecommendedActionsCard,
} from "./EntIntelligenceModules";
import "../enterprise-intelligence.css";

type Props = {
  data: PlatformIntelligenceLayer;
  base: string;
  variant?: "home" | "full";
};

export function EntIntelligenceWorkspace({ data, base, variant = "full" }: Props) {
  const unavailable = data.status === "unavailable";
  const benchmarkHref = `${base}/benchmarking`;
  const productsHref = `${base}/products`;
  const evidenceHref = `${base}/traceability`;

  return (
    <section className="ent-intelligence-section" id="material-intelligence">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="ent-section-eyebrow">Material intelligence</p>
          <h2 className={variant === "full" ? "ent-title text-[1.75rem] md:text-[2rem] text-[var(--ent-ink)]" : "ent-section-title"}>
            {variant === "full" ? "Know what to make next." : "INTERTEXE AI decision layer"}
          </h2>
          <p className="text-sm text-[var(--ent-muted)] mt-2 max-w-2xl leading-relaxed">
            Live intelligence from your catalog, peer benchmarks, conversion signals, traceability, and regulatory
            readiness — every recommendation links to governed evidence in your workspace.
          </p>
        </div>
        {variant === "home" ? (
          <Link href={`${base}/intelligence`} className="ent-link-subtle shrink-0 text-sm">
            Open intelligence hub →
          </Link>
        ) : null}
      </div>

      {unavailable ? (
        <div className="ent-widget-card p-6 md:p-8">
          <p className="ent-intel-unavailable mb-0">
            Import products and connect supplier evidence to activate the intelligence workspace. Benchmarks and
            recommendations assemble from your governed catalog — not generic generative output.
          </p>
          <Link href={`${base}/products`} className="ent-btn ent-btn-primary inline-flex mt-6 text-sm">
            Import catalog →
          </Link>
        </div>
      ) : (
        <>
          <div className="ent-intelligence-grid">
            <EntIntelligenceBriefCard brief={data.intelligenceBrief} />
            <EntRecommendedActionsCard recommendations={data.recommendations} />
            <EntMaterialBenchmarkModule benchmark={data.benchmark} benchmarkHref={benchmarkHref} />
            <EntDemandForecastCard forecast={data.forecast} />
            <EntAskIntertexeCard suggestedQueries={data.suggestedQueries} searchHref={productsHref} />
            <EntEvidenceConfidenceCard
              confidence={data.confidence}
              evidenceSources={data.evidenceSources}
              evidenceHref={evidenceHref}
            />
          </div>
          {data.source === "org_live" ? (
            <p className="ent-intel-live-note">
              Assembled from your organization catalog, governed peer benchmarks, conversion cohorts, traceability
              nodes, and open issues. Updated when you refresh this page.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
