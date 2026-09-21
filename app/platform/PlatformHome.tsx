import { SalesHeroSection } from "./sales-home-sections";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";
import { HomepageLifecycleSection } from "../../components/home/lifecycle/HomepageLifecycleSection";

/**
 * Public B2B platform overview — intertexe.com/platform (/brands)
 * Journey: lifecycle explainer (Kessler rhythm) → dark product intelligence → pillars → guide.
 */
export function PlatformHome() {
  return (
    <div className="platform-home">
      <HomepageLifecycleSection />
      <SalesHeroSection />
      <PlatformHowItWorksSection />
      <PlatformCircularWardrobeBanner />
    </div>
  );
}
