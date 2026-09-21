import type { Metadata } from "next";
import Link from "next/link";
import { b2bPageMetadata } from "../../../lib/seo/b2b-metadata";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformViewTracker } from "../PlatformViewTracker";
import { SolutionsClose } from "../SolutionsClose";
import { Body, Eyebrow, Heading } from "../platform-ui";
import { SolutionsExploreGrid } from "./SolutionsExploreGrid";
import "./solutions.css";

export const metadata: Metadata = b2bPageMetadata({
  title: "Fashion Solutions | Product Record & Digital Product Passports",
  description:
    "INTERTEXE connects product creation, traceability, environmental intelligence, compliance, consumer transparency, and Digital Product Passports through one governed product record.",
  path: "/brands/solutions",
});

export default function PlatformSolutionsPage() {
  return (
    <PlatformChrome active="solutions">
      <PlatformViewTracker event="platform_solutions_view" />

      <section className="solutions-intro">
        <div className="platform-lux-wrap">
          <div className="solutions-intro-copy">
            <Eyebrow>Solutions</Eyebrow>
            <Heading className="mb-5">One product record. Six ways to use it.</Heading>
            <Body className="mb-8">
              INTERTEXE connects product creation, traceability, environmental intelligence, compliance, consumer
              transparency, and next-life experiences through one governed product record — including{" "}
              <Link href="/digital-product-passport" className="underline underline-offset-4">
                Digital Product Passport software for fashion
              </Link>
              .
            </Body>
            <div className="solutions-intro-actions">
              <Link href="/brands" className="solutions-cta-primary">
                Explore the platform
                <span aria-hidden>→</span>
              </Link>
              <Link href="/brands/demo" className="solutions-cta-secondary">
                See it live
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="solutions-grid-section">
        <div className="platform-lux-wrap">
          <SolutionsExploreGrid />
        </div>
      </section>

      <SolutionsClose cta="solutions_close" />
    </PlatformChrome>
  );
}
