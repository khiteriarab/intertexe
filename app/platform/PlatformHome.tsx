import { SalesHeroSection } from "./sales-home-sections";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";
import { ProductLifecycleHero } from "../../components/home/ProductLifecycleHero";

/**
 * Public B2B platform overview — intertexe.com/platform (/brands)
 * Journey: platform hero → lifecycle explainer → pillars → guide CTA.
 */
export function PlatformHome() {
  return (
    <div className="platform-home">
      <SalesHeroSection />
      <ProductLifecycleHero />
      <PlatformHowItWorksSection />
      <PlatformCircularWardrobeBanner />
    </div>
  );
}
