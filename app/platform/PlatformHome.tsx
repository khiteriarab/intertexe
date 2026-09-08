import {
  SalesConsumerSection,
  SalesCtaSection,
  SalesGovernedRecordSection,
  SalesHeroSection,
  SalesIntelligenceSection,
  SalesOutputsSection,
  SalesPlatformBreadthSection,
  SalesWhatItIsSection,
} from "./sales-sections";

/** Public B2B sales page — intertexe.com/platform (8 sections) */
export function PlatformHome() {
  return (
    <div>
      <SalesHeroSection />
      <SalesWhatItIsSection />
      <SalesGovernedRecordSection />
      <SalesIntelligenceSection />
      <SalesOutputsSection />
      <SalesConsumerSection />
      <SalesPlatformBreadthSection />
      <SalesCtaSection />
    </div>
  );
}
