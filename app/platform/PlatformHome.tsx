import {
  SalesDeliverySection,
  SalesIntelligenceSection,
  SalesHeroSection,
  SalesPlatformBreadthSection,
  SalesStartFreeSection,
} from "./sales-sections";
import { PlatformFaq } from "./PlatformFaq";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";

/**
 * Public B2B platform overview — intertexe.com/platform
 * Single conversion journey: hero → how it works → intelligence → delivery → breadth → FAQ → CTA.
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
      <PlatformFaq />
      <PlatformCircularWardrobeBanner />
      <SalesStartFreeSection />
    </div>
  );
}
