import type { Metadata } from "next";
import { b2bPageMetadata } from "../../../lib/seo/b2b-metadata";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { PricingExperience } from "./PricingExperience";
import "./pricing.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = b2bPageMetadata({
  title: "INTERTEXE Pricing | Fashion Material Intelligence & DPP",
  description:
    "Explore INTERTEXE pricing for material intelligence, product data governance, benchmarking and Digital Product Passport management.",
  path: "/brands/pricing",
});

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
