import Link from "next/link";
import { WhatItIsProcessVisual } from "./b2b-visuals/WhatItIsProcessVisual";
import { PlatformProductPillarsVisual } from "./b2b-visuals/PlatformProductPillarsVisual";
import { PlatformCapabilityNav } from "./PlatformCapabilityNav";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink } from "./platform-ui";

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
          <p className="platform-product-story-phase-kicker mb-6 lg:mb-8">
            One record · entire product lifecycle
          </p>
          <WhatItIsProcessVisual />
        </div>

        <div className="platform-workspace-merge mt-14 sm:mt-16 lg:mt-20 pt-12 sm:pt-14 border-t border-[var(--platform-border)]">
          <div className="max-w-3xl mb-8 lg:mb-10">
            <Eyebrow className="mb-4">One workspace</Eyebrow>
            <Heading className="mb-4 max-w-3xl">Three layers. One governed source of truth.</Heading>
            <Body className="max-w-2xl lg:max-w-3xl">
              INTERTEXE connects product creation, compliance, consumer transparency, and resale through the same record
              — grouped here as product intelligence, traceability, and connected lifecycle.
            </Body>
          </div>

          <PlatformProductPillarsVisual variant="light" />

          <p className="mt-8 lg:mt-10 text-sm text-[var(--platform-quiet)] leading-relaxed max-w-2xl">
            <Link href="/platform/demo" className="underline underline-offset-4 hover:text-[var(--platform-primary)]">
              See it live
            </Link>{" "}
            with sample products, or{" "}
            <Link
              href="/platform/request?intent=snapshot&cta=platform_breadth"
              className="underline underline-offset-4 hover:text-[var(--platform-primary)]"
            >
              start with 10 of your own products
            </Link>
            .
          </p>
        </div>

        <div className="platform-product-story-bridge mt-12 sm:mt-14" aria-hidden>
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

          <p className="text-sm text-[var(--platform-quiet)] leading-relaxed max-w-2xl">
            Brief, benchmark, forecast, and recommended actions live inside your INTERTEXE workspace — assembled from
            your governed catalog, not generic output.{" "}
            <Link href={getEnterpriseLoginUrl()} className="underline underline-offset-2 hover:text-[var(--platform-ink)]">
              Sign in to open intelligence
            </Link>{" "}
            or{" "}
            <Link href="/platform/demo" className="underline underline-offset-2 hover:text-[var(--platform-ink)]">
              tour the live demo
            </Link>
            .
          </p>
        </div>

        <PlatformCapabilityNav className="mt-10 sm:mt-12 lg:mt-14" />
      </div>
    </section>
  );
}
