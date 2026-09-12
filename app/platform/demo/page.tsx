import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformDemoClient } from "./PlatformDemoClient";
import { PlatformDemoShell } from "./PlatformDemoShell";
import { DemoBookSection } from "./DemoBookSection";
import { DemoOfficeSection } from "./DemoOfficeSection";
import { PlatformPageHeader } from "../PlatformPageHeader";

export const metadata: Metadata = {
  title: "INTERTEXE 10-product demonstration",
  description:
    "See INTERTEXE turn a 10-product catalog into governed records, published passports, and scannable consumer experiences — then scan the QR and show the real product page in thirty seconds. Book a conversation with the Barcelona platform office.",
  alternates: { canonical: "https://www.intertexe.com/platform/demo" },
};

export default function PlatformDemoPage() {
  return (
    <PlatformChrome active="demo">
      <PlatformPageHeader
        eyebrow="Live demonstration"
        align="center"
        title="See INTERTEXE with a 10-product catalog."
        description="Raw data → governed record → passport → experience → QR → scan. See the full lifecycle on a 10-product catalog, then book a conversation with the platform office in Barcelona."
        primaryHref="#book"
        primaryLabel="Book a conversation"
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
