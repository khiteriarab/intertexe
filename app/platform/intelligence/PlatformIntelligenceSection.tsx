import { PlatformIntelligenceLayer } from "./PlatformIntelligenceLayer";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink } from "../platform-ui";
import "../platform-intelligence.css";

/** @deprecated Standalone section — use PlatformHowItWorksSection for the unified product story. */
export function PlatformIntelligenceSection() {
  return (
    <section id="material-intelligence" className="platform-intelligence-section py-12 sm:py-16 lg:py-24 border-y border-[var(--platform-border)]/60">
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
        <PlatformIntelligenceLayer />
      </div>
    </section>
  );
}
