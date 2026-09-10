import { PlatformFeatureScroll } from "./PlatformFeatureScroll";
import { PlatformHero } from "./PlatformHero";
import { PlatformTestimonials } from "./PlatformTestimonials";
import {
  SalesCtaSection,
  SalesPlatformBreadthSection,
} from "./sales-sections";

/** Public B2B sales page — intertexe.com/platform */
export function PlatformHome() {
  return (
    <div>
      <PlatformHero />
      <PlatformFeatureScroll />
      <PlatformTestimonials />
      <SalesPlatformBreadthSection />
      <SalesCtaSection />
    </div>
  );
}
