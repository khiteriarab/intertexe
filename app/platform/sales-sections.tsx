import Link from "next/link";
import {
  ConsumerEcosystemVisual,
  GovernedRecordVisual,
  IntelligenceBenchmarkVisual,
  PlatformModuleGrid,
  ProblemConvergenceVisual,
  ProductIdentityCarriersVisual,
} from "./sales-visuals";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink } from "./platform-ui";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";
import { cfImage } from "../../lib/cloudflare-images";

const GOVERNED_POINTS = [
  "Normalization across fragmented sources",
  "Provenance preserved — conflicts surfaced, never overwritten",
  "Evidence, confidence and approval workflow",
  "Versioned product and passport history",
] as const;

const INTELLIGENCE_POINTS = [
  "Natural vs synthetic material mix across your catalog",
  "Composition completeness, passport readiness, and regulatory field gaps",
  "Governed peer benchmarking — where aggregate data exists",
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
    title: "Public product experiences",
    copy: "One record powers your ecommerce site, passport pages, QR resolution, and brand-owned product surfaces — without rebuilding data per channel.",
  },
] as const;

const SITE = "https://www.intertexe.com";

export function SalesHeroSection() {
  const signIn = getEnterpriseLoginUrl();

  return (
    <section className="relative overflow-hidden bg-[#152238] text-[#f7f5f1]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-32deg, transparent, transparent 18px, rgba(255,255,255,0.04) 18px, rgba(255,255,255,0.04) 19px)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-9 pb-8 lg:pb-9 min-h-[100svh] lg:min-h-0 lg:h-[min(100svh,780px)] flex flex-col justify-between gap-5 lg:gap-4">
        <div className="max-w-3xl text-left shrink-0">
          <p className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-[#9bb4c9] mb-4 lg:mb-3">
            INTERTEXE FOR BRANDS
          </p>
          <h1
            className="text-[2.1rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[2.65rem] xl:text-[3.25rem] font-light leading-[1.08] mb-4 lg:mb-3 text-white"
            style={{ fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif" }}
          >
            Fragmented product data → governed intelligence.
          </h1>
          <p
            className="text-[17px] sm:text-lg lg:text-[17px] xl:text-lg font-light leading-snug text-[#c5d4e0] max-w-2xl mb-4 lg:mb-3"
            style={{ fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif" }}
          >
            The product and material data layer for fashion.
          </p>
          <p className="text-[15px] sm:text-base md:text-lg lg:text-[15px] xl:text-base font-light leading-relaxed text-white/78 max-w-2xl mb-6 lg:mb-5">
            INTERTEXE connects PLM, ERP, spreadsheets and supplier files into one governed record — then benchmarks
            material strategy, tracks readiness, and publishes passports and public product experiences from that same
            record.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryLink href="/platform/request?intent=snapshot&cta=hero" tone="dark">
              Request a demo
            </PrimaryLink>
            <SecondaryLink href={signIn} tone="dark">
              Sign in
            </SecondaryLink>
          </div>
        </div>
        <div className="shrink-0 min-w-0">
          <ProblemConvergenceVisual className="mt-0" />
        </div>
      </div>
    </section>
  );
}

export function SalesWhatItIsSection() {
  return (
    <section className="bg-[#f7f5f1] py-12 sm:py-14 lg:py-16 border-b border-[#e8e3da]/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>What INTERTEXE is</Eyebrow>
        <Heading className="mb-4 max-w-3xl">
          The product and material data layer for fashion companies.
        </Heading>
        <Body className="max-w-3xl mb-0">
          Brands buy a governed data layer and workspace — not a consumer app. INTERTEXE takes product and material
          information you already have, normalizes and resolves it into one trusted record, turns that record into
          intelligence and readiness, then publishes passports and public product experiences from the same source.
          Your product data already exists — it just doesn&apos;t work together yet.
        </Body>
      </div>
    </section>
  );
}

export function SalesGovernedRecordSection() {
  return (
    <section className="bg-white border-y border-[#e8e3da] py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="max-w-2xl mb-8 sm:mb-10">
          <Eyebrow>One governed product record</Eyebrow>
          <Heading className="mb-4">One source of truth for product and material data.</Heading>
          <Body className="mb-6">
            INTERTEXE connects fragmented inputs, normalizes materials and compositions, preserves original source
            values and provenance, flags gaps and conflicts, and creates an approved canonical record your teams can
            trust — without replacing the systems you already use.
          </Body>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {GOVERNED_POINTS.map((item) => (
              <li key={item} className="text-sm text-[#5c5854] pl-4 border-l-2 border-[#e8e3da] leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <GovernedRecordVisual />
      </div>
    </section>
  );
}

export function SalesIntelligenceSection() {
  return (
    <section className="bg-[#152238] text-[#f7f5f1] py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 lg:gap-14 items-start">
          <div>
            <Eyebrow>Intelligence</Eyebrow>
            <Heading className="mb-4 text-white">See your catalog differently.</Heading>
            <Body className="text-white/72 mb-6">
              Benchmarking and readiness are core differentiators — material mix, completeness, regulatory field gaps,
              and governed peer comparison from the same product record, before the conversation turns to passports or
              public surfaces.
            </Body>
            <ul className="space-y-2">
              {INTELLIGENCE_POINTS.map((item) => (
                <li key={item} className="text-sm text-white/75 pl-4 border-l-2 border-white/15 leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-white/45 leading-relaxed">
              Illustrative example · Individual customer data is never exposed. Peer medians come from governed datasets
              — not fabricated competitor dumps. Over time, governed consumer signals may inform aggregate material
              strategy — aggregate only, never individual shopper data, and not live enterprise intelligence where it
              is not yet operational.
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
    <section className="bg-[#f7f5f1] border-y border-[#e8e3da] py-16 sm:py-20 lg:py-24">
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
            <div className="mb-8 p-4 sm:p-5 bg-white border border-[#e8e3da] border-l-[3px] border-l-[#3e6268]/50">
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
                    <span className="text-[10px] tracking-[0.1em] uppercase text-[#152238]">{verb}</span>
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
                  className="bg-white border border-[#e8e3da] px-4 sm:px-5 py-4 border-l-[3px] border-l-[#3e6268]/50"
                >
                  <h3 className="text-sm font-medium text-[#152238] mb-1.5">{pillar.title}</h3>
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

export function SalesConsumerSection() {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24 border-t border-[#e8e3da]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>Strategic moat — not what you buy</Eyebrow>
        <Heading className="mb-4">The consumer app is strategic advantage, not the enterprise SKU.</Heading>
        <Body className="max-w-3xl mb-4">
          Enterprise customers buy the governed data layer and workspace. The INTERTEXE consumer app and shopping
          surfaces are INTERTEXE&apos;s demand engine and long-term signal surface — not the core contract.
        </Body>
        <Body className="max-w-3xl mb-8">
          Over time, governed consumer signals may inform aggregate material strategy — aggregate only, never individual
          shopper data, and not sold as live brand intelligence today.
        </Body>
        <ConsumerEcosystemVisual />
      </div>
    </section>
  );
}

export function SalesPlatformBreadthSection() {
  const heroSrc = cfImage(`${SITE}/platform/hero-workspace-desktop.png`, {
    width: 1400,
    quality: 82,
    format: "auto",
  });

  return (
    <section className="bg-white border-y border-[#e8e3da] py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>Platform breadth</Eyebrow>
        <Heading className="mb-4">One workspace for product intelligence.</Heading>
        <Body className="max-w-2xl mb-8 sm:mb-10">
          The operating environment brands buy — synced with the live enterprise workspace sidebar. Maturity badges
          reflect what is production-ready today versus expanding modules.
        </Body>
        <figure className="m-0 mb-10 sm:mb-12">
          <img
            src={heroSrc}
            alt="INTERTEXE enterprise workspace — illustrative sample catalog, not a live customer"
            width={1400}
            height={933}
            className="w-full rounded-xl border border-[#e8e3da] shadow-[0_20px_50px_rgba(22,21,19,0.06)]"
            loading="lazy"
          />
          <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">
            Illustrative workspace · Overview → Products → Issues → Benchmark → Readiness → Passport
          </figcaption>
        </figure>
        <PlatformModuleGrid />
        <p className="mt-8 text-xs text-[#8a847c] leading-relaxed max-w-2xl">
          Explore the live demo for module-level detail, or request a walkthrough tailored to your product data.
        </p>
      </div>
    </section>
  );
}

export function SalesCtaSection() {
  const signIn = getEnterpriseLoginUrl();
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 lg:py-24">
      <div className="border border-[#e8e3da] bg-[#f7f5f1] p-10 sm:p-14 text-center">
        <Eyebrow>Founding Pilot</Eyebrow>
        <Heading className="mb-4">Start with your own product data.</Heading>
        <Body className="max-w-xl mx-auto mb-8">
          Available through the Founding Pilot — connect your sources, normalize materials, resolve issues, and see
          intelligence and readiness on real products from your catalog.
        </Body>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <PrimaryLink href="/platform/request?intent=snapshot&cta=footer">Request a demo</PrimaryLink>
          <SecondaryLink href={signIn}>Sign in</SecondaryLink>
        </div>
        <p className="mt-8 text-xs text-[#8a847c]">
          <Link href="/platform/demo" className="underline underline-offset-4 hover:text-[#152238]">
            Or explore the live demo first →
          </Link>
        </p>
      </div>
    </section>
  );
}
