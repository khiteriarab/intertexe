import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { PRICING_MODULES, paddlePriceIdForModule } from "../../../lib/enterprise/pricing-modules";
import { isPaddleConfigured } from "../../../lib/enterprise/paddle";
import { Body, Eyebrow, Heading } from "../platform-ui";
import { PricingModuleSelector } from "./PricingModuleSelector";
import "./pricing.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — build your yearly licence",
  description:
    "Select the INTERTEXE modules you need. Priced modules show annual starting figures; lifecycle scope is set in your written proposal.",
  alternates: { canonical: "https://www.intertexe.com/platform/pricing" },
};

export default function PlatformPricingPage() {
  const checkoutEnabled =
    isPaddleConfigured() &&
    PRICING_MODULES.filter((m) => m.startingEur !== null).every((m) => Boolean(paddlePriceIdForModule(m.key)));

  return (
    <PlatformChrome active="request">
      <PlatformViewTracker event="platform_pricing_view" />
      <section className="platform-pricing-page">
        <div className="platform-lux-wrap">
          <div className="platform-pricing-head">
            <Eyebrow>Pricing</Eyebrow>
            <Heading className="mb-4">Build your yearly licence.</Heading>
            <Body className="mb-0">
              Select the modules you need. Priced modules show annual starting figures; Connected Product Lifecycle is
              scoped in your proposal.
            </Body>
          </div>

          <PricingModuleSelector checkoutEnabled={checkoutEnabled} />
        </div>
      </section>
    </PlatformChrome>
  );
}
