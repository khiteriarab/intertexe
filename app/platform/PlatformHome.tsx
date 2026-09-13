import { PlatformScrollShowcase } from "./PlatformScrollShowcase";
import {
  SalesDeliverySection,
  SalesGovernedRecordSection,
  SalesHeroSection,
  SalesIntelligenceSection,
  SalesPlatformBreadthSection,
  SalesStartFreeSection,
  SalesWhatItIsSection,
} from "./sales-sections";

/**
 * Public B2B platform overview — intertexe.com/platform
 * Lifecycle detail lives in PlatformScrollShowcase; live QR flow on /platform/demo; API on /platform/api.
 */
export function PlatformHome() {
  return (
    <div>
      <SalesHeroSection />
      <SalesWhatItIsSection />
      <PlatformScrollShowcase />
      <SalesGovernedRecordSection />
      <SalesIntelligenceSection />
      <SalesDeliverySection />
      <SalesPlatformBreadthSection />
      <SalesStartFreeSection />
    </div>
  );
}
