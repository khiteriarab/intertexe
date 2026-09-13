import {
  SalesDeliverySection,
  SalesIntelligenceSection,
  SalesHeroSection,
  SalesPlatformBreadthSection,
  SalesStartFreeSection,
} from "./sales-sections";
import { PlatformFaq } from "./PlatformFaq";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";
import { PlatformProofSection } from "./PlatformProofSection";

/**
 * Public B2B platform overview — intertexe.com/platform
 * Single conversion journey: hero → how it works → intelligence → delivery → breadth → proof → FAQ → CTA.
 * Live tour on /platform/demo. API on /platform/api.
 */
export function PlatformHome() {
  return (
    <div>
      <SalesHeroSection />
      <PlatformHowItWorksSection />
      <SalesIntelligenceSection />
      <SalesDeliverySection />
      <SalesPlatformBreadthSection />
      <PlatformProofSection />
      <PlatformFaq />
      <SalesStartFreeSection />
    </div>
  );
}
