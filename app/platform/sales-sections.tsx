import Link from "next/link";
import { WhatItIsProcessVisual } from "./b2b-visuals/WhatItIsProcessVisual";
import { PlatformCapabilityNav } from "./PlatformCapabilityNav";
import {
  DeliveryModesVisual,
  IntelligenceBenchmarkVisual,
  PlatformModuleGrid,
  ProductIdentityCarriersVisual,
  PublishExperienceVisual,
  SaaSDemoFlowVisual,
} from "./sales-visuals";
import { PlatformGraphic } from "./PlatformGraphic";
import { PlatformHero } from "./PlatformHero";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink, SERIF } from "./platform-ui";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";
import { PLATFORM_GRAPHICS } from "../../lib/platform-graphics";

const GOVERNED_POINTS = [
  "Normalization across fragmented sources",
  "Provenance preserved — conflicts surfaced, never overwritten",
  "Evidence, confidence and approval workflow",
  "Versioned product and passport history",
] as const;

const INTELLIGENCE_POINTS = [
  "Material Benchmark — compare fiber mix, completeness, and readiness against governed peer segments in your market",
  "Conversion signals — see which material compositions and categories outperform or underperform vs peers",
  "Cohort drill-down — slice by category, price tier, natural-fiber threshold, and passport readiness",
  "Governed datasets only — aggregate peer medians, never individual competitor catalogs or shopper identity",
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
  return <PlatformHero />;
}

export function SalesWhatItIsSection() {
  return (
    <section className="platform-what-it-is platform-abstract-band itx-abstract-motif py-12 sm:py-16 lg:py-24 border-b border-[#e8e3da]/60">
      <div className="relative max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <aside className="platform-what-rail hidden xl:flex" aria-hidden>
          <span>Digital Product Passport</span>
          <span>Trust information</span>
          <span>A more circular tomorrow</span>
        </aside>

        <div className="max-w-2xl lg:max-w-3xl mb-10 sm:mb-12 lg:mb-16">
          <Eyebrow>What INTERTEXE is</Eyebrow>
          <Heading className="mb-4">
            Product intelligence infrastructure for{" "}
            <em className="not-italic italic text-[var(--platform-accent)]">fashion.</em>
          </Heading>
          <Body className="mb-0">
            We don&apos;t just help you organize the information a Digital Product Passport requires. We turn that
            information into the digital product experience your customer actually sees — hosted by INTERTEXE, on your
            domain, or inside your existing app.
          </Body>
        </div>

        <WhatItIsProcessVisual />

        <PlatformCapabilityNav className="mt-10 sm:mt-12 lg:mt-14" />

        <blockquote className="platform-what-quote mt-10 sm:mt-12 lg:mt-14">
          <p style={SERIF}>Products live longer when information goes further.</p>
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
        <div className="max-w-3xl mb-10 lg:mb-14">
          <Eyebrow>How consumers experience your product</Eyebrow>
          <Heading className="mb-4">You don&apos;t have to send customers to an INTERTEXE-looking page.</Heading>
          <Body className="mb-0">
            Already have the app and website? Perfect. INTERTEXE powers the product experience inside your existing
            digital ecosystem. Smaller brands can choose hosted passports with zero development. Enterprise brands can
            run all three delivery modes from the same governed record — QR on the garment, API in the app, white-label
            on the web.
          </Body>
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

export function SalesIntelligenceSection() {
  return (
    <section className="platform-abstract-band itx-abstract-motif py-12 sm:py-16 lg:py-20">
      <div className="relative max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 lg:gap-14 items-start">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>Intelligence</Eyebrow>
            <Heading className="mb-4">Benchmark your material strategy against the market.</Heading>
            <Body className="mb-6">
              Material Benchmark is the subscription-style dataset brands use to compare fabric strategy — your catalog
              against governed peer segments, with conversion signals that show what is working and what is not. Same
              product record powers readiness gaps, regulatory field tracking, and peer comparison before passports or
              public surfaces.
            </Body>
            <ul className="space-y-2">
              {INTELLIGENCE_POINTS.map((item) => (
                <li key={item} className="text-sm text-[var(--platform-muted)] pl-4 border-l-2 border-[var(--platform-accent-muted)] leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-[var(--platform-quiet)] leading-relaxed">
              Customer Zero catalog · 10 live products · peer medians from governed datasets. Individual competitor
              catalogs and shopper identity are never exposed.
            </p>
          </div>
          <IntelligenceBenchmarkVisual />
        </div>
      </div>
    </section>
  );
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
          <Eyebrow className="mb-0">Platform breadth</Eyebrow>
          <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--platform-quiet)] sm:text-right max-w-xs sm:pt-1">
            Product intelligence · for a more transparent tomorrow
          </p>
        </div>
        <Heading className="mb-4 max-w-3xl">One workspace for product intelligence.</Heading>
        <Body className="max-w-2xl lg:max-w-3xl mb-10 lg:mb-12 text-[#6b6560]">
          The operating environment brands buy — synced with the live enterprise workspace sidebar. Maturity badges
          reflect what is production-ready today versus expanding modules.
        </Body>
        <PlatformModuleGrid />
        <p className="mt-10 lg:mt-12 text-sm text-[#8a847c] leading-relaxed max-w-2xl">
          Explore the live product flow for module-level detail, or{" "}
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
    <section className="itx-abstract-section itx-abstract-motif max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 lg:py-20 pb-20 sm:pb-24">
      <div className="itx-editorial-panel itx-editorial-panel-inner p-8 sm:p-12 lg:p-14 text-center">
        <Eyebrow>Get started</Eyebrow>
        <Heading className="mb-4">See INTERTEXE with your own products.</Heading>
        <Body className="max-w-xl mx-auto mb-8">
          Start with 10 products, implemented free. After qualification, choose Professional, Platform, or Enterprise —
          pricing is shared during onboarding, not published on this site.
        </Body>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <PrimaryLink href="/platform/request?intent=snapshot&cta=footer">Start with 10 products</PrimaryLink>
          <SecondaryLink href="/platform/demo">See it live</SecondaryLink>
        </div>
        <p className="mt-8 text-xs text-[#8a847c]">
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
