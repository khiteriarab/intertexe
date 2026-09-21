import Link from "next/link";
import { getPlatformIntelligencePreview } from "../../../lib/enterprise/platform-intelligence";
import { getEnterpriseLoginUrl } from "../../../lib/platform-urls";
import {
  AskIntertexeCard,
  DemandForecastCard,
  EvidenceConfidenceCard,
  IntelligenceBriefCard,
  MaterialBenchmarkModule,
  RecommendedActionsCard,
} from "./PlatformIntelligenceModules";

/** Intelligence dashboard cards — embedded inside the unified product story section. */
export function PlatformIntelligenceLayer() {
  const data = getPlatformIntelligencePreview();
  const isPreview = data.status === "preview";

  return (
    <div className="platform-intelligence-layer">
      <div className="platform-intelligence-hero-bg platform-intelligence-hero-bg--embedded" aria-hidden />
      <div className="platform-intelligence-fabric platform-intelligence-fabric--embedded" aria-hidden />

      <div className="relative">
        <div className="platform-intelligence-grid">
          <IntelligenceBriefCard brief={data.intelligenceBrief} />
          <RecommendedActionsCard recommendations={data.recommendations} />
          <MaterialBenchmarkModule benchmark={data.benchmark} />
          <DemandForecastCard forecast={data.forecast} />
          <AskIntertexeCard suggestedQueries={data.suggestedQueries} signInHref={getEnterpriseLoginUrl()} />
          <EvidenceConfidenceCard confidence={data.confidence} evidenceSources={data.evidenceSources} />
        </div>

        {isPreview ? (
          <p className="platform-intel-preview-note">
            Preview assembled from Customer Zero governed catalog and benchmark datasets. Signed-in workspaces receive
            live intelligence from your product record, peer segments, traceability, and regulatory readiness — not
            generic generative output.
          </p>
        ) : null}

        <p className="mt-6 text-xs text-[var(--platform-quiet)] leading-relaxed max-w-3xl">
          Every recommendation links to governed evidence in your workspace.{" "}
          <Link href="/brands/demo" className="underline underline-offset-2 hover:text-[var(--platform-ink)]">
            Tour the live demo
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
