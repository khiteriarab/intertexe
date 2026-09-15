import {
  SalesDeliverySection,
  SalesHeroSection,
  SalesPlatformBreadthSection,
} from "./sales-sections";
import { PlatformFaq } from "./PlatformFaq";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";

/**
 * Public B2B platform overview — intertexe.com/platform
 * Single conversion journey: hero → product story → delivery → breadth → FAQ → CTA.
 * Live tour on /platform/demo. API on /platform/api.
 */
export function PlatformHome() {
  return (
    <div>
      <SalesHeroSection />
      <PlatformHowItWorksSection />
      <SalesDeliverySection />
      <SalesPlatformBreadthSection />
      <PlatformFaq />
      <PlatformCircularWardrobeBanner />
    </div>
  );
}
