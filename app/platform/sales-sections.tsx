import Link from "next/link";
import { WhatItIsProcessVisual } from "./b2b-visuals/WhatItIsProcessVisual";
import { PlatformCapabilityNav } from "./PlatformCapabilityNav";
import {
  DeliveryModesVisual,
  PlatformModuleGrid,
  ProductIdentityCarriersVisual,
  PublishExperienceVisual,
  SaaSDemoFlowVisual,
} from "./sales-visuals";
import { PlatformGraphic } from "./PlatformGraphic";
import { PlatformBrandShowcaseHero } from "./PlatformBrandShowcaseHero";
import { PlatformIntelligenceSection } from "./intelligence/PlatformIntelligenceSection";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink, SERIF } from "./platform-ui";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";
import { PLATFORM_GRAPHICS } from "../../lib/platform-graphics";

const GOVERNED_POINTS = [
  "Normalization across fragmented sources",
  "Provenance preserved — conflicts surfaced, never overwritten",
  "Evidence, confidence and approval workflow",
  "Versioned product and passport history",
] as const;


const OUTPUT_PILLARS = [
  {
    title: "Digital Product Passports",
    copy: "Managed product identity and passport infrastructure — persistent identities, hosted passports, and QR-ready resolution from the same approved record.",
  },
  {
    title: "Regulatory readiness",
    copy: "Tracked requirements, field completeness, and which products a rule change actually touches — preparation status, not legal certification.",
  },
  {
    title: "Consumer delivery",
    copy: "Hosted passport, white-label domain, or headless API — the same approved record powers your app, website, QR scan, and customer service tools without rebuilding data per channel.",
  },
] as const;

export function SalesHeroSection() {
  return <PlatformBrandShowcaseHero />;
}

export function SalesWhatItIsSection() {
  return (
    <section className="platform-what-it-is platform-abstract-band itx-abstract-motif py-12 sm:py-16 lg:py-24 border-b border-[#e8e3da]/60">
      <div className="relative max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="max-w-2xl lg:max-w-3xl mb-10 sm:mb-12 lg:mb-16">
          <Eyebrow>What INTERTEXE is</Eyebrow>
          <Heading className="mb-4">From raw product data to a living product record.</Heading>
          <Body className="mb-0">
            INTERTEXE transforms fragmented product, material, and manufacturing information into one governed record
            that powers compliance, consumer transparency, and circular commerce — from conception to after-sale.
          </Body>
        </div>

        <p className="platform-lifecycle-line mb-8 lg:mb-10">
          Conception → Product data → Manufacturing evidence → Compliance → Consumer scan → Care → Resale → Next life
        </p>

        <WhatItIsProcessVisual />

        <PlatformCapabilityNav className="mt-10 sm:mt-12 lg:mt-14" />

        <blockquote className="platform-what-quote mt-10 sm:mt-12 lg:mt-14">
          <p style={SERIF}>
            INTERTEXE takes products from fragmented internal data to governed consumer-facing records that support
            compliance, transparency, care, and resale.
          </p>
        </blockquote>
      </div>
    </section>
  );
}

/** Live workspace → QR → passport flow. Primary home: /platform/demo */
export function SalesLifecycleSection() {
  return (
    <section className="itx-abstract-section itx-abstract-motif bg-white border-y border-[#e8e3da] py-12 sm:py-16 lg:py-20">
      <span className="itx-abstract-edge" aria-hidden>
        Lifecycle
      </span>
      <div className="max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="max-w-3xl mb-8 lg:mb-10">
          <Eyebrow>Publish to consumer experience</Eyebrow>
          <Heading className="mb-4">
            Workspace → identity carrier → consumer passport.
          </Heading>
          <Body className="mb-0">
            Govern product data in the INTERTEXE workspace, publish a digital passport, and deliver the same approved
            record through QR, hosted page, white-label domain, or headless API — with preview and verification before
            go-live.
          </Body>
        </div>
        <SaaSDemoFlowVisual />
      </div>
    </section>
  );
}

export function SalesDeliverySection() {
  return (
    <section className="platform-abstract-band itx-abstract-motif py-12 sm:py-16 lg:py-20">
      <div className="relative max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-6 lg:gap-10 mb-10 lg:mb-14 items-start">
          <div className="max-w-3xl">
            <Eyebrow>Consumer delivery</Eyebrow>
            <Heading className="mb-4">One record. Three ways to deliver.</Heading>
            <Body className="mb-0">
              Turn your governed material data into trusted consumer experiences — whether you host it on INTERTEXE,
              bring your own look and feel, or connect directly through our API. Smaller brands launch hosted passports
              with zero development. Enterprise brands run all three delivery modes from the same approved record.
            </Body>
          </div>
          <p className="hidden lg:block text-[10px] tracking-[0.18em] uppercase text-[var(--platform-accent)] border-l border-[var(--platform-accent)]/40 pl-4 max-w-[9rem] leading-relaxed">
            Same data · more possibilities
          </p>
        </div>
        <DeliveryModesVisual />
      </div>
    </section>
  );
}

export function SalesPublishSection() {
  return (
    <section className="platform-abstract-band itx-abstract-motif border-y border-[#e8e3da] py-16 sm:py-20 lg:py-24">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-10 lg:gap-14 items-start">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>Publish product experience</Eyebrow>
            <Heading className="mb-4">The full-circle moment in your workspace.</Heading>
            <Body className="mb-6">
              When a brand finishes a product passport, the publish screen is where governance becomes experience: choose
              your data carrier, select hosted or headless delivery, preview on mobile, and verify the consumer experience
              before go-live.
            </Body>
            <ul className="space-y-2 text-sm text-[#5c5854]">
              <li className="pl-4 border-l-2 border-[var(--platform-accent)]/50">
                Publication engine controls which fields are approved for consumers
              </li>
              <li className="pl-4 border-l-2 border-[var(--platform-accent)]/50">
                Experience designer — Editorial, Trace, Essential, Circular templates
              </li>
              <li className="pl-4 border-l-2 border-[var(--platform-accent)]/50">
                Headless API and white-label domain on Enterprise plans
              </li>
            </ul>
          </div>
          <PublishExperienceVisual />
        </div>
      </div>
    </section>
  );
}

export function SalesGovernedRecordSection() {
  return (
    <section className="itx-abstract-section itx-abstract-motif bg-white border-y border-[#e8e3da] py-12 sm:py-16 lg:py-20">
      <div className="max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-10 lg:gap-14 items-center">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>One governed product record</Eyebrow>
            <Heading className="mb-4">One source of truth for product and material data.</Heading>
            <Body className="mb-6">
              INTERTEXE connects fragmented inputs, normalizes materials and compositions, preserves original source
              values and provenance, flags gaps and conflicts, and creates an approved canonical record your teams can
              trust — without replacing the systems you already use.
            </Body>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {GOVERNED_POINTS.map((item) => (
                <li key={item} className="text-sm text-[#5c5854] pl-4 border-l-2 border-[#e8e3da] leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {PLATFORM_GRAPHICS.understandIssues.ready ? (
            <PlatformGraphic
              slot="understandIssues"
              caption="Customer Zero · conflicts surfaced, never overwritten · resolution workflow in the Issues inbox"
            />
          ) : (
            <figure className="m-0">
              <img
                src="/platform/hero-workspace-desktop.png"
                alt="INTERTEXE enterprise workspace — Customer Zero live catalog"
                width={1400}
                height={933}
                className="w-full rounded-xl border border-[#e8e3da] shadow-[0_24px_60px_rgba(22,21,19,0.08)]"
                loading="lazy"
              />
              <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">
                Customer Zero · catalog → materials → issues → benchmark → passport → next life
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}

/** @deprecated Intelligence is embedded in PlatformHowItWorksSection */
export function SalesIntelligenceSection() {
  return <PlatformIntelligenceSection />;
}

const IDENTITY_CAPABILITIES = [
  { verb: "Generate", detail: "Persistent product identities" },
  { verb: "Host", detail: "Published digital passports" },
  { verb: "Connect", detail: "QR and compatible carriers" },
  { verb: "Maintain", detail: "Versioned data behind stable identity" },
] as const;

export function SalesOutputsSection() {
  return (
    <section className="itx-abstract-section itx-abstract-motif bg-[#f7f5f1] border-y border-[#e8e3da] py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div>
            <Eyebrow>Outputs from one record</Eyebrow>
            <Heading className="mb-4">
              DPP, readiness, and public product experiences —
              <br className="hidden sm:block" />
              from the same governed source.
            </Heading>
            <Body className="mb-6">
              Passports, regulatory preparation, and brand-owned product surfaces are outputs of the data layer — not
              separate systems to rebuild, and not the whole product. Publication flows from the intelligence and
              readiness work that comes first.
            </Body>
            <div className="mb-8 p-4 sm:p-5 bg-white border border-[#e8e3da] border-l-[3px] border-l-[var(--platform-accent)]/50">
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-2">Connected product identity</p>
              <p className="text-lg font-light text-[#161513] mb-2" style={{ fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif" }}>
                From product record to physical product.
              </p>
              <p className="text-sm text-[#5c5854] leading-relaxed mb-4">
                Create a persistent digital identity for every product and connect it to the physical garment through QR
                or compatible connected carriers.
              </p>
              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
                {IDENTITY_CAPABILITIES.map(({ verb, detail }) => (
                  <li key={verb} className="text-xs text-[#5c5854]">
                    <span className="text-[10px] tracking-[0.1em] uppercase text-[var(--platform-primary)]">{verb}</span>
                    <span className="text-[#8a847c]"> · </span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              {OUTPUT_PILLARS.map((pillar) => (
                <article
                  key={pillar.title}
                  className="bg-white border border-[#e8e3da] px-4 sm:px-5 py-4 border-l-[3px] border-l-[var(--platform-accent)]/50"
                >
                  <h3 className="text-sm font-medium text-[var(--platform-primary)] mb-1.5">{pillar.title}</h3>
                  <p className="text-sm text-[#5c5854] leading-relaxed">{pillar.copy}</p>
                </article>
              ))}
            </div>
            <p className="mt-6 text-xs text-[#8a847c] leading-relaxed">
              Preparation status and required-field completeness only — not EU certification, full textile compliance, or
              approval as a verified DPP service provider unless explicitly established.
            </p>
          </div>
          <ProductIdentityCarriersVisual />
        </div>
      </div>
    </section>
  );
}

/** @deprecated Use SalesDeliverySection — kept for tests importing the old name. */
export function SalesConsumerSection() {
  return <SalesDeliverySection />;
}

export function SalesPlatformBreadthSection() {
  return (
    <section className="platform-module-showcase platform-abstract-band itx-abstract-motif border-y border-[#e8e3da]/60 py-12 sm:py-16 lg:py-24">
      <div className="relative max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10 lg:mb-12">
          <Eyebrow className="mb-0">Product lifecycle</Eyebrow>
          <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--platform-quiet)] sm:text-right max-w-xs sm:pt-1">
            Create · Prove · Understand · Extend
          </p>
        </div>
        <Heading className="mb-4 max-w-3xl">One workspace for the entire product lifecycle.</Heading>
        <Body className="max-w-2xl lg:max-w-3xl mb-10 lg:mb-12 text-[#6b6560]">
          From first material decisions and manufacturing evidence to consumer passports, sustainability intelligence
          and resale, INTERTEXE keeps every stage connected to one governed product record.
        </Body>
        <PlatformModuleGrid />
        <p className="mt-10 lg:mt-12 text-sm text-[#8a847c] leading-relaxed max-w-2xl">
          <Link href="/platform/demo" className="underline underline-offset-4 hover:text-[var(--platform-primary)]">
            See it live
          </Link>{" "}
          with sample products, or{" "}
          <Link href="/platform/request?intent=snapshot&cta=platform_breadth" className="underline underline-offset-4 hover:text-[var(--platform-primary)]">
            start with 10 of your own products
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

export function SalesStartFreeSection() {
  const signIn = getEnterpriseLoginUrl();
  return (
    <section className="platform-get-started-section max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 lg:py-20 pb-20 sm:pb-24">
      <div className="platform-get-started-card">
        <Eyebrow className="mb-4">Get started</Eyebrow>
        <Heading className="mb-4">See INTERTEXE with your own products.</Heading>
        <Body className="max-w-xl mx-auto mb-8">
          Start with 10 products, implemented free. After qualification, choose Professional, Platform, or Enterprise —
          pricing is shared during onboarding, not published on this site.
        </Body>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <PrimaryLink href="/platform/request?intent=snapshot&cta=footer">Start with 10 products</PrimaryLink>
          <SecondaryLink href="/platform/demo">See it live</SecondaryLink>
        </div>
        <p className="mt-8 text-xs text-[var(--platform-quiet)]">
          <Link href={signIn} className="underline underline-offset-4 hover:text-[var(--platform-primary)]">
            Already a customer? Sign in →
          </Link>
        </p>
      </div>
    </section>
  );
}

/** @deprecated Use SalesStartFreeSection */
export function SalesCtaSection() {
  return <SalesStartFreeSection />;
}
