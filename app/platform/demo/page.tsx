import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformDemoClient } from "./PlatformDemoClient";
import { PlatformDemoShell } from "./PlatformDemoShell";
import { DemoBookSection } from "./DemoBookSection";
import { DemoOfficeSection } from "./DemoOfficeSection";
import { PlatformPageHeader } from "../PlatformPageHeader";

export const metadata: Metadata = {
  title: "INTERTEXE live demonstration",
  description:
    "See INTERTEXE SaaS in action: govern a silk evening dress on desktop, publish the passport, scan the QR, and open the consumer page your customer sees. Then explore the 10-product catalog walkthrough.",
  alternates: { canonical: "https://www.intertexe.com/platform/demo" },
};

export default function PlatformDemoPage() {
  return (
    <PlatformChrome active="demo">
      <PlatformPageHeader
        eyebrow="Live demonstration"
        align="center"
        title="SaaS on desktop → QR on the garment → passport your customer sees."
        description="Start with the live scan demo on a silk evening dress — workspace publish, scannable QR, and the real consumer passport. Then walk through a 10-product catalog from raw data to DPP readiness."
        primaryHref="#live-demo"
        primaryLabel="See the live scan"
        secondaryHref="#walkthrough"
        secondaryLabel="Open the catalog"
      />
      <p className="text-center text-[11px] tracking-[0.18em] uppercase text-[var(--platform-quiet)] -mt-6 mb-10">
        Understand → Compare → Act
      </p>
      <PlatformDemoShell>
        <PlatformDemoClient />
        <DemoBookSection />
        <DemoOfficeSection />
      </PlatformDemoShell>
    </PlatformChrome>
  );
}
