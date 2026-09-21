import { SalesHeroSection } from "./sales-home-sections";
import { PlatformFaq } from "./PlatformFaq";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";

/**
 * Public B2B platform overview — intertexe.com/platform (/brands)
 * Journey: hero → how it works (lifecycle map) → FAQ → CTA.
 * Consumer delivery lives on Solutions. Live tour on /brands/demo.
 */
export function PlatformHome() {
  return (
    <div className="platform-home">
      <SalesHeroSection />
      <PlatformHowItWorksSection />
      <PlatformFaq />
      <PlatformCircularWardrobeBanner />
    </div>
  );
}
