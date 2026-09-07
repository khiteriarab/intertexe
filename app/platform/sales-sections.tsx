import Link from "next/link";
import {
  ConsumerEcosystemVisual,
  GovernedRecordVisual,
  IntelligenceBenchmarkVisual,
  JourneyStepsVisual,
  PassportIdentityVisual,
  PlatformModuleGrid,
  ProblemConvergenceVisual,
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
  "Composition completeness and passport readiness",
  "Governed peer benchmarking — where aggregate data exists",
] as const;

const DPP_OUTPUTS = [
  "Digital Product Passports from the same approved record",
  "Stable public product identity and QR resolution",
  "Versioned publication with regulatory readiness tracking",
] as const;

const SITE = "https://www.intertexe.com";

export function SalesHeroSection() {
  const signIn = getEnterpriseLoginUrl();
  const heroSrc = cfImage(`${SITE}/platform/hero-workspace-desktop.png`, {
    width: 1400,
    quality: 82,
    format: "auto",
  });

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
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-14 sm:pt-20 pb-6 sm:pb-10">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-10 lg:gap-14 items-end">
          <div className="text-left">
            <p className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-[#9bb4c9] mb-5">
              INTERTEXE FOR BRANDS
            </p>
            <h1
              className="text-[2.1rem] sm:text-[2.75rem] md:text-[3.25rem] font-light leading-[1.08] mb-6 text-white"
              style={{ fontFamily: "Georgia, 'Iowan Old Style', Palatino, serif" }}
            >
              Turn product data into material intelligence.
            </h1>
            <p className="text-[15px] sm:text-base font-light leading-relaxed text-white/78 max-w-xl mb-8">
              INTERTEXE connects and normalizes the product data fashion brands already have, identifies gaps and
              inconsistencies, benchmarks material strategy, and prepares the same governed data for Digital Product
              Passports.
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
          <div className="min-w-0 lg:pb-4">
            <img
              src={heroSrc}
              alt="INTERTEXE enterprise workspace — illustrative sample catalog, not a live customer"
              width={1400}
              height={933}
              className="w-full rounded-lg border border-white/20 shadow-[0_32px_80px_rgba(8,16,32,0.45)]"
              loading="eager"
              fetchPriority="high"
            />
            <p className="mt-3 text-[11px] text-white/50 leading-relaxed">
              Illustrative workspace · catalog → materials → issues → benchmark → passport
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SalesProblemSection() {
  return (
    <section className="bg-[#f7f5f1] py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>The problem</Eyebrow>
        <Heading className="mb-5">
          Your product data already exists.
          <br />
          It just doesn&apos;t work together.
        </Heading>
        <Body className="max-w-2xl">
          Product and material information already lives across PLM, ERP, spreadsheets, suppliers and feeds — but
          rarely connects into one governed record your teams can use.
        </Body>
        <ProblemConvergenceVisual />
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

export function SalesHowItWorksSection() {
  return (
    <section className="bg-[#f7f5f1] py-16 sm:py-20 lg:py-24 border-t border-[#e8e3da]/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>How it works</Eyebrow>
        <Heading className="mb-4">From fragmented data to usable intelligence.</Heading>
        <Body className="max-w-2xl">
          Five steps from fragmented inputs to approved outputs — each building on the governed record before it.
        </Body>
        <JourneyStepsVisual />
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
              Benchmarking is one of INTERTEXE&apos;s strongest differentiators — material mix, completeness, readiness
              and governed peer comparison from the same product record, before the conversation turns to passports or
              compliance outputs.
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
              — not fabricated competitor dumps. Consumer demand signals remain future-facing where not yet operational.
            </p>
          </div>
          <IntelligenceBenchmarkVisual />
        </div>
      </div>
    </section>
  );
}

export function SalesDppSection() {
  return (
    <section className="bg-[#f7f5f1] border-y border-[#e8e3da] py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div>
            <Eyebrow>Digital Product Passport</Eyebrow>
            <Heading className="mb-4">
              One product record.
              <br />
              Ready for what comes next.
            </Heading>
            <Body className="mb-6">
              The same approved governed record supports passports and public product identity — a major output of
              INTERTEXE, not its entire definition. DPP publication flows from the intelligence and readiness work
              that comes first.
            </Body>
            <ul className="space-y-2">
              {DPP_OUTPUTS.map((item) => (
                <li key={item} className="text-sm text-[#5c5854] pl-4 border-l-2 border-[#3e6268]/30 leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-[#8a847c] leading-relaxed">
              DPP is an important output — not the entire identity of INTERTEXE. Preparation status and required-field
              completeness only — not EU certification, full textile compliance, or approval as a verified DPP service
              provider unless explicitly established.
            </p>
          </div>
          <PassportIdentityVisual />
        </div>
      </div>
    </section>
  );
}

export function SalesConsumerSection() {
  return (
    <section className="bg-[#f7f5f1] py-16 sm:py-20 lg:py-24 border-t border-[#e8e3da]/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>The consumer advantage</Eyebrow>
        <Heading className="mb-4">Built on both sides of fashion.</Heading>
        <Body className="max-w-3xl mb-2">
          INTERTEXE operates on both sides of fashion — consumer discovery and scanning on one side, enterprise product
          and material intelligence on the other. The center is governed product data that connects them over time.
        </Body>
        <Body className="max-w-3xl mb-2 text-[#5c5854]">
          Future consumer signals will remain governed, anonymized and aggregated — never individual tracking, never PII,
          and never implied as live enterprise intelligence where it does not yet exist.
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
          A real operating environment for product intelligence — catalog, materials, issues, benchmarking, passports,
          suppliers and readiness — not a single-purpose DPP generator.
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
