import {
  SalesConsumerSection,
  SalesCtaSection,
  SalesDppSection,
  SalesGovernedRecordSection,
  SalesHeroSection,
  SalesHowItWorksSection,
  SalesIntelligenceSection,
  SalesPlatformBreadthSection,
  SalesProblemSection,
} from "./sales-sections";

/** Public B2B sales page — intertexe.com/platform (9 sections) */
export function PlatformHome() {
  return (
    <div>
      <SalesHeroSection />
      <SalesProblemSection />
      <SalesGovernedRecordSection />
      <SalesHowItWorksSection />
      <SalesIntelligenceSection />
      <SalesDppSection />
      <SalesConsumerSection />
      <SalesPlatformBreadthSection />
      <SalesCtaSection />
    </div>
  );
}
