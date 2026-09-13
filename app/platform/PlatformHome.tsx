import {
  SalesDeliverySection,
  SalesIntelligenceSection,
  SalesHeroSection,
  SalesPlatformBreadthSection,
  SalesStartFreeSection,
} from "./sales-sections";
import { PlatformFaq } from "./PlatformFaq";
import { PlatformHowItWorksSection } from "./PlatformHowItWorksSection";
import { PlatformProofSection } from "./PlatformProofSection";
import { PlatformScrollShowcase } from "./PlatformScrollShowcase";
import { PlatformWorkflowDeepDive } from "./PlatformWorkflowDeepDive";

/**
 * Public B2B platform overview — intertexe.com/platform
 * Single conversion journey: hero → how it works → workflow → intelligence → delivery → breadth → proof → FAQ → CTA.
 * Live tour on /platform/demo. API on /platform/api.
 */
export function PlatformHome() {
  return (
    <div>
      <SalesHeroSection />
      <PlatformScrollShowcase />
      <PlatformHowItWorksSection />
      <PlatformWorkflowDeepDive />
      <SalesIntelligenceSection />
      <SalesDeliverySection />
      <SalesPlatformBreadthSection />
      <PlatformProofSection />
      <PlatformFaq />
      <SalesStartFreeSection />
    </div>
  );
}
