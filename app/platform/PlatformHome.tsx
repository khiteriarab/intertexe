import Link from "next/link";
import type { ReactNode } from "react";
import { ComparisonView, type ComparisonRow } from "./ComparisonView";
import { PlatformGraphic } from "./PlatformGraphic";
import {
  BenchmarkPreview,
  IssuesPreview,
  NormalizePreview,
  PassportPreview,
} from "./workspace-previews";
import {
  Body,
  DiscoverLink,
  Eyebrow,
  Frame,
  Heading,
  PrimaryLink,
  SecondaryLink,
  SERIF,
} from "./platform-ui";
import { PLATFORM_GRAPHICS } from "../../lib/platform-graphics";
import { CatalogMarquee } from "./CatalogMarquee";
import { ResourceCarousel } from "./ResourceCarousel";
import { StoryTabs, type StoryTab } from "./StoryTabs";
import { ChromeExtensionStage, HeroProductStage } from "./product-stages";
import { EcosystemStage } from "./EcosystemStage";

const EU_TEXTILE =
  "https://single-market-economy.ec.europa.eu/single-market/digital-product-passport/textile-apparel_en";
export const COMPARISON_REVIEWED = "19 August 2026";
const FLOW = ["Understand", "Compare", "Act"] as const;
const VALUE_CHAIN = "PRODUCT DATA → MATERIAL INTELLIGENCE → BUSINESS INSIGHTS → DIGITAL PRODUCT PASSPORT";

const UNDERSTAND_STEPS = [
  {
    n: "01",
    title: "Ingest",
    lead: "Start with the files you already have.",
    copy: "Excel, CSV, PLM/PIM exports, supplier sheets. Brands do not need a clean catalog before INTERTEXE can work.",
  },
  {
    n: "02",
    title: "Structure",
    lead: "Normalize without overwriting the original.",
    copy: "CO becomes cotton. PA and nylon become the same polyamide. Shell and lining stay separate components. Two sources that disagree stay visible. Original values and provenance remain on the record.",
  },
  {
    n: "03",
    title: "Diagnose",
    lead: "Know exactly what is wrong or missing.",
    copy: "Conflicts, invalid percentage totals, missing identifiers, incomplete supplier data and evidence gaps become an Issues Inbox — not another spreadsheet audit.",
  },
];

const RETAIN = [
  {
    title: "Manage",
    copy: "Your material and product information stays organized and continuously updated in one workspace.",
  },
  {
    title: "Improve",
    copy: "INTERTEXE keeps identifying gaps, conflicts and missing information as the catalog changes.",
  },
  {
    title: "Compare",
    copy: "Understand your material strategy relative to peers and, over time, observed consumer demand.",
  },
  {
    title: "Publish",
    copy: "Generate, host and update Digital Product Passports from the same underlying data — when you are ready.",
  },
];

const COMPARISON: ComparisonRow[] = [
  {
    capability: "Connected stack",
    intertexe:
      "Material Intelligence + Competitive Benchmarking + Data Quality + Supplier Data + Regulatory Intelligence + DPP creation/hosting",
    fabacus: "Authenticated catalogues powering DPP implementations",
    retraced: "Traceability-first DPP solution",
    trustrace: "Traceability-first end-to-end DPP offering",
    kezzler: "Standards-based product identity and DPP infrastructure",
    eon: "Digital IDs, consumer experiences and APIs",
  },
  {
    capability: "Digital Product Passport infrastructure",
    intertexe: "Built on structured catalog data through the Founding Pilot and platform",
    fabacus: "Xelacore powers DPP implementations",
    retraced: "DPP solution on traceability data",
    trustrace: "End-to-end DPP offering",
    kezzler: "Standards-based DPP infrastructure",
    eon: "Digital IDs for DPP programmes",
  },
  {
    capability: "Structured product data",
    intertexe: "Core",
    fabacus: "Authenticated / compliant catalogues",
    retraced: "Product and supplier records",
    trustrace: "Product-level traceability data",
    kezzler: "Connected product records",
    eon: "Item-level digital profiles",
  },
  {
    capability: "Material normalization / intelligence",
    intertexe: "Core — fashion material intelligence",
    fabacus: "Product-data focused",
    retraced: "Traceability focused",
    trustrace: "Traceability focused",
    kezzler: "Product-identity focused",
    eon: "Digital-identity focused",
  },
  {
    capability: "Supply-chain traceability",
    intertexe: "Integrate / selective",
    fabacus: "Available within the ecosystem",
    retraced: "Core",
    trustrace: "Core",
    kezzler: "Connected lifecycle data",
    eon: "Partner / ecosystem",
  },
  {
    capability: "Persistent product identity / QR",
    intertexe: "Pilot and platform",
    fabacus: "QR / data carriers",
    retraced: "QR and consumer widgets",
    trustrace: "Persistent IDs and QR",
    kezzler: "Core",
    eon: "Core — QR, NFC, RFID",
  },
  {
    capability: "Consumer-facing digital experience",
    intertexe: "Hosted or brand-owned — consumers do not need the INTERTEXE app",
    fabacus: "Customizable DPP experiences",
    retraced: "DPP consumer layer",
    trustrace: "Consumer DPP access",
    kezzler: "QR-powered experiences",
    eon: "Core consumer Digital ID experiences",
  },
  {
    capability: "Brand API / integration path",
    intertexe: "Material Intelligence API is live; brand-owned passport APIs are in build",
    fabacus: "Data-as-a-Service catalogues",
    retraced: "Widgets and APIs",
    trustrace: "Integrations and OpenAPI",
    kezzler: "Connected products platform",
    eon: "Documented REST API",
  },
  {
    capability: "Material peer benchmarking",
    intertexe: "INTERTEXE differentiator — developing",
    fabacus: "Not publicly confirmed",
    retraced: "Not publicly confirmed",
    trustrace: "Not publicly confirmed",
    kezzler: "Not publicly confirmed",
    eon: "Not publicly confirmed",
  },
  {
    capability: "Consumer-demand connection",
    intertexe: "Unique INTERTEXE roadmap",
    fabacus: "—",
    retraced: "—",
    trustrace: "—",
    kezzler: "—",
    eon: "Consumer engagement differs",
  },
];

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "Is INTERTEXE a Digital Product Passport company?",
    a: "DPP regulation is why many brands start. INTERTEXE is a material-intelligence system: it structures catalog data, shows what is wrong or missing, benchmarks material strategy, and then publishes passports from that same record. Passport generation is an outcome, not the whole product.",
  },
  {
    q: "Does INTERTEXE generate the Digital Product Passport?",
    a: "Yes — once the underlying record is structured and the required fields are present. INTERTEXE determines what is still missing for the applicable passport requirements, the brand or supplier supplies those fields, and INTERTEXE generates the passport record, persistent product identity and QR. Material Intelligence is live in the public demo. Passport generation, identity/QR and publication are delivered through the Founding Pilot and the platform now being built.",
  },
  {
    q: "Do consumers need the INTERTEXE app?",
    a: "No. Passport experiences can be opened from the web or a QR on the product. The architecture supports brand-owned interfaces and API integrations. The INTERTEXE scanner is not required.",
  },
  {
    q: "What data do we need to start?",
    a: "Existing data. CSV, Excel, JSON, a PLM/PIM export or a supplier file. INTERTEXE identifies what can be used and what remains missing.",
  },
  {
    q: "What happens if our data is incomplete?",
    a: "Unknown information stays unknown. INTERTEXE produces an actionable missing-data register. It does not fabricate product data.",
  },
  {
    q: "Can INTERTEXE work with our PIM, PLM or ERP?",
    a: "Start with file import (CSV, Excel, JSON) or a managed catalog after qualification. Broader systems integration and brand APIs are part of the platform architecture and scoped after the pilot. We do not claim pre-built connectors that are not live.",
  },
  {
    q: "How does INTERTEXE handle confidential information?",
    a: (
      <>
        Do not upload confidential catalogs on the public form. Secure transfer is arranged after qualification. See{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="underline underline-offset-4">
          Terms
        </Link>
        .
      </>
    ),
  },
  {
    q: "Is INTERTEXE a compliance certification service?",
    a: "No. INTERTEXE is software for preparation, generation, publication and maintenance. It does not provide legal certification, an official DPP score, or a guarantee of regulatory compliance. The EU Registry remains the registry for passport identifiers.",
  },
  {
    q: "What happens as DPP requirements evolve?",
    a: "A regulatory monitor evaluates tracked requirement changes against the catalog and shows preparation status: unaffected, already complete, missing data, or review needed. Brands do not start over. That is operational software, not legal advice.",
  },
];

const POSITION_ROWS = [
  ["Natural fiber share", "64%", "48%"],
  ["Synthetic share", "36%", "52%"],
  ["Silk assortment", "14%", "9%"],
  ["Complete material data", "87%", "73%"],
  ["Evidence coverage", "71%", "58%"],
  ["Passport ready", "62%", "41%"],
] as const;

const AUDIT = [
  ["8,420", "products analyzed"],
  ["1,271", "missing required fields"],
  ["384", "conflicting compositions"],
  ["217", "invalid percentage totals"],
  ["94", "missing identifiers"],
  ["736", "require supplier information"],
] as const;

const STORY_TABS: StoryTab[] = [
  {
    id: "understand",
    label: "Understand",
    eyebrow: "Understand",
    title: "See what is actually in the catalog",
    copy: "Give INTERTEXE the files you already have. It structures materials, keeps the original source, and opens an Issues Inbox for conflicts, missing fields and invalid totals.",
    points: ["Original source strings are retained", "Conflicts stay visible — nothing is overwritten"],
    href: "/platform/discover",
    cta: "Discover",
  },
  {
    id: "compare",
    label: "Compare",
    eyebrow: "Compare",
    title: "Know how your material strategy compares",
    copy: "See natural vs synthetic share, completeness and passport readiness against an appropriate peer group. Observed consumer demand is coming / developing.",
    points: ["Peer group, never a named competitor dump", "INTERTEXE consumer signal is coming / developing"],
    href: "/platform/demo",
    cta: "Open the benchmark in the live demo",
  },
  {
    id: "act",
    label: "Act",
    eyebrow: "Act",
    title: "Then Digital Product Passports become almost obvious",
    copy: "Once the record is structured, publish it. Consumers do not need the INTERTEXE app. This is not legal certification.",
    points: ["The INTERTEXE scanner is not required", "Hosted or brand-owned passport experiences"],
    href: "/platform/request?intent=snapshot&cta=story_act",
    cta: "See INTERTEXE with your own products",
  },
  {
    id: "engage",
    label: "Engage",
    eyebrow: "Consumer loop",
    title: "Direct from consumer to the same material record",
    copy: "Shoppers already use the Chrome extension and iPhone app. That demand signal is on the roadmap for brand workspaces — it is not a live statistical product yet.",
    points: ["Chrome Fabric Scanner + iPhone shop-by-material", "Same material intelligence, two surfaces"],
    href: "/shop",
    cta: "Open the consumer catalog",
  },
];

export function PlatformHome() {
  return (
    <div>
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
            Material intelligence for fashion
          </p>
          <h1
            className="text-[2.15rem] sm:text-5xl md:text-[3.35rem] font-light leading-[1.12] mb-6 text-white"
            style={SERIF}
          >
            Turn messy product and material data into usable material intelligence.
          </h1>
          <p className="mx-auto max-w-2xl mb-6 sm:mb-4 text-[15px] sm:text-base font-light leading-relaxed text-white/78">
            A brand gives INTERTEXE the product information it already has — Excel, CSV, PLM/PIM exports, supplier
            files. INTERTEXE returns one workspace to understand, improve, compare and use that data. When you are
            ready, the same records become Digital Product Passports.
          </p>
          <ol className="sm:hidden mb-8 space-y-2">
            {FLOW.map((step, index) => (
              <li key={step} className="flex items-baseline justify-center gap-3">
                <span className="text-[10px] tracking-[0.16em] uppercase text-white/55 tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] tracking-[0.12em] uppercase text-white/70">{step}</span>
              </li>
            ))}
          </ol>
          <p className="hidden sm:block text-[13px] tracking-[0.12em] uppercase text-white/65 mb-4">
            Understand → Compare → Act
          </p>
          <p className="text-[11px] tracking-[0.08em] sm:tracking-[0.1em] uppercase text-white/45 mb-10 leading-relaxed">
            {VALUE_CHAIN}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <PrimaryLink href="/platform/request?intent=snapshot&cta=hero" tone="dark">
              See INTERTEXE with your own products
            </PrimaryLink>
            <SecondaryLink href="/platform/demo" tone="dark">
              See the live demo
            </SecondaryLink>
          </div>
        </div>
        <div className="relative px-4 sm:px-6 md:px-8 pb-12 sm:pb-16">
          <HeroProductStage />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <Eyebrow>Workspace</Eyebrow>
        <Heading className="mb-4">One workspace for material intelligence.</Heading>
        <Body className="max-w-2xl mb-8">
          Overview, Issues, Benchmarking, Passport Studio and Regulatory Monitor live in one INTERTEXE workspace.
          The full mockups are on Discover — this page stays a story, not a product tour.
        </Body>
        <DiscoverLink href="/platform/discover">Discover</DiscoverLink>
      </section>

      <CatalogMarquee />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <Eyebrow>Platform story</Eyebrow>
        <Heading className="mb-4">Graphs, tabs and the live product — not a manifesto first.</Heading>
        <Body className="max-w-2xl mb-10">
          Switch Understand → Compare → Act, then Engage to see the Chrome extension, iPhone app and brand workspace
          on the same material record.
        </Body>
        <StoryTabs
          tabs={STORY_TABS}
          panels={{
            understand: (
              <>
                <PlatformGraphic slot="understandNormalize" className="mb-6" />
                {PLATFORM_GRAPHICS.understandNormalize.ready ? null : <NormalizePreview className="mb-6" />}
                <PlatformGraphic slot="understandIssues" className="mb-6" />
                {PLATFORM_GRAPHICS.understandIssues.ready ? null : <IssuesPreview className="mb-0" />}
              </>
            ),
            compare: (
              <>
                <PlatformGraphic slot="compareBenchmark" className="mb-6" />
                {PLATFORM_GRAPHICS.compareBenchmark.ready ? null : <BenchmarkPreview className="mb-0" />}
              </>
            ),
            act: (
              <>
                <PlatformGraphic slot="actPassport" className="mb-6" />
                {PLATFORM_GRAPHICS.actPassport.ready ? null : <PassportPreview className="mb-0" />}
              </>
            ),
            engage: (
              <div className="space-y-8">
                <ChromeExtensionStage />
              </div>
            ),
          }}
        />
      </section>

      <ResourceCarousel />

      <EcosystemStage />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <Eyebrow>Understand</Eyebrow>
        <Heading className="mb-3 max-w-3xl">What happens when a brand uploads its catalog.</Heading>
        <Body className="max-w-2xl mb-10">
          Say a fashion company gives us 10,000 products. The information might look like this. The Understand tab
          above is the interactive normalize and issues view.
        </Body>
        <ol className="grid md:grid-cols-3 gap-x-10 gap-y-10 mb-12">
          {UNDERSTAND_STEPS.map((step) => (
            <li key={step.n} className="border-t border-[#e8e3da] pt-5">
              <p className="text-[11px] tracking-[0.18em] uppercase text-[#152238] mb-2">
                {step.n} — {step.title}
              </p>
              <h3 className="text-lg mb-2" style={SERIF}>
                {step.lead}
              </h3>
              <p className="text-sm text-[#5c5854] leading-relaxed">{step.copy}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm text-[#161513] mb-8 max-w-2xl">
          Missing information remains missing. INTERTEXE does not fabricate product data.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[#e8e3da] border border-[#e8e3da] mb-8">
          {AUDIT.map(([n, label]) => (
            <div key={label} className="bg-white p-5">
              <p className="text-2xl font-light tabular-nums" style={SERIF}>
                {n}
              </p>
              <p className="text-[11px] tracking-[0.08em] uppercase text-[#8a847c] mt-2">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#8a847c] mb-8">
          Illustrative example. Counts are not a live customer catalog. Teams click from each issue into the product
          and fix it.
        </p>
        <DiscoverLink href="/platform/discover">Discover</DiscoverLink>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <Eyebrow>Compare</Eyebrow>
        <Heading className="mb-4">Know how your material strategy compares.</Heading>
        <Body className="max-w-2xl mb-8">
          INTERTEXE does not only tell a brand about itself. It shows how the material mix, data quality and
          passport readiness sit against an appropriate peer group. Merchandising, sustainability and product teams
          can ask: are competitors using more linen than us? How synthetic is our assortment? Where is the catalog
          weaker?
        </Body>
        <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-4">
          Illustrative example · Filters: market segment, category, geography, price band, material, peer group
        </p>
        <p className="text-sm text-[#5c5854] leading-relaxed max-w-2xl mb-4">
          Observed consumer demand is on the roadmap. It is not a live statistical product yet. That last piece is
          something a pure B2B DPP provider cannot simply manufacture — it comes from building the consumer side of
          INTERTEXE.
        </p>
        <p className="text-xs text-[#8a847c] max-w-3xl mb-8">
          Individual customer data is never exposed. Enterprise information enters aggregates only where
          contractually permitted and anonymized.
        </p>
        <MaterialPositionTable />
      </section>

      <section className="bg-white border-y border-[#e8e3da] py-10 sm:py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Eyebrow>Act</Eyebrow>
          <Heading className="mb-4">Then Digital Product Passports become almost obvious.</Heading>
          <Body className="max-w-2xl mb-8">
            Once the catalog is structured and validated, the brand should not have to send it somewhere else to
            create a Digital Product Passport. INTERTEXE says: you already have the data here. Publish it.
          </Body>
          <p className="text-sm text-[#5c5854] mb-10 max-w-2xl leading-relaxed">
            Textile apparel is a priority product group under the EU Ecodesign for Sustainable Products Regulation.
            INTERTEXE determines what is still missing for the applicable requirements, generates the passport
            record and product identity, and hosts the QR experience — or serves it through an API. It is not legal
            advice or official certification.
          </p>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h3 className="text-2xl mb-4" style={SERIF}>
                Requirements change. The catalog should know.
              </h3>
              <Body>
                When a tracked requirement updates, INTERTEXE evaluates impact across the catalog. This is
                preparation status and required-field completeness — not legal certification, an official DPP score,
                or a guarantee of compliance. Brands do not start over.
              </Body>
              <p className="mt-5 text-sm">
                <a href={EU_TEXTILE} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                  EU textile and apparel DPP
                </a>
              </p>
            </div>
            <Frame label="Requirement update" caption="Illustrative example.">
              <p className="text-sm mb-1">EU / Textiles</p>
              <p className="text-2xl font-light tabular-nums my-3" style={SERIF}>
                10,000 products evaluated
              </p>
              <p className="text-sm">9,614 — no action</p>
              <p className="text-sm">311 — missing data</p>
              <p className="text-sm mb-4">75 — review required</p>
              <span className="text-[10px] tracking-[0.12em] uppercase text-[#152238]">Review affected products</span>
            </Frame>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <Eyebrow>Why brands keep INTERTEXE</Eyebrow>
        <Heading className="mb-4">A living system, not a one-off passport file.</Heading>
        <Body className="max-w-2xl mb-10">
          After the first passports, the question should not be “why are we still paying INTERTEXE?” The catalog
          stays in a material intelligence system that merchandising and sustainability teams use every week.
        </Body>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {RETAIN.map((item) => (
            <div key={item.title} className="border-t border-[#e8e3da] pt-5">
              <h3 className="mb-2" style={SERIF}>
                {item.title}
              </h3>
              <p className="text-sm text-[#5c5854] leading-relaxed">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-[#e8e3da] py-10 sm:py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Eyebrow>How INTERTEXE is built</Eyebrow>
          <Heading className="mb-4">Built differently for fashion.</Heading>
          <Body className="max-w-2xl mb-8">
            Basic DPP tools start at the passport. INTERTEXE sits between those tools and enterprise traceability
            platforms, with a proposition those generators do not have: material intelligence, competitive
            benchmarking, data quality, supplier data, regulatory intelligence, and DPP creation/hosting. The
            difference is not that others lack passports or QR codes.
          </Body>
          <ComparisonView rows={COMPARISON} reviewed={COMPARISON_REVIEWED} />
          <Heading className="text-2xl sm:text-3xl mb-6">Understand. Compare. Act.</Heading>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              ["Understand", "See what products are actually made from, what is wrong, and what is missing."],
              [
                "Compare",
                "See how the material strategy sits against comparable brands — and, over time, observed consumer demand.",
              ],
              ["Act", "Publish Digital Product Passports from the approved records and keep them current."],
            ].map(([title, copy]) => (
              <div key={title} className="border-t border-[#e8e3da] pt-5">
                <h3 className="mb-2" style={SERIF}>
                  {title}
                </h3>
                <p className="text-sm text-[#5c5854] leading-relaxed">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-20">
        <Eyebrow>Live demo</Eyebrow>
        <Heading className="mb-4">See the INTERTEXE workflow on a 10-product catalog.</Heading>
        <Body className="max-w-2xl mb-8">
          /platform/demo is the permanent INTERTEXE demonstration: messy source data → normalization → issues →
          material intelligence → benchmarking → DPP readiness → passport. It uses INTERTEXE sample products and
          live Material Intelligence output — no invented metrics.
        </Body>
        <PrimaryLink href="/platform/demo">Explore the live demo</PrimaryLink>
      </section>

      <section
        id="pricing"
        className="bg-white border-y border-[#e8e3da] py-10 sm:py-16 md:py-24"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Eyebrow>How to start</Eyebrow>
          <Heading className="mb-4">Try it. Prove it. Run it.</Heading>
          <Body className="max-w-2xl mb-8">
            See INTERTEXE with your own products. Do not sit through a generic software demo first. Send 10 product
            records — INTERTEXE shows what it finds, what is missing, how the material data compares, and what it
            would take to make those products passport-ready.
          </Body>
          <p className="text-[13px] tracking-[0.1em] uppercase text-[#8a847c] mb-10">
            Try it → Prove it → Run it → Enterprise
          </p>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <article className="border border-[#e8e3da] bg-[#f7f5f1] p-6 flex flex-col">
              <p className="text-[10px] tracking-[0.16em] uppercase text-[#9c7b8b] mb-2">Try it</p>
              <h3 className="text-xl mb-2" style={SERIF}>
                Free 10-Product Material Snapshot
              </h3>
              <p className="text-3xl font-light mb-3" style={SERIF}>
                €0
              </p>
              <p className="text-sm text-[#5c5854] leading-relaxed mb-6 flex-1">
                See what INTERTEXE finds in your own catalog. Normalized materials, conflicts, missing information,
                data completeness, DPP gaps and a limited peer benchmark — inside a real INTERTEXE workspace.
              </p>
              <PrimaryLink href="/platform/request?intent=snapshot&cta=pricing_snapshot">
                Request my snapshot
              </PrimaryLink>
            </article>
            <article className="border border-[#152238] bg-white p-6 flex flex-col">
              <p className="text-[10px] tracking-[0.16em] uppercase text-[#152238] mb-2">Prove it</p>
              <h3 className="text-xl mb-2" style={SERIF}>
                Founding Pilot
              </h3>
              <p className="text-3xl font-light mb-3" style={SERIF}>
                $5,000
              </p>
              <p className="text-sm text-[#5c5854] leading-relaxed mb-4">
                100 complex products or 500 structured rows. 50% to start / 50% on completion. Target 10-business-day
                delivery and one revision.
              </p>
              <ul className="text-sm text-[#5c5854] space-y-1.5 mb-6 flex-1 leading-relaxed">
                {[
                  "Material Intelligence analysis",
                  "Data normalization and conflict detection",
                  "Missing-data register and provenance",
                  "Human review",
                  "Benchmarking snapshot",
                  "DPP data preparation and initial passport generation",
                  "QR identities and downloadable structured data",
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <PrimaryLink href="/platform/request?intent=founding_pilot&cta=pricing_pilot">
                Request the Founding Pilot
              </PrimaryLink>
            </article>
            <article className="border border-[#e8e3da] bg-white p-6 flex flex-col">
              <p className="text-[10px] tracking-[0.16em] uppercase text-[#9c7b8b] mb-2">Run it</p>
              <h3 className="text-xl mb-2" style={SERIF}>
                Ongoing INTERTEXE Platform
              </h3>
              <p className="text-3xl font-light mb-3" style={SERIF}>
                From $499/month
              </p>
              <p className="text-sm text-[#5c5854] leading-relaxed mb-6 flex-1">
                Material intelligence, benchmarking, DPP management and ongoing catalog monitoring. Talk to us about
                your catalog — we will not lock a public three-tier grid before we know what actually drives cost.
              </p>
              <SecondaryLink href="/platform/request?intent=api_access&cta=pricing_platform">
                Talk to us about your catalog
              </SecondaryLink>
            </article>
            <article className="border border-[#e8e3da] bg-white p-6 flex flex-col">
              <p className="text-[10px] tracking-[0.16em] uppercase text-[#9c7b8b] mb-2">Enterprise</p>
              <h3 className="text-xl mb-2" style={SERIF}>
                Custom
              </h3>
              <p className="text-3xl font-light mb-3" style={SERIF}>
                Annual
              </p>
              <p className="text-sm text-[#5c5854] leading-relaxed mb-6 flex-1">
                Large catalogs, custom integrations, custom benchmark cohorts, API volume, SSO, supplier networks and
                dedicated support.
              </p>
              <SecondaryLink href="/platform/request?intent=api_access&cta=pricing_enterprise">
                Talk to us about enterprise
              </SecondaryLink>
            </article>
          </div>
          <p className="text-xs text-[#8a847c] max-w-3xl leading-relaxed">
            The Founding Pilot is implementation, analysis, software and a finished material-data project — not a
            €29/month DPP-tool subscription.
          </p>
        </div>
      </section>

      <section className="border-y border-[#e8e3da] bg-[#faf8f5] py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Eyebrow>Workspace login</Eyebrow>
            <Heading className="text-2xl sm:text-3xl mb-2">Already in an INTERTEXE workspace?</Heading>
            <Body>Sign in to the dashboard. Prospects start with a snapshot or the Founding Pilot.</Body>
          </div>
          <PrimaryLink href="/dashboard/login">Go to dashboard login</PrimaryLink>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <Heading className="mb-2">FAQ</Heading>
        <div className="border-t border-[#e8e3da]">
          {FAQ.map((item) => (
            <details key={item.q} name="platform-faq" className="group border-b border-[#e8e3da]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[#161513] [&::-webkit-details-marker]:hidden">
                <span className="text-base sm:text-lg font-normal leading-snug" style={SERIF}>
                  {item.q}
                </span>
                <svg
                  className="h-4 w-4 shrink-0 text-[#8a847c] transition-transform duration-200 group-open:rotate-180"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M3 5.5 8 10.5 13 5.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </summary>
              <p className="pb-5 pr-8 text-sm text-[#5c5854] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-[#e8e3da] py-10 sm:py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Heading className="mb-6">See INTERTEXE with your own products.</Heading>
          <Body className="max-w-2xl mb-8">
            Free. No commitment. Ten product records. Then you are already inside the workspace.
          </Body>
          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryLink href="/platform/request?intent=snapshot&cta=final">
              Request a 10-product snapshot
            </PrimaryLink>
            <SecondaryLink href="/platform/demo">Explore the live demo</SecondaryLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function MaterialPositionTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-x-auto border border-[#e8e3da] bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#e8e3da] text-[10px] tracking-[0.12em] uppercase text-[#8a847c]">
            <th className="py-3 px-4 font-medium">Metric</th>
            <th className="py-3 px-4 font-medium">Your brand</th>
            <th className="py-3 px-4 font-medium">Peer group</th>
          </tr>
        </thead>
        <tbody>
          {(compact ? POSITION_ROWS.slice(0, 4) : POSITION_ROWS).map(([metric, you, peer]) => (
            <tr key={metric} className="border-b border-[#eeeae4] last:border-0">
              <td className="py-3 px-4">{metric}</td>
              <td className="py-3 px-4 tabular-nums" style={SERIF}>
                {you}
              </td>
              <td className="py-3 px-4 tabular-nums text-[#5c5854]">{peer}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
