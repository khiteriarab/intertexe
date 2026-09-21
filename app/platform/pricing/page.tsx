import type { Metadata } from "next";
import { marketingCanonical } from "../../../lib/enterprise-marketing/paths";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { PricingExperience } from "./PricingExperience";
import "./pricing.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — Foundation, Intelligence, Enterprise",
  description:
    "Monthly USD plans for INTERTEXE product intelligence: Foundation, Intelligence, and Enterprise. Clear commitments, implementation fees, and EUR estimates for reference.",
  alternates: { canonical: marketingCanonical("pricing") },
};

export default function PlatformPricingPage() {
  return (
    <PlatformChrome active="request">
      <PlatformViewTracker event="platform_pricing_view" />
      <section className="platform-pricing-page">
        <PricingExperience />
      </section>
    </PlatformChrome>
  );
}
