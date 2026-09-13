import Link from "next/link";
import { DEMO_FEATURED } from "../../../lib/material-intelligence/demo-featured";
import { PrimaryLink, SecondaryLink, SERIF } from "../platform-ui";

export function DemoHero() {
  return (
    <section id="hero" className="demo-tour-hero scroll-mt-24 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 pt-10 sm:pt-14 lg:pt-20 pb-12 sm:pb-16 lg:pb-20">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid lg:grid-cols-[minmax(0,42%)_minmax(0,58%)] gap-10 lg:gap-14 xl:gap-16 items-center">
          <div>
            <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-6">See it live</p>
            <h1
              className="text-[2.35rem] sm:text-[3rem] xl:text-[3.5rem] font-light leading-[1.06] tracking-[-0.02em] mb-5"
              style={SERIF}
            >
              See one product become product intelligence.
            </h1>
            <p className="text-[16px] sm:text-[17px] font-light leading-relaxed text-[var(--platform-muted)] max-w-md mb-8">
              Follow a garment from source data to governed record, Digital Product Passport, benchmark intelligence,
              and next-life readiness.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <PrimaryLink href="#live-scan">Start the live tour</PrimaryLink>
              <SecondaryLink href="#catalog">Open the 10-product catalog</SecondaryLink>
            </div>
            <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--platform-quiet)]">
              Featured · {DEMO_FEATURED.name} · {DEMO_FEATURED.sku}
            </p>
          </div>

          <div className="demo-tour-hero-visual rounded-2xl overflow-hidden border border-[var(--platform-border)]/60 bg-[#f0ebe4]">
            <img
              src="/platform/hero-workspace-desktop.png"
              alt="INTERTEXE workspace preview"
              width={1200}
              height={800}
              className="demo-tour-hero-workspace rounded-2xl"
            />
            <img
              src={DEMO_FEATURED.image}
              alt={DEMO_FEATURED.name}
              width={400}
              height={600}
              className="demo-tour-hero-garment object-cover rounded-lg"
            />
            <img
              src="/platform/surface-iphone-scanner.jpg"
              alt="Scanning INTERTEXE hangtag"
              width={360}
              height={720}
              className="demo-tour-hero-scan rounded-xl object-cover"
            />
            <div className="demo-tour-hero-passport rounded-2xl border border-[var(--platform-border)] bg-white overflow-hidden shadow-[0_24px_60px_rgba(22,21,19,0.14)]">
              <div className="px-3 py-2 border-b border-[var(--platform-border)] bg-[#faf8f4]">
                <p className="text-[8px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">Digital Product Passport</p>
              </div>
              <img src={DEMO_FEATURED.image} alt="" width={200} height={260} className="w-full aspect-[4/5] object-cover" />
              <div className="p-3">
                <p className="text-[11px] font-medium text-[var(--platform-ink)]" style={SERIF}>
                  {DEMO_FEATURED.name}
                </p>
                <p className="text-[9px] text-[var(--platform-muted)] mt-0.5">{DEMO_FEATURED.composition}</p>
              </div>
            </div>
            <p className="absolute bottom-3 left-3 z-10 text-[9px] tracking-[0.16em] uppercase text-white/90 bg-[#161513]/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
              Physical product → INTERTEXE → passport
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-[var(--platform-quiet)]">
          <Link href="#journey" className="underline underline-offset-4 hover:text-[var(--platform-primary)]">
            Follow the {DEMO_FEATURED.name} workflow →
          </Link>
        </p>
      </div>
    </section>
  );
}
