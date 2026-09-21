import { SalesHeroSection } from "./sales-home-sections";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";
import ProductLifecycleMap from "./ProductLifecycleMap";

/**
 * Public B2B platform overview — intertexe.com/platform (/brands)
 * Journey: lifecycle system map → dark product intelligence → pillars → guide CTA.
 * FAQ and consumer delivery live on Solutions. Live tour on /brands/demo.
 */
export function PlatformHome() {
  return (
    <div className="platform-home">
      <ProductLifecycleMap />
      <SalesHeroSection />
      <PlatformHowItWorksSection />
      <PlatformCircularWardrobeBanner />
    </div>
  );
}
