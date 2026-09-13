import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformDemoClient } from "./PlatformDemoClient";
import { PlatformDemoShell } from "./PlatformDemoShell";
import { DemoBookSection } from "./DemoBookSection";
import { DemoOfficeSection } from "./DemoOfficeSection";
import { PlatformPageHeader } from "../PlatformPageHeader";

export const metadata: Metadata = {
  title: "See INTERTEXE live",
  description:
    "Walk through the INTERTEXE workspace: govern the Customer Zero linen shirt, publish the passport, scan the QR, and open the live consumer page. Then explore the 10-product catalog from raw data to DPP readiness.",
  alternates: { canonical: "https://www.intertexe.com/platform/demo" },
};

export default function PlatformDemoPage() {
  return (
    <PlatformChrome active="demo">
      <PlatformPageHeader
        eyebrow="Product tour"
        align="center"
        title="Workspace → identity carrier → consumer passport."
        description="Follow the end-to-end publish flow on ITX-LIVE-01 — Customer Zero linen shirt. Govern in the workspace, publish the passport, and open the live consumer page. Then walk the 10-product catalog from raw data to DPP readiness and next-life resale."
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
