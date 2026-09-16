import { SalesDeliverySection, SalesHeroSection } from "./sales-sections";
import { PlatformFaq } from "./PlatformFaq";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";

/**
 * Public B2B platform overview — intertexe.com/platform
 * Single conversion journey: hero → product story → delivery → FAQ → CTA.
 * Live tour on /platform/demo. API on /platform/api.
 */
export function PlatformHome() {
  return (
    <div className="platform-home">
      <SalesHeroSection />
      <PlatformHowItWorksSection />
      <SalesDeliverySection />
      <PlatformFaq />
      <PlatformCircularWardrobeBanner />
    </div>
  );
}
