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
  "PLM / PIM / ERP exports",
  "Spreadsheets",
  "Supplier files",
  "Product feeds",
  "Internal systems",
] as const;

const RECORD_STEPS = [
  { n: "01", title: "Connect", copy: "Bring existing product and material data into INTERTEXE." },
  { n: "02", title: "Normalize", copy: "Standardize materials, compositions, identifiers and product fields." },
  { n: "03", title: "Resolve", copy: "Surface missing, conflicting and unverified information for review." },
  { n: "04", title: "Act", copy: "Benchmark the catalog, prepare DPP-ready data and publish approved product identities." },
] as const;

const OUTCOMES = [
  {
    title: "Benchmark your catalog",
    copy: "See natural vs synthetic mix, completeness and passport readiness against governed peer groups — where data exists.",
  },
  {
    title: "Understand material composition",
    copy: "Fiber distribution, category relationships and composition quality across the assortment.",
  },
  {
    title: "Identify missing or conflicting information",
    copy: "Issues become an inbox — not another spreadsheet hiding gaps.",
  },
  {
    title: "Prepare for regulatory requirements",
    copy: "Readiness and required-field completeness as obligations evolve — not legal certification.",
  },
  {
    title: "Create and manage Digital Product Passports",
    copy: "Versioned passports and stable public identities from the same approved record.",
  },
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
              Connect and normalize your product and material data, uncover gaps, benchmark your catalog and prepare
              for Digital Product Passports from one governed product record.
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
          Fashion brands already hold product and material information across many systems — but it rarely connects
          into one usable record.
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
          <Body>
            INTERTEXE connects fragmented inputs, normalizes materials and compositions, flags gaps and conflicts,
            preserves provenance, and creates an approved canonical record your teams can trust.
          </Body>
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
          Four editorial steps — not a feature dump. Each builds on the governed record before it.
        </Body>
      </div>

      <EditorialGraphicWrap>
        <PlatformEditorialGraphic
          src={EDITORIAL_GRAPHICS.productJourney}
          alt="The INTERTEXE process — connect, normalize, resolve, understand and publish from one product record"
        />
      </EditorialGraphicWrap>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid sm:grid-cols-2 gap-0 border border-[#e8e3da] bg-white">
          {RECORD_STEPS.map((step, i) => (
            <article
              key={step.n}
              className={`p-8 sm:p-10 bg-white ${i % 2 === 0 ? "sm:border-r border-[#e8e3da]" : ""} ${i < 2 ? "border-b border-[#e8e3da]" : ""}`}
            >
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#9c7b8b] mb-4 tabular-nums">{step.n}</p>
              <h3 className="text-2xl sm:text-[1.65rem] font-light mb-3 text-[#161513]" style={SERIF}>
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

export function SalesOutcomesSection() {
  return (
    <section className="bg-[#152238] text-[#f7f5f1] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>What that unlocks</Eyebrow>
        <Heading className="mb-4 text-white">From product data to decisions.</Heading>
        <Body className="max-w-2xl mb-12 text-white/72">
          Material intelligence turns the governed record into outcomes merchandising, sustainability and product teams
          can act on.
        </Body>
        <div className="space-y-0 divide-y divide-white/10">
          {OUTCOMES.map((item, i) => (
            <div key={item.title} className="grid md:grid-cols-[12rem_minmax(0,1fr)] gap-4 py-7 sm:py-8">
              <p className="text-[11px] tracking-[0.16em] uppercase text-[#9bb4c9] tabular-nums pt-1">
                {String(i + 1).padStart(2, "0")}
              </p>
              <div>
                <h3 className="text-xl sm:text-2xl font-light mb-2 text-white" style={SERIF}>
                  {item.title}
                </h3>
                <p className="text-sm text-white/68 leading-relaxed max-w-2xl">{item.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SalesIntelligenceSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-24">
      <Eyebrow>Intelligence centerpiece</Eyebrow>
      <Heading className="mb-4">See your catalog differently.</Heading>
      <Body className="max-w-2xl mb-10">
        Natural vs synthetic composition, fiber distribution, completeness, passport readiness, material relationships
        and issue concentration — governed peer benchmarks only where real aggregate data exists.
      </Body>
      <div className="space-y-8">
        <WorkspaceHeroPreview className="mt-0" />
        <BenchmarkPreview className="mb-0" />
      </div>
      <p className="mt-6 text-xs text-[#8a847c] leading-relaxed max-w-3xl">
        Illustrative example · Individual customer data is never exposed. Peer medians come from governed datasets —
        not fabricated competitor dumps.
      </p>
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
              Approved product data can support versioned Digital Product Passports and public product identities as
              regulatory requirements mature. DPP is an important output — not the entire identity of INTERTEXE.
            </Body>
            <DppFlow />
            <p className="mt-6 text-xs text-[#8a847c] leading-relaxed">
              Preparation status and required-field completeness — not official certification or a guarantee of
              compliance with final textile requirements.
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
          INTERTEXE is not only enterprise software. Our consumer products create a real-world environment for
          understanding how people discover and evaluate materials. Over time, permitted and appropriately aggregated
          signals can help brands relate consumer material demand to their own assortment — without individual tracking,
          without PII, and without claiming live enterprise intelligence where it does not yet exist.
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
          One connected operating environment — not a grid of identical feature cards.
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
        <Eyebrow>Pilot</Eyebrow>
        <Heading className="mb-4">Start with your own product data.</Heading>
        <Body className="max-w-xl mx-auto mb-8">
          A controlled pilot on your catalog — connect sources, normalize materials, resolve issues, and see
          intelligence and readiness on real products.
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
