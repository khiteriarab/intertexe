import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformDemoClient } from "./PlatformDemoClient";
import { DemoBookSection } from "./DemoBookSection";
import { DemoOfficeSection } from "./DemoOfficeSection";

export const metadata: Metadata = {
  title: "INTERTEXE 10-product demonstration",
  description:
    "See INTERTEXE turn a 10-product catalog from messy source data into normalized material intelligence, issues, benchmarking, DPP readiness and passports. Book a conversation with the Barcelona platform office.",
  alternates: { canonical: "https://www.intertexe.com/platform/demo" },
};

export default function PlatformDemoPage() {
  return (
    <PlatformChrome active="demo">
      <PlatformDemoClient />
      <DemoBookSection />
      <DemoOfficeSection />
    </PlatformChrome>
  );
}
