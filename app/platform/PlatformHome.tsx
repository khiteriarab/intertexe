import { SalesDeliverySection, SalesHeroSection } from "./sales-sections";
import { PlatformFaq } from "./PlatformFaq";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";
import { PlatformFabricCinema } from "./PlatformFabricCinema";

/**
 * Public B2B platform overview — intertexe.com/platform
 * Visual rhythm: dark hero → white workflow → dark intelligence → white lifecycle
 * → full-bleed fabric → white delivery → FAQ → dark CTA.
 */
export function PlatformHome() {
  return (
    <div className="platform-home">
      <SalesHeroSection />
      <PlatformHowItWorksSection />
      <PlatformFabricCinema />
      <SalesDeliverySection />
      <PlatformFaq />
      <PlatformCircularWardrobeBanner />
    </div>
  );
}
