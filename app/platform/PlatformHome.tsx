import {
  SalesConsumerSection,
  SalesCtaSection,
  SalesDppSection,
  SalesGovernedRecordSection,
  SalesHeroSection,
  SalesHowItWorksSection,
  SalesIntelligenceSection,
  SalesOutcomesSection,
  SalesPlatformBreadthSection,
  SalesProblemSection,
} from "./sales-sections";

/** Public B2B sales page — intertexe.com/platform (10 sections) */
export function PlatformHome() {
  return (
    <div>
      <SalesHeroSection />
      <SalesProblemSection />
      <SalesGovernedRecordSection />
      <SalesHowItWorksSection />
      <SalesOutcomesSection />
      <SalesIntelligenceSection />
      <SalesDppSection />
      <SalesConsumerSection />
      <SalesPlatformBreadthSection />
      <SalesCtaSection />
    </div>
  );
}
