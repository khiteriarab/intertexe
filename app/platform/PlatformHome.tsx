import { PricingPlans } from "./PricingPlans";
import { PlatformScrollShowcase } from "./PlatformScrollShowcase";
import {
  SalesCtaSection,
  SalesDeliverySection,
  SalesGovernedRecordSection,
  SalesHeroSection,
  SalesIntelligenceSection,
  SalesLifecycleSection,
  SalesOutputsSection,
  SalesPlatformBreadthSection,
  SalesPublishSection,
  SalesWhatItIsSection,
} from "./sales-sections";

/** Public B2B sales page — intertexe.com/platform */
export function PlatformHome() {
  return (
    <div>
      <SalesHeroSection />
      <SalesWhatItIsSection />
      <SalesLifecycleSection />
      <PlatformScrollShowcase />
      <SalesGovernedRecordSection />
      <SalesDeliverySection />
      <SalesIntelligenceSection />
      <SalesOutputsSection />
      <SalesPublishSection />
      <SalesPlatformBreadthSection />
      <PricingPlans />
      <SalesCtaSection />
    </div>
  );
}
