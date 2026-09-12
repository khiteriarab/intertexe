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
    "See INTERTEXE SaaS in action: govern the Customer Zero linen shirt on desktop, publish the passport, scan the QR, and open the live consumer page. Then explore the 10-product catalog walkthrough.",
  alternates: { canonical: "https://www.intertexe.com/platform/demo" },
};

export default function PlatformDemoPage() {
  return (
    <PlatformChrome active="demo">
      <PlatformPageHeader
        eyebrow="Live demonstration"
        align="center"
        title="SaaS on desktop → QR on the garment → passport your customer sees."
        description="Start with the live scan demo on ITX-LIVE-01 — God's True Cashmere linen shirt. Workspace publish, scannable QR, and the live consumer passport. Then walk through the 10-product Customer Zero catalog from raw data to DPP readiness and next-life resale."
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
