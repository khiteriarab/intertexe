import { WhatItIsProcessVisual } from "./b2b-visuals/WhatItIsProcessVisual";
import { PlatformCapabilityNav } from "./PlatformCapabilityNav";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink, SERIF } from "./platform-ui";

const PILLARS = [
  ["Govern", "Connect & structure your product data"],
  ["Publish", "Turn approved data into experiences"],
  ["Deliver", "One record · every channel"],
] as const;

export function PlatformHowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-28 platform-what-it-is platform-abstract-band itx-abstract-motif py-12 sm:py-16 lg:py-24 border-b border-[#e8e3da]/60"
    >
      <div className="relative max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="max-w-2xl lg:max-w-3xl mb-8 lg:mb-10">
          <Eyebrow>How INTERTEXE works</Eyebrow>
          <Heading className="mb-4">From raw data to the scan moment.</Heading>
          <Body className="mb-8">
            Govern one record, publish passports, and deliver consumer experiences through hosted pages, your domain,
            or your app — without rebuilding data per channel.
          </Body>
          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryLink href="/platform/request?intent=snapshot&cta=how_it_works">Start with 10 products</PrimaryLink>
            <SecondaryLink href="/platform/demo">See it live</SecondaryLink>
          </div>
        </div>

        <ul className="platform-editorial-pillars grid sm:grid-cols-3 gap-6 sm:gap-8 mb-10 lg:mb-12">
          {PILLARS.map(([label, detail]) => (
            <li key={label} className="border-t border-[var(--platform-border)] pt-4">
              <span className="block text-[11px] tracking-[0.12em] uppercase text-[var(--platform-primary)] mb-1.5">
                {label}
              </span>
              <span className="block text-[14px] text-[var(--platform-quiet)] font-light">{detail}</span>
            </li>
          ))}
        </ul>

        <WhatItIsProcessVisual />

        <PlatformCapabilityNav className="mt-10 sm:mt-12 lg:mt-14" />

        <blockquote className="platform-what-quote mt-10 sm:mt-12 lg:mt-14">
          <p style={SERIF}>Products live longer when information goes further.</p>
        </blockquote>
      </div>
    </section>
  );
}
