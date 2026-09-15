import { WhatItIsProcessVisual } from "./b2b-visuals/WhatItIsProcessVisual";
import { PlatformCapabilityNav } from "./PlatformCapabilityNav";
import { PlatformIntelligenceLayer } from "./intelligence/PlatformIntelligenceLayer";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink } from "./platform-ui";
import "./platform-intelligence.css";

const LIFECYCLE_PILLARS = [
  ["Create", "Capture and structure product data"],
  ["Verify", "Find gaps before they become risk"],
  ["Comply", "Prepare products for trust and regulation"],
  ["Distribute", "One record, every channel"],
  ["Extend", "Support the product after the sale"],
] as const;

const INTELLIGENCE_PILLARS = [
  ["Analyze", "Surface patterns across your catalog"],
  ["Benchmark", "Compare against peer performance"],
  ["Forecast", "Model demand and material trends"],
  ["Recommend", "Prioritize actions with confidence"],
  ["Act", "Execute from governed evidence"],
] as const;

function ProductStoryPillars({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <ul className="platform-editorial-pillars grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
      {items.map(([label, detail]) => (
        <li key={label} className="border-t border-[var(--platform-border)] pt-4">
          <span className="block text-[11px] tracking-[0.12em] uppercase text-[var(--platform-primary)] mb-1.5">
            {label}
          </span>
          <span className="block text-[13px] text-[var(--platform-quiet)] font-light leading-snug">{detail}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlatformHowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-28 platform-product-story platform-what-it-is platform-abstract-band itx-abstract-motif py-12 sm:py-16 lg:py-24 border-b border-[#e8e3da]/60"
    >
      <div className="relative max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="max-w-2xl lg:max-w-3xl mb-8 lg:mb-10">
          <Eyebrow>How INTERTEXE works</Eyebrow>
          <Heading className="mb-4">From raw product data to intelligent action.</Heading>
          <Body className="mb-8">
            INTERTEXE structures, verifies, and governs product data across the full lifecycle, then turns that trusted
            data into compliance readiness, consumer experiences, and AI-powered decisions.
          </Body>
          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryLink href="/platform/request?intent=snapshot&cta=how_it_works">Start with 10 products</PrimaryLink>
            <SecondaryLink href="/platform/demo">See it live</SecondaryLink>
          </div>
        </div>

        <div className="platform-product-story-lifecycle">
          <header className="platform-product-story-phase-head">
            <p className="platform-product-story-phase-kicker">Product data infrastructure</p>
            <p className="platform-product-story-flow-line">
              <span>Raw data</span>
              <span className="platform-product-story-flow-arrow" aria-hidden>→</span>
              <span>Governed record</span>
              <span className="platform-product-story-flow-arrow" aria-hidden>→</span>
              <span>Passport · API · consumer</span>
            </p>
          </header>

          <ProductStoryPillars items={LIFECYCLE_PILLARS} />

          <div className="mt-8 lg:mt-10 mb-0">
            <WhatItIsProcessVisual />
          </div>
        </div>

        <div className="platform-product-story-bridge" aria-hidden>
          <div className="platform-product-story-bridge-line" />
          <div className="platform-product-story-bridge-node">
            <span className="platform-product-story-bridge-label">Trusted data layer</span>
            <span className="platform-product-story-bridge-chevron">↓</span>
          </div>
          <div className="platform-product-story-bridge-line platform-product-story-bridge-line--fade" />
        </div>

        <div className="platform-product-story-intelligence" id="material-intelligence">
          <header className="platform-product-story-phase-head platform-product-story-phase-head--intel">
            <p className="platform-product-story-phase-kicker">Material intelligence</p>
            <p className="platform-product-story-flow-line">
              <span>Analyze</span>
              <span className="platform-product-story-flow-arrow" aria-hidden>→</span>
              <span>Benchmark</span>
              <span className="platform-product-story-flow-arrow" aria-hidden>→</span>
              <span>Forecast</span>
              <span className="platform-product-story-flow-arrow" aria-hidden>→</span>
              <span>Recommend</span>
              <span className="platform-product-story-flow-arrow" aria-hidden>→</span>
              <span>Act</span>
            </p>
          </header>

          <div className="mb-8 lg:mb-10">
            <ProductStoryPillars items={INTELLIGENCE_PILLARS} />
          </div>

          <PlatformIntelligenceLayer />
        </div>

        <PlatformCapabilityNav className="mt-10 sm:mt-12 lg:mt-14" />
      </div>
    </section>
  );
}
