import { SalesHeroSection } from "./sales-home-sections";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";
import { HomepageLifecycleSection } from "../../components/home/lifecycle/HomepageLifecycleSection";

/**
 * Public B2B platform overview — intertexe.com/platform (/brands)
 * Journey: platform hero → PRODUCT LIFECYCLE (Kessler rows) → pillars → guide.
 * Attio Follow the Record rail lives on /brands/demo only.
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
