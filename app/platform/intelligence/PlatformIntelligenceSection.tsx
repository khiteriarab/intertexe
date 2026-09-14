import Link from "next/link";
import { getPlatformIntelligencePreview } from "../../../lib/enterprise/platform-intelligence";
import { getEnterpriseLoginUrl } from "../../../lib/platform-urls";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink } from "../platform-ui";
import {
  AskIntertexeCard,
  DemandForecastCard,
  EvidenceConfidenceCard,
  IntelligenceBriefCard,
  MaterialBenchmarkModule,
  RecommendedActionsCard,
} from "./PlatformIntelligenceModules";
import "../platform-intelligence.css";

export function PlatformIntelligenceSection() {
  const data = getPlatformIntelligencePreview();
  const isPreview = data.status === "preview";

  return (
    <section id="material-intelligence" className="platform-intelligence-section py-12 sm:py-16 lg:py-24 border-y border-[var(--platform-border)]/60">
      <div className="platform-intelligence-hero-bg" aria-hidden />
      <div className="platform-intelligence-fabric" aria-hidden />

      <div className="relative max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="max-w-3xl mb-10 sm:mb-12 lg:mb-14">
          <Eyebrow>Material intelligence</Eyebrow>
          <Heading className="mb-5">Know what to make next.</Heading>
          <Body className="mb-8 max-w-2xl">
            INTERTEXE AI analyzes your catalog, peer performance, consumer demand, material composition and regulatory
            readiness to surface opportunities, risks and recommended actions.
          </Body>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <PrimaryLink href="/platform/demo">See it in action →</PrimaryLink>
            <SecondaryLink href="/platform/demo#benchmark">Explore materials →</SecondaryLink>
          </div>
        </div>

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
          INTERTEXE sees the data → explains what matters → predicts what is coming → recommends what to do. Every
          recommendation links to governed evidence in your workspace.{" "}
          <Link href="/platform/demo" className="underline underline-offset-2 hover:text-[var(--platform-ink)]">
            Tour the live demo
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
