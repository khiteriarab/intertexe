import Link from "next/link";
import {
  BenchmarkPreview,
  IssuesPreview,
  NormalizePreview,
  PassportPreview,
  WorkspaceChrome,
} from "./workspace-previews";
import { WorkspaceHeroPreview } from "./WorkspaceHeroPreview";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink, SERIF } from "./platform-ui";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";

const DATA_SOURCES = [
  "PLM / PIM",
  "ERP exports",
  "Spreadsheets",
  "Supplier files",
  "Product feeds",
] as const;

const RECORD_STEPS = [
  { n: "01", title: "Connect", copy: "Bring existing product and material data into INTERTEXE — Excel, CSV, PLM/PIM/ERP exports, supplier files and product feeds." },
  { n: "02", title: "Normalize", copy: "Standardize materials, compositions, identifiers and product fields into a consistent structure." },
  { n: "03", title: "Resolve", copy: "Surface missing, conflicting and unverified information for review — gaps become an actionable inbox." },
  { n: "04", title: "Understand", copy: "Benchmark material strategy, composition completeness, data quality and readiness across your catalog." },
  { n: "05", title: "Publish", copy: "Create approved outputs from the same record — Digital Product Passports, stable public identity and versioned publication." },
] as const;

const GOVERNED_CAPABILITIES = [
  "Normalization across fragmented sources",
  "Provenance and source-record preservation",
  "Conflicting values surfaced for review",
  "Missing fields flagged — never invented",
  "Confidence and review state",
  "Evidence and approval workflow",
  "Versioned product and passport history",
] as const;

const INTELLIGENCE_POINTS = [
  "Natural vs synthetic material mix",
  "Fiber distribution across the catalog",
  "Composition completeness and data quality",
  "Passport and regulatory readiness",
  "Category and material relationships",
  "Governed peer benchmarking — where aggregate data exists",
] as const;

const DPP_OUTPUTS = [
  "Digital Product Passports",
  "Stable public product identity",
  "QR / data carrier resolution",
  "Versioned publication",
  "Regulatory readiness tracking",
  "Future additional product-data outputs",
] as const;

const PLATFORM_MODULES = [
  "Products",
  "Issues",
  "Passports",
  "Workflows",
  "Suppliers",
  "Benchmarking",
  "Regulations",
  "Analytics",
  "Integrations",
] as const;

const CONSUMER_SURFACES = [
  { label: "Shopping platform", href: "/shop", copy: "Material-first discovery across the INTERTEXE catalog." },
  { label: "iOS app", href: "/scanner", copy: "Scan labels and shop by natural fiber in stores." },
  { label: "Chrome fabric scanner", href: "/scanner", copy: "Save and compare composition while browsing retailers." },
] as const;

const EDITORIAL_GRAPHICS = {
  dataArchitecture: "/platform/INTERTEXE_01_Data_Architecture.png",
  productJourney: "/platform/INTERTEXE_02_Product_Data_Journey.png",
  fashionEcosystem: "/platform/INTERTEXE_03_Fashion_Ecosystem.png",
} as const;

/** Full-width editorial graphic — ivory background blends with page, no SaaS card chrome. */
function PlatformEditorialGraphic({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  return (
    <figure className="m-0">
      <div className="relative w-full overflow-hidden bg-[#f7f5f1]">
        <img
          src={src}
          alt={alt}
          width={2400}
          height={1350}
          className="block w-full h-auto max-w-none"
          loading="lazy"
          decoding="async"
        />
      </div>
      {caption ? (
        <figcaption className="mt-3 text-[11px] text-[#8a847c] leading-relaxed">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

function EditorialGraphicWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative my-10 sm:my-14 lg:my-16">
      <div className="max-w-[88rem] mx-auto">
        {/* On small screens, preserve legibility via horizontal scroll rather than over-shrinking */}
        <div className="overflow-x-auto sm:overflow-visible px-3 sm:px-6 md:px-8 lg:px-12 [-webkit-overflow-scrolling:touch]">
          <div className="w-[720px] max-w-none sm:w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}

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
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-14 sm:pt-20 pb-6 sm:pb-10">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-10 lg:gap-14 items-end">
          <div className="text-left">
            <p className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-[#9bb4c9] mb-5">
              INTERTEXE FOR BRANDS
            </p>
            <h1
              className="text-[2.1rem] sm:text-[2.75rem] md:text-[3.25rem] font-light leading-[1.08] mb-6 text-white"
              style={SERIF}
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
              src="/platform/hero-workspace-desktop.png"
              alt="INTERTEXE enterprise workspace — illustrative sample catalog, not a live customer"
              width={1920}
              height={1080}
              className="w-full rounded-lg border border-white/20 shadow-[0_32px_80px_rgba(8,16,32,0.45)]"
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
    <section className="bg-[#f7f5f1] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>The problem</Eyebrow>
        <Heading className="mb-5">
          Your product data already exists.
          <br />
          It just doesn&apos;t work together.
        </Heading>
        <Body className="max-w-2xl mb-2">
          Product and material information already lives across PLM, ERP, spreadsheets, suppliers and feeds — but
          rarely connects into one governed record your teams can use.
        </Body>
      </div>

      <EditorialGraphicWrap>
        <PlatformEditorialGraphic
          src={EDITORIAL_GRAPHICS.dataArchitecture}
          alt="INTERTEXE data architecture — fragmented PLM, ERP, spreadsheets and supplier files converging on one governed product record"
        />
      </EditorialGraphicWrap>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div>
            <ul className="space-y-2 mb-8">
              {DATA_SOURCES.map((source) => (
                <li key={source} className="text-sm text-[#5c5854] pl-4 border-l-2 border-[#e8e3da]">
                  {source}
                </li>
              ))}
            </ul>
            <Body>
              INTERTEXE connects these sources without requiring brands to replace their existing systems.
            </Body>
          </div>
          <DataSourcesVisual />
        </div>
      </div>
    </section>
  );
}

function DataSourcesVisual() {
  return (
    <figure className="m-0">
      <div className="relative bg-[#f7f5f1] border border-[#e8e3da] p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-3 mb-8">
          {DATA_SOURCES.map((source) => (
            <div
              key={source}
              className="text-[10px] sm:text-[11px] tracking-[0.08em] uppercase text-[#5c5854] bg-white border border-[#e8e3da] px-3 py-3 leading-snug"
            >
              {source}
            </div>
          ))}
        </div>
        <div className="flex justify-center mb-4" aria-hidden>
          <div className="w-px h-10 bg-[#3e6268]/40" />
        </div>
        <div className="bg-[#152238] text-white p-5 sm:p-6">
          <p className="text-[10px] tracking-[0.18em] uppercase text-white/55 mb-2">INTERTEXE</p>
          <p className="text-lg font-light" style={SERIF}>
            One governed product record
          </p>
          <p className="text-xs text-white/65 mt-2 leading-relaxed">
            Source values preserved · canonical fields for intelligence · provenance retained
          </p>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-[#8a847c]">
        Illustrative — multiple sources converge on one INTERTEXE record.
      </figcaption>
    </figure>
  );
}

export function SalesGovernedRecordSection() {
  return (
    <section className="bg-white border-y border-[#e8e3da] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="max-w-2xl mb-10 sm:mb-14">
          <Eyebrow>One governed product record</Eyebrow>
          <Heading className="mb-4">One source of truth for product and material data.</Heading>
          <Body className="mb-6">
            INTERTEXE connects fragmented inputs, normalizes materials and compositions, preserves original source
            values and provenance, flags gaps and conflicts, and creates an approved canonical record your teams can
            trust — without replacing the systems you already use.
          </Body>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {GOVERNED_CAPABILITIES.map((item) => (
              <li key={item} className="text-sm text-[#5c5854] pl-4 border-l-2 border-[#e8e3da] leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-8 items-start">
          <NormalizePreview className="mb-0" />
          <IssuesPreview className="mb-0" />
        </div>
      </div>
    </section>
  );
}

export function SalesHowItWorksSection() {
  return (
    <section className="bg-[#f7f5f1] py-16 sm:py-24 border-t border-[#e8e3da]/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>How it works</Eyebrow>
        <Heading className="mb-4">From fragmented data to usable intelligence.</Heading>
        <Body className="max-w-2xl mb-2">
          Five steps from fragmented inputs to approved outputs — each building on the governed record before it.
        </Body>
      </div>

      <EditorialGraphicWrap>
        <PlatformEditorialGraphic
          src={EDITORIAL_GRAPHICS.productJourney}
          alt="The INTERTEXE process — connect, normalize, resolve, understand and publish from one product record"
        />
      </EditorialGraphicWrap>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {RECORD_STEPS.map((step) => (
            <article key={step.n} className="p-6 sm:p-7 bg-white border border-[#e8e3da]">
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#9c7b8b] mb-3 tabular-nums">{step.n}</p>
              <h3 className="text-xl sm:text-[1.35rem] font-light mb-2 text-[#161513]" style={SERIF}>
                {step.title}
              </h3>
              <p className="text-sm text-[#5c5854] leading-relaxed">{step.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SalesIntelligenceSection() {
  return (
    <section className="bg-[#152238] text-[#f7f5f1] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>Intelligence</Eyebrow>
        <Heading className="mb-4 text-white">See your catalog differently.</Heading>
        <Body className="max-w-2xl mb-8 text-white/72">
          Benchmarking is one of INTERTEXE&apos;s strongest differentiators — material mix, completeness, readiness
          and governed peer comparison from the same product record, before the conversation turns to passports or
          compliance outputs.
        </Body>
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mb-12">
          {INTELLIGENCE_POINTS.map((item) => (
            <li key={item} className="text-sm text-white/75 pl-4 border-l-2 border-white/15 leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
        <div className="space-y-8">
          <WorkspaceHeroPreview className="mt-0" />
          <BenchmarkPreview className="mb-0" />
        </div>
        <p className="mt-6 text-xs text-white/45 leading-relaxed max-w-3xl">
          Illustrative example · Individual customer data is never exposed. Peer medians come from governed datasets —
          not fabricated competitor dumps. Consumer demand signals remain future-facing where not yet operational.
        </p>
      </div>
    </section>
  );
}

export function SalesDppSection() {
  return (
    <section className="bg-[#f7f5f1] border-y border-[#e8e3da] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
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
            <ul className="space-y-2 mb-8">
              {DPP_OUTPUTS.map((item) => (
                <li key={item} className="text-sm text-[#5c5854] pl-4 border-l-2 border-[#3e6268]/30 leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
            <DppFlow />
            <p className="mt-6 text-xs text-[#8a847c] leading-relaxed">
              DPP is an important output — not the entire identity of INTERTEXE. Preparation status and
              required-field completeness only — not EU certification, full textile compliance, or approval as a
              verified DPP service provider unless explicitly established.
            </p>
          </div>
          <PassportPreview className="mb-0" />
        </div>
      </div>
    </section>
  );
}

function DppFlow() {
  const steps = [
    "Product record",
    "Approved data",
    "DPP",
    "Stable QR / public identity",
    "Consumer-facing passport",
  ];
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-3 text-sm text-[#5c5854]">
          <span className="text-[#3e6268] font-medium tabular-nums w-4">{i + 1}</span>
          <span>{step}</span>
          {i < steps.length - 1 ? <span className="text-[#c4bdb4] ml-auto hidden sm:inline" aria-hidden>→</span> : null}
        </li>
      ))}
    </ol>
  );
}

export function SalesConsumerSection() {
  return (
    <section className="bg-[#f7f5f1] py-16 sm:py-24 border-t border-[#e8e3da]/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>The consumer advantage</Eyebrow>
        <Heading className="mb-4">Built on both sides of fashion.</Heading>
        <Body className="max-w-3xl mb-2">
          INTERTEXE operates on both sides of fashion — consumer discovery and scanning on one side, enterprise product
          and material intelligence on the other. The center is governed product data that connects them over time.
        </Body>
        <Body className="max-w-3xl mb-2 text-[#5c5854]">
          Future consumer signals will remain governed, anonymized and aggregated — never individual tracking, never
          PII, and never implied as live enterprise intelligence where it does not yet exist.
        </Body>
      </div>

      <EditorialGraphicWrap>
        <PlatformEditorialGraphic
          src={EDITORIAL_GRAPHICS.fashionEcosystem}
          alt="INTERTEXE fashion ecosystem — consumers discover and scan while brands benchmark, prepare and publish from the same material intelligence"
        />
      </EditorialGraphicWrap>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <ConsumerBridgeVisual />
        <div className="grid sm:grid-cols-3 gap-6 mt-12">
          {CONSUMER_SURFACES.map((surface) => (
            <div key={surface.label} className="border-t border-[#e8e3da] pt-5">
              <p className="text-[10px] tracking-[0.16em] uppercase text-[#9c7b8b] mb-2">{surface.label}</p>
              <p className="text-sm text-[#5c5854] leading-relaxed mb-3">{surface.copy}</p>
              <Link href={surface.href} className="text-[11px] tracking-[0.12em] uppercase text-[#152238] underline underline-offset-4">
                Explore →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConsumerBridgeVisual() {
  return (
    <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 md:gap-6 items-stretch text-center">
      <div className="bg-white border border-[#e8e3da] p-6 flex flex-col justify-center">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-3">Consumers</p>
        <p className="text-lg font-light text-[#161513]" style={SERIF}>
          Discover → Scan → Compare
        </p>
      </div>
      <div className="hidden md:flex items-center text-[#3e6268] text-xl" aria-hidden>
        ↕
      </div>
      <div className="bg-[#152238] text-white p-6 flex flex-col justify-center">
        <p className="text-[10px] tracking-[0.18em] uppercase text-white/55 mb-3">INTERTEXE</p>
        <p className="text-base font-light leading-snug" style={SERIF}>
          Product + material intelligence
        </p>
      </div>
      <div className="hidden md:flex items-center text-[#3e6268] text-xl" aria-hidden>
        ↕
      </div>
      <div className="bg-white border border-[#e8e3da] p-6 flex flex-col justify-center">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[#9c7b8b] mb-3">Brands</p>
        <p className="text-lg font-light text-[#161513]" style={SERIF}>
          Understand → Benchmark → Prepare → Publish
        </p>
      </div>
    </div>
  );
}

export function SalesPlatformBreadthSection() {
  return (
    <section className="bg-white border-y border-[#e8e3da] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>Platform breadth</Eyebrow>
        <Heading className="mb-4">One workspace for product intelligence.</Heading>
        <Body className="max-w-2xl mb-10">
          A real operating environment for product intelligence — catalog, materials, issues, benchmarking, passports,
          suppliers and readiness — not a single-purpose DPP generator.
        </Body>
        <WorkspaceChrome active="Overview" issueCount="487">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg border border-[#e8e3da] p-4">
              <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-1">Catalog</p>
              <p className="text-2xl font-light tabular-nums" style={SERIF}>
                12,430
              </p>
              <p className="text-xs text-[#8a847c]">products · illustrative</p>
            </div>
            <div className="bg-white rounded-lg border border-[#e8e3da] p-4">
              <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-1">Passport ready</p>
              <p className="text-2xl font-light tabular-nums" style={SERIF}>
                62%
              </p>
              <p className="text-xs text-[#8a847c]">preparation status</p>
            </div>
          </div>
          <p className="text-xs text-[#8a847c] leading-relaxed">
            Modules in the workspace: {PLATFORM_MODULES.join(" · ")}
          </p>
        </WorkspaceChrome>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {PLATFORM_MODULES.map((mod) => (
            <span key={mod} className="text-[11px] tracking-[0.1em] uppercase text-[#5c5854]">
              {mod}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SalesCtaSection() {
  const signIn = getEnterpriseLoginUrl();
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-24">
      <div className="border border-[#e8e3da] bg-[#f7f5f1] p-10 sm:p-14 text-center">
        <Eyebrow>Founding Pilot</Eyebrow>
        <Heading className="mb-4">Start with your own product data.</Heading>
        <Body className="max-w-xl mx-auto mb-8">
          Available through the Founding Pilot — connect your sources, normalize materials, resolve issues, and see
          intelligence and readiness on real products, with broader platform capabilities rolling out in stages.
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
