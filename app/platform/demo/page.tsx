import type { Metadata } from "next";
import { b2bPageMetadata } from "../../../lib/seo/b2b-metadata";
import { PlatformChrome } from "../PlatformChrome";
import { SolutionsClose } from "../SolutionsClose";
import { PlatformDemoClient } from "./PlatformDemoClient";
import "./demo-tour.css";

export const metadata: Metadata = b2bPageMetadata({
  title: "Fashion Digital Product Passport Demo | INTERTEXE",
  description:
    "See how INTERTEXE turns messy fashion product data into structured material intelligence, a governed product record and a live Digital Product Passport.",
  path: "/brands/demo",
  ogImageAlt: "INTERTEXE fashion Digital Product Passport demo walkthrough",
});

export default function PlatformDemoPage() {
  return (
    <PlatformChrome active="demo">
      <PlatformDemoClient />
      <SolutionsClose cta="demo_close" headingId="demo-close-heading" />
    </PlatformChrome>
  );
}
