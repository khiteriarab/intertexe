import { SalesDeliverySection, SalesHeroSection } from "./sales-home-sections";
import { PlatformApiSection } from "./PlatformApiSection";
import { PlatformFaq } from "./PlatformFaq";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";

/**
 * Public B2B platform overview — intertexe.com/platform
 * Single conversion journey: hero → product story → delivery → API → FAQ → CTA.
 * Live tour on /platform/demo. API reference lives in the #api section.
 */
export function PlatformHome() {
  return (
    <div className="platform-home">
      <SalesHeroSection />
      <PlatformHowItWorksSection />
      <SalesDeliverySection />
      <PlatformApiSection />
      <PlatformFaq />
      <PlatformCircularWardrobeBanner />
    </div>
  );
}
