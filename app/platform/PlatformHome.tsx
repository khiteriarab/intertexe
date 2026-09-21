import { SalesHeroSection } from "./sales-home-sections";
import { PlatformCircularWardrobeBanner } from "./PlatformCircularWardrobeBanner";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";
import { LifecycleOverviewSection } from "../../components/home/lifecycle/LifecycleOverviewSection";

/**
 * Public B2B platform overview — intertexe.com/platform (/brands)
 * Journey: platform hero → homepage lifecycle hub (7 stages) → pillars → guide.
 * Attio Follow the Record rail lives on /brands/demo only.
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
