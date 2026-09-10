import Link from "next/link";
import {
  ConsumerEcosystemVisual,
  IntelligenceBenchmarkVisual,
  PlatformModuleGrid,
  ProductIdentityCarriersVisual,
} from "./sales-visuals";
import { HeroProductStage } from "./product-stages";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink, SERIF } from "./platform-ui";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";
import { cfImage } from "../../lib/cloudflare-images";

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
    title: "Public product experiences",
    copy: "One record powers your ecommerce site, passport pages, QR resolution, and brand-owned product surfaces — without rebuilding data per channel.",
  },
] as const;

const SITE = "https://www.intertexe.com";

const VALUE_PILLARS = [
  {
    title: "Connect",
    copy: "PLM, ERP, spreadsheets and supplier files into one workspace — without replacing the systems you already use.",
  },
  {
    title: "Benchmark",
    copy: "Compare fiber mix, completeness and passport readiness against governed peer segments in your market.",
  },
  {
    title: "Publish",
    copy: "Digital Product Passports, regulatory readiness and brand-owned product surfaces from the same record.",
  },
] as const;

export function SalesHeroSection() {
  const signIn = getEnterpriseLoginUrl();

  return (
    <section className="relative overflow-hidden bg-[#152238] text-[#f7f5f1]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-32deg, transparent, transparent 18px, rgba(255,255,255,0.045) 18px, rgba(255,255,255,0.045) 19px)",
        }}
      />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-12 sm:pt-16 md:pt-20 text-center">
        <p className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-[#9bb4c9] mb-5">
          INTERTEXE FOR BRANDS
        </p>
        <h1
          className="text-[2.15rem] sm:text-5xl md:text-[3.35rem] font-light leading-[1.12] mb-5 text-white max-w-4xl mx-auto"
          style={SERIF}
        >
          Trace, benchmark and govern{" "}
          <span className="italic text-[#c5d4e0]">your product data</span>.
        </h1>
        <p className="mx-auto max-w-2xl mb-3 text-[17px] sm:text-lg font-light leading-snug text-[#c5d4e0]" style={SERIF}>
          The product and material data layer for fashion.
        </p>
        <p className="mx-auto max-w-2xl mb-8 text-[15px] sm:text-base font-light leading-relaxed text-white/78">
          Connect the product information you already have. INTERTEXE normalizes materials, surfaces gaps, benchmarks
          your catalog against peers, and publishes passports from one governed record.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-2">
          <PrimaryLink href="/platform/request?intent=snapshot&cta=hero" tone="dark">
            Request a demo
          </PrimaryLink>
          <SecondaryLink href={signIn} tone="dark">
            Sign in
          </SecondaryLink>
        </div>
      </div>
      <div className="relative px-4 sm:px-6 md:px-8 pb-10 sm:pb-14 lg:pb-16">
        <HeroProductStage />
      </div>
    </section>
  );
}

export function SalesWhatItIsSection() {
  return (
    <section className="bg-[#f7f5f1] py-12 sm:py-14 lg:py-16 border-b border-[#e8e3da]/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="max-w-2xl mb-8 sm:mb-10">
          <Eyebrow>What INTERTEXE is</Eyebrow>
          <Heading className="mb-3">The product and material data layer for fashion companies.</Heading>
          <Body className="mb-0">
            A governed workspace brands buy — not a consumer app. Your product data already exists; INTERTEXE makes it
            work together.
          </Body>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          {VALUE_PILLARS.map((pillar) => (
            <article
              key={pillar.title}
              className="bg-white border border-[#e8e3da] p-5 sm:p-6 border-l-[3px] border-l-[#3e6268]/50"
            >
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-2">{pillar.title}</p>
              <p className="text-sm text-[#5c5854] leading-relaxed">{pillar.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SalesGovernedRecordSection() {
  const workspaceSrc = cfImage(`${SITE}/platform/hero-workspace-desktop.png`, {
    width: 1400,
    quality: 82,
    format: "auto",
  });

  return (
    <section className="bg-white border-y border-[#e8e3da] py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-10 lg:gap-14 items-center">
          <div>
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
          <figure className="m-0">
            <img
              src={workspaceSrc}
              alt="INTERTEXE enterprise workspace — illustrative sample catalog, not a live customer"
              width={1400}
              height={933}
              className="w-full rounded-xl border border-[#e8e3da] shadow-[0_24px_60px_rgba(22,21,19,0.08)]"
              loading="lazy"
            />
            <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">
              Illustrative workspace · catalog → materials → issues → benchmark → passport
            </figcaption>
          </figure>
        </div>
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
            <Heading className="mb-4 text-white">Benchmark your material strategy against the market.</Heading>
            <Body className="text-white/72 mb-6">
              Material Benchmark is the subscription-style dataset brands use to compare fabric strategy — your catalog
              against governed peer segments, with conversion signals that show what is working and what is not. Same
              product record powers readiness gaps, regulatory field tracking, and peer comparison before passports or
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
        <Eyebrow>Consumer surface — not what you buy</Eyebrow>
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
  return (
    <section className="bg-white border-y border-[#e8e3da] py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>Platform breadth</Eyebrow>
        <Heading className="mb-4">One workspace for product intelligence.</Heading>
        <Body className="max-w-2xl mb-8 sm:mb-10">
          The operating environment brands buy — synced with the live enterprise workspace sidebar. Maturity badges
          reflect what is production-ready today versus expanding modules.
        </Body>
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
