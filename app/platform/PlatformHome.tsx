import { PlatformScrollShowcase } from "./PlatformScrollShowcase";
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

/** Public B2B sales page — intertexe.com/platform */
export function PlatformHome() {
  return (
    <div>
      <SalesHeroSection />
      <SalesWhatItIsSection />
      <PlatformScrollShowcase />
      <SalesGovernedRecordSection />
      <SalesIntelligenceSection />
      <SalesOutputsSection />
      <SalesConsumerSection />
      <SalesPlatformBreadthSection />
      <SalesCtaSection />
    </div>
  );
}
