import type { Metadata } from "next";
import { PlatformChrome } from "../PlatformChrome";
import { PlatformDemoClient } from "./PlatformDemoClient";
import { DemoBookSection } from "./DemoBookSection";
import { DemoOfficeSection } from "./DemoOfficeSection";
import { PrimaryLink, SecondaryLink, SERIF } from "../platform-ui";

export const metadata: Metadata = {
  title: "INTERTEXE 10-product demonstration",
  description:
    "See INTERTEXE turn a 10-product catalog from messy source data into normalized material intelligence, issues, benchmarking, DPP readiness and passports. Book a conversation with the Barcelona platform office.",
  alternates: { canonical: "https://www.intertexe.com/platform/demo" },
};

export default function PlatformDemoPage() {
  return (
    <PlatformChrome active="demo">
      <section className="relative overflow-hidden bg-[#152238] text-[#f7f5f1]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-32deg, transparent, transparent 18px, rgba(255,255,255,0.045) 18px, rgba(255,255,255,0.045) 19px)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20 text-center">
          <p className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-[#9bb4c9] mb-5">
            Live demonstration
          </p>
          <h1
            className="text-[2.15rem] sm:text-5xl md:text-[3.35rem] font-light leading-[1.12] mb-6 text-white"
            style={SERIF}
          >
            See INTERTEXE with a 10-product catalog.
          </h1>
          <p className="mx-auto max-w-2xl mb-8 text-[15px] sm:text-base font-light leading-relaxed text-white/78">
            Messy source data → normalization → issues → material intelligence → benchmarking → DPP
            readiness → passport. Then book a conversation with the platform office in Barcelona.
          </p>
          <p className="text-[13px] tracking-[0.12em] uppercase text-white/65 mb-10">
            Understand → Compare → Act
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <PrimaryLink href="#book" tone="dark">
              Book a conversation
            </PrimaryLink>
            <SecondaryLink href="#walkthrough" tone="dark">
              Open the catalog
            </SecondaryLink>
          </div>
        </div>
      </section>
      <PlatformDemoClient />
      <DemoBookSection />
      <DemoOfficeSection />
    </PlatformChrome>
  );
}
