import { SalesHeroSection } from "./sales-home-sections";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";
import { LifecycleOverviewSection } from "../../components/home/lifecycle/LifecycleOverviewSection";

/**
 * Public B2B platform overview — intertexe.com/platform (/brands)
 * Journey: platform hero → seven-stage lifecycle overview → pillars → guide.
 */
export function PlatformHome() {
  return (
    <div className="platform-home">
      <SalesHeroSection />
      <LifecycleOverviewSection />
      <PlatformHowItWorksSection />
      <PlatformCircularWardrobeBanner />
    </div>
  );
}
