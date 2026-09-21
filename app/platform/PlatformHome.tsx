import { SalesHeroSection } from "./sales-home-sections";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";
import { HomepageLifecycleSection } from "../../components/home/lifecycle/HomepageLifecycleSection";

/**
 * Public B2B platform overview — intertexe.com/platform (/brands)
 * Journey: platform hero → lifecycle explainer → pillars → guide.
 */
export function PlatformHome() {
  return (
    <div className="platform-home">
      <SalesHeroSection />
      <HomepageLifecycleSection />
      <PlatformHowItWorksSection />
      <PlatformCircularWardrobeBanner />
    </div>
  );
}
