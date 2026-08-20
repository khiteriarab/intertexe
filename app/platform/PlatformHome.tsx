import Link from "next/link";
import type { ReactNode } from "react";
import { ComparisonView, type ComparisonRow } from "./ComparisonView";
import { WorkspaceGallery } from "./WorkspaceGallery";
import {
  Body,
  Eyebrow,
  Frame,
  Heading,
  PrimaryLink,
  QrMark,
  SecondaryLink,
  SERIF,
} from "./platform-ui";

const EU_TEXTILE =
  "https://single-market-economy.ec.europa.eu/single-market/digital-product-passport/textile-apparel_en";
export const COMPARISON_REVIEWED = "19 August 2026";
const FLOW = ["Prepare", "Generate", "Publish", "Maintain", "Understand"] as const;

const STEPS = [
  {
    n: "01",
    title: "Import",
    lead: "Start with the data you already have.",
    copy: "CSV, Excel, JSON, product feeds or connected systems. Brands do not need to clean the catalog before bringing it to INTERTEXE.",
  },
  {
    n: "02",
    title: "Understand",
    lead: "Material Intelligence structures the catalog.",
    copy: "Normalize materials, compositions, components, categories, terminology and identifiers. Original values and source provenance stay with the record.",
  },
  {
    n: "03",
    title: "Resolve",
    lead: "Know exactly what needs attention.",
    copy: "Missing information, conflicts, invalid percentages, evidence gaps, identifier problems and discrepancies between sources become an Issues Inbox.",
  },
  {
    n: "04",
    title: "Generate",
    lead: "Turn approved records into Digital Product Passports.",
    copy: "Create the structured passport record and a persistent product identity when the underlying data is ready.",
  },
  {
    n: "05",
    title: "Publish",
    lead: "Connect every product to its passport.",
    copy: "Generate QR and data-carrier assets. Host with INTERTEXE, embed in a brand experience, or serve through INTERTEXE APIs. Consumers do not need the INTERTEXE app.",
  },
  {
    n: "06",
    title: "Maintain",
    lead: "Keep the catalog current as requirements evolve.",
    copy: "When a tracked requirement changes, INTERTEXE evaluates the catalog: unaffected, already complete, needs action, or missing information.",
  },
];

const COMPARISON: ComparisonRow[] = [
  {
    capability: "Connected stack",
    intertexe: "Material Intelligence → DPP operations → Market / consumer intelligence",
    fabacus: "Authenticated catalogues powering DPP implementations",
    retraced: "Traceability-first DPP solution",
    trustrace: "Traceability-first end-to-end DPP offering",
    kezzler: "Standards-based product identity and DPP infrastructure",
    eon: "Digital IDs, consumer experiences and APIs",
  },
  {
    capability: "Digital Product Passport infrastructure",
    intertexe: "Building through the Founding DPP Pilot and SaaS",
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
    intertexe: "Pilot and SaaS build",
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
    q: "Does INTERTEXE generate the Digital Product Passport?",
    a: "INTERTEXE is being built to structure product information, manage review, generate and publish passport records, create product identities and QR assets, and maintain them in one platform. Material Intelligence is live in the public demo. Passport generation, identity/QR and publication are delivered through the Founding DPP Pilot and the SaaS now being built.",
  },
  {
    q: "Do consumers need the INTERTEXE app?",
    a: "No. Passport experiences can be opened from the web or a QR on the product. The architecture supports brand-owned interfaces and API integrations. The INTERTEXE scanner is not required.",
  },
  {
    q: "What data do we need to start?",
    a: "Existing data. CSV, Excel, JSON or a supported export. INTERTEXE identifies what can be used and what remains missing.",
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
    a: "A regulatory monitor evaluates tracked requirement changes against the catalog and shows preparation status: unaffected, already complete, missing data, or review needed. That is operational software, not legal advice.",
  },
];

export function PlatformHome() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-12 sm:pt-20 md:pt-28 pb-10 sm:pb-16">
        <Eyebrow>The Digital Product Passport platform built for fashion</Eyebrow>
        <h1
          className="text-[2.15rem] sm:text-5xl md:text-[3.4rem] font-light leading-[1.12] max-w-4xl mb-6"
          style={SERIF}
        >
          Digital Product Passports, from product data to publication.
        </h1>
        <Body className="max-w-2xl mb-6 sm:mb-4">
          INTERTEXE transforms fragmented fashion product data into structured material intelligence, identifies
          what&apos;s missing, generates Digital Product Passports and product identities, and helps brands keep
          their catalog current as requirements evolve.
        </Body>
        <ol className="sm:hidden mb-8 space-y-2">
          {FLOW.map((step, index) => (
            <li key={step} className="flex items-baseline gap-3">
              <span className="text-[10px] tracking-[0.16em] uppercase text-[#1d4734] tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-[13px] tracking-[0.12em] uppercase text-[#8a847c]">{step}</span>
            </li>
          ))}
        </ol>
        <p className="hidden sm:block text-[13px] tracking-[0.12em] uppercase text-[#8a847c] mb-10">
          Prepare → Generate → Publish → Maintain → Understand
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <PrimaryLink href="/platform/demo">See the live demo</PrimaryLink>
          <SecondaryLink href="/platform/request?intent=snapshot&cta=hero">
            Request a 10-product snapshot
          </SecondaryLink>
        </div>
      </section>

      <section className="border-y border-[#e8e3da] py-10 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
          <Heading className="mb-4">Product passports need a system, not a one-off file.</Heading>
          <Body>
            Textile apparel is a priority product group under the EU Ecodesign for Sustainable Products Regulation.
            INTERTEXE is the operating system for preparing, generating, publishing and maintaining Digital Product
            Passports — starting from the product data brands already have. It is not legal advice or official
            certification.
          </Body>
          <p className="mt-5 text-sm">
            <a href={EU_TEXTILE} className="underline underline-offset-4" target="_blank" rel="noreferrer">
              EU textile and apparel DPP
            </a>
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <Eyebrow>One system, beginning to end</Eyebrow>
        <Heading className="mb-3 max-w-3xl">Import. Understand. Resolve. Generate. Publish. Maintain.</Heading>
        <Body className="max-w-2xl mb-12">
          Prepare now. Publish when you&apos;re ready. Maintain everything in one system.
        </Body>
        <ol className="grid md:grid-cols-2 gap-x-12 gap-y-10">
          {STEPS.map((step) => (
            <li key={step.n} className="border-t border-[#e8e3da] pt-5">
              <p className="text-[11px] tracking-[0.18em] uppercase text-[#1d4734] mb-2">
                {step.n} — {step.title}
              </p>
              <h3 className="text-lg mb-2" style={SERIF}>
                {step.lead}
              </h3>
              <p className="text-sm text-[#5c5854] leading-relaxed">{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-white border-y border-[#e8e3da] py-10 sm:py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Eyebrow>Material Intelligence</Eyebrow>
          <Heading className="mb-4 max-w-3xl">DPP infrastructure starts with better product data.</Heading>
          <Body className="max-w-2xl mb-8">
            A passport is only as useful as the information underneath it. INTERTEXE preserves raw inputs, extracts
            composition, separates components, standardizes terminology, detects contradictions, validates totals,
            keeps provenance, surfaces uncertainty, and sends low-confidence results to review.
          </Body>
          <p className="text-sm text-[#161513] mb-10 max-w-2xl">
            Missing information remains missing. INTERTEXE does not fabricate product data.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="border border-[#e8e3da] p-6 bg-[#f7f5f1]">
              <p className="text-[10px] tracking-[0.16em] uppercase text-[#8a847c] mb-4">Submitted</p>
              <p className="text-sm mb-1">Silk Evening Dress</p>
              <p className="font-mono text-[13px] text-[#161513] mb-3">92 SE 8 EA / LINING 100 VI</p>
              <p className="text-sm text-[#5c5854]">Supplier: Portugal</p>
            </div>
            <div className="border border-[#e8e3da] p-6 bg-white">
              <p className="text-[10px] tracking-[0.16em] uppercase text-[#1d4734] mb-4">INTERTEXE</p>
              <p className="text-[11px] tracking-[0.12em] uppercase text-[#8a847c]">Shell</p>
              <p className="text-sm mb-3">92% Silk · 8% Elastane</p>
              <p className="text-[11px] tracking-[0.12em] uppercase text-[#8a847c]">Lining</p>
              <p className="text-sm mb-3">100% Viscose</p>
              <p className="text-[11px] tracking-[0.12em] uppercase text-[#8a847c]">Manufacturing country</p>
              <p className="text-sm mb-4">Portugal</p>
              <p className="text-xs text-[#8a847c]">Source: Supplier file · Status: Normalized · Confidence: High</p>
            </div>
          </div>
          <PrimaryLink href="/platform/demo">See INTERTEXE analyze a real catalog</PrimaryLink>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <Eyebrow>Workspace</Eyebrow>
        <Heading className="mb-4">One workspace for your DPP program</Heading>
        <Body className="max-w-2xl mb-8 sm:mb-10">
          Material Intelligence is live in the public demo. Overview, Issues, Passport Studio and Regulatory Monitor
          are the workspace the Founding DPP Pilot delivers into, and the SaaS now being built. Previews below are
          faithful to that product — not consulting slides.
        </Body>
        <WorkspaceGallery
          frames={[
            {
              id: "overview",
              label: "Overview",
              caption: "Illustrative example. Counts are not a live customer catalog.",
              children: (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      ["12,430", "Products"],
                      ["9,814", "Passport ready"],
                      ["8,762", "Published"],
                      ["673", "Require attention"],
                    ].map(([n, l]) => (
                      <div key={l}>
                        <p className="text-2xl font-light tabular-nums" style={SERIF}>
                          {n}
                        </p>
                        <p className="text-[11px] tracking-[0.1em] uppercase text-[#8a847c] mt-1">{l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#eeeae4] pt-4">
                    <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-2">Needs your attention</p>
                    <p className="text-sm">Composition conflict · 8 products</p>
                    <p className="text-sm">Evidence required · 11 products</p>
                  </div>
                </>
              ),
            },
            {
              id: "intelligence",
              label: "Material Intelligence",
              caption: "Normalization preserves the original source string.",
              children: (
                <>
                  <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-2">Original</p>
                  <p className="font-mono text-[13px] mb-4">MAIN 92 WO 8 PA / LIN 100 VI</p>
                  <p className="text-[10px] tracking-[0.14em] uppercase text-[#1d4734] mb-2">INTERTEXE</p>
                  <p className="text-sm mb-1">Shell · 92% Wool · 8% Polyamide</p>
                  <p className="text-sm mb-4">Lining · 100% Viscose</p>
                  <p className="text-xs text-[#8a847c]">Source retained · Normalized · Human review: not required</p>
                </>
              ),
            },
            {
              id: "issues",
              label: "Issues",
              children: (
                <>
                  <p className="text-sm mb-1">Composition conflict</p>
                  <p className="text-xs text-[#8a847c] mb-3">Review required</p>
                  <p className="text-sm">PLM: 100% Cotton</p>
                  <p className="text-sm mb-4">Supplier declaration: 97% Cotton / 3% Elastane</p>
                  <span className="text-[10px] tracking-[0.12em] uppercase text-[#1d4734]">Open issue</span>
                </>
              ),
            },
            {
              id: "studio",
              label: "Passport Studio",
              children: (
                <>
                  <p className="text-[10px] tracking-[0.14em] uppercase text-[#1d4734] mb-2">Ready to publish</p>
                  <p className="text-sm mb-4" style={SERIF}>
                    Silk Evening Dress
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] tracking-[0.1em] uppercase border border-[#e8e3da] px-3 py-2">
                      Preview passport
                    </span>
                    <span className="text-[10px] tracking-[0.1em] uppercase bg-[#1d4734] text-white px-3 py-2">
                      Publish
                    </span>
                    <span className="text-[10px] tracking-[0.1em] uppercase border border-[#e8e3da] px-3 py-2">
                      Generate QR
                    </span>
                  </div>
                </>
              ),
            },
            {
              id: "monitor",
              label: "Regulatory Monitor",
              caption: "Tracked requirements and preparation status — not certification.",
              children: (
                <>
                  <p className="text-sm mb-1">Requirement update · EU / Textiles</p>
                  <p className="text-2xl font-light tabular-nums my-3" style={SERIF}>
                    417 products evaluated
                  </p>
                  <p className="text-sm">362 already satisfy the required fields</p>
                  <p className="text-sm mb-4">55 need action</p>
                  <span className="text-[10px] tracking-[0.12em] uppercase text-[#1d4734]">
                    Review affected products →
                  </span>
                </>
              ),
            },
          ]}
        />
      </section>

      <section className="bg-white border-y border-[#e8e3da] py-10 sm:py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Eyebrow>Issues Inbox</Eyebrow>
          <Heading className="mb-4 max-w-3xl">Stop searching through spreadsheets for what&apos;s missing.</Heading>
          <Body className="max-w-2xl mb-10">
            INTERTEXE turns product-data problems into an actionable workflow instead of another report.
          </Body>
          <ul className="divide-y divide-[#e8e3da] border-y border-[#e8e3da] max-w-xl mb-8">
            {[
              ["Missing manufacturing facility", "14 products"],
              ["Composition conflict", "8 products"],
              ["Identifier mismatch", "3 products"],
              ["Evidence required", "11 products"],
            ].map(([issue, count]) => (
              <li key={issue} className="flex justify-between gap-4 py-4 text-sm">
                <span>{issue}</span>
                <span className="text-[#8a847c] tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
          <SecondaryLink href="/platform/request?intent=snapshot&cta=issues">Resolve issues →</SecondaryLink>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <Eyebrow>Passport Studio</Eyebrow>
        <Heading className="mb-4">From structured data to a live passport.</Heading>
        <Body className="max-w-2xl mb-8 sm:mb-10">
          Use the INTERTEXE-hosted experience or serve passport information inside your own digital experience
          through our API. The INTERTEXE scanner is not required.
        </Body>
        <div className="flex flex-col items-center md:grid md:grid-cols-3 md:items-start gap-8 md:gap-6">
          <div className="w-full order-1">
            <Frame label="Brand workspace">
              <p className="text-[10px] tracking-[0.14em] uppercase text-[#1d4734] mb-2">Ready to publish</p>
              <p className="text-sm" style={SERIF}>
                Silk Evening Dress
              </p>
            </Frame>
          </div>
          <div className="flex flex-col items-center text-center gap-3 order-2 py-0 md:py-6">
            <QrMark />
            <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c]">Product identity / QR</p>
          </div>
          <div className="order-3 mx-auto w-full max-w-[280px] md:max-w-[240px] rounded-[32px] md:rounded-[28px] border border-[#e8e3da] bg-white p-6 md:p-5 shadow-[0_24px_60px_rgba(22,21,19,0.08)]">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#8a847c] mb-3">Passport</p>
            <p className="text-xl md:text-lg mb-4" style={SERIF}>
              Silk Evening Dress
            </p>
            <ul className="text-sm md:text-xs text-[#5c5854] space-y-2.5 md:space-y-2">
              {["Materials", "Manufacturing", "Care", "Repair", "Certifications", "Circularity"].map((item) => (
                <li key={item} className="border-t border-[#eeeae4] pt-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-[#e8e3da] py-10 sm:py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Eyebrow>Your experience, our infrastructure</Eyebrow>
          <Heading className="mb-4">Your customer experience. Our product intelligence.</Heading>
          <Body className="max-w-2xl mb-10">
            Brands do not have to send customers into the INTERTEXE application. INTERTEXE can power QR experiences,
            brand websites, brand applications, retailer interfaces, internal product systems, and future scanners
            through INTERTEXE infrastructure. The product identity and structured record stay consistent.
          </Body>
          <div className="flex flex-col items-center text-center gap-4 text-sm">
            <div className="border border-[#e8e3da] px-6 py-3 bg-[#f7f5f1]">Product / QR</div>
            <span className="text-[#8a847c]">↓</span>
            <div className="border border-[#1d4734] text-[#1d4734] px-6 py-3">INTERTEXE DPP Infrastructure</div>
            <span className="text-[#8a847c]">↓</span>
            <div className="flex flex-col sm:flex-row gap-3">
              <span className="border border-[#e8e3da] px-5 py-3">Brand App</span>
              <span className="border border-[#e8e3da] px-5 py-3">Brand Website</span>
              <span className="border border-[#e8e3da] px-5 py-3">INTERTEXE</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <Eyebrow>Regulatory Monitor</Eyebrow>
            <Heading className="mb-4">Requirements change. Your product catalog should know.</Heading>
            <Body>
              When a tracked requirement updates, INTERTEXE evaluates impact across the catalog. This is
              preparation status and required-field completeness — not legal certification, an official DPP score, or
              a guarantee of compliance.
            </Body>
          </div>
          <Frame label="Requirement update" caption="Illustrative example.">
            <p className="text-sm mb-1">EU / Textiles</p>
            <p className="text-2xl font-light tabular-nums my-3" style={SERIF}>
              1,247 products evaluated
            </p>
            <p className="text-sm">1,106 — no action</p>
            <p className="text-sm">93 — missing data</p>
            <p className="text-sm mb-4">48 — review required</p>
            <span className="text-[10px] tracking-[0.12em] uppercase text-[#1d4734]">Review affected products</span>
          </Frame>
        </div>
      </section>

      <section className="bg-white border-y border-[#e8e3da] py-10 sm:py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Eyebrow>Peer benchmarking</Eyebrow>
          <Heading className="mb-4">Know how your material strategy compares.</Heading>
          <Body className="max-w-2xl mb-8">
            INTERTEXE can compare a brand&apos;s material mix, data quality and DPP program against appropriate peer
            benchmarks. Individual customer data is never exposed. Enterprise information enters aggregates only where
            contractually permitted and anonymized.
          </Body>
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-4">
            Illustrative example · Filters: market segment, category, geography, price band, material, peer group
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#e8e3da] border border-[#e8e3da]">
            {[
              ["Natural-fiber share", "64%", "48%"],
              ["Polyester share", "18%", "27%"],
              ["Data completeness", "89%", "71%"],
              ["Passport coverage", "72%", "54%"],
            ].map(([label, you, peer]) => (
              <div key={label} className="bg-white p-5">
                <p className="text-[11px] tracking-[0.1em] uppercase text-[#8a847c] mb-3">{label}</p>
                <p className="text-2xl font-light tabular-nums" style={SERIF}>
                  {you}
                </p>
                <p className="text-xs text-[#8a847c] mt-2">Your brand</p>
                <p className="text-sm tabular-nums mt-3">{peer}</p>
                <p className="text-xs text-[#8a847c]">Peer group median</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <Eyebrow>Coming / developing</Eyebrow>
        <Heading className="mb-4">From compliance data to commercial intelligence.</Heading>
        <Body className="max-w-2xl mb-8">
          INTERTEXE already sits with shoppers at the point of material decision. Connecting catalog strategy to
          observed consumer interest is on the roadmap. It is not a live statistical product yet.
        </Body>
        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mb-6">
          {[
            ["Your assortment", "17% linen"],
            ["Peer assortment", "13% linen"],
            ["INTERTEXE consumer interest", "29%"],
          ].map(([k, v]) => (
            <div key={k} className="border-t border-[#e8e3da] pt-4">
              <p className="text-[11px] tracking-[0.1em] uppercase text-[#8a847c] mb-2">{k}</p>
              <p className="text-xl font-light" style={SERIF}>
                {v}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm text-[#5c5854]">
          Illustrative: your linen assortment may under-index against observed consumer interest.
        </p>
      </section>

      <section className="bg-white border-y border-[#e8e3da] py-10 sm:py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Eyebrow>How INTERTEXE is built</Eyebrow>
          <Heading className="mb-4">Built differently for fashion.</Heading>
          <Body className="max-w-2xl mb-8">
            DPP platforms approach the problem from different starting points. INTERTEXE begins with product and
            material intelligence and connects that foundation to passport infrastructure and consumer insight. The
            difference is not that others lack passports or QR codes.
          </Body>
          <ComparisonView rows={COMPARISON} reviewed={COMPARISON_REVIEWED} />
          <Heading className="text-2xl sm:text-3xl mb-6">INTERTEXE connects three layers.</Heading>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              ["Material Intelligence", "Understand and improve the product data underneath the passport."],
              ["DPP Infrastructure", "Generate, publish and maintain the passport and its product identity."],
              [
                "Market Intelligence",
                "Understand how your material strategy compares with peers and, over time, observed consumer demand.",
              ],
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
        <Heading className="mb-4">See INTERTEXE analyze a real catalog record.</Heading>
        <Body className="max-w-2xl mb-8">
          The public demo uses actual INTERTEXE Material Intelligence output — normalized composition, evidence
          status and a DPP-readiness map. No invented metrics.
        </Body>
        <PrimaryLink href="/platform/demo">Explore the live demo</PrimaryLink>
      </section>

      <section className="bg-white border-y border-[#e8e3da] py-10 sm:py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <Eyebrow>10-product snapshot</Eyebrow>
          <Heading className="mb-4">See your own product data inside INTERTEXE.</Heading>
          <Body className="max-w-2xl mb-8">Start with 10 products. Continue into the Founding DPP Pilot when you are ready.</Body>
          <p className="text-sm tracking-[0.04em] text-[#5c5854] mb-8">
            Upload → INTERTEXE analyzes → Normalized records → Conflicts → Missing information → Review snapshot →
            Founding DPP Pilot
          </p>
          <PrimaryLink href="/platform/request?intent=snapshot&cta=snapshot_section">
            Request my 10-product snapshot
          </PrimaryLink>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-24">
        <Eyebrow>Managed implementation</Eyebrow>
        <Heading className="mb-4">Start with a controlled catalog.</Heading>
        <div className="border border-[#e8e3da] bg-white p-6 sm:p-10 md:p-12 max-w-3xl">
          <p className="text-[11px] tracking-[0.16em] uppercase text-[#9c7b8b] mb-2">Founding DPP Pilot</p>
          <p className="text-5xl font-light mb-2" style={SERIF}>
            $5,000
          </p>
          <p className="text-sm text-[#5c5854] mb-8">
            $2,500 at signing · $2,500 at agreed pilot completion. A managed implementation into the INTERTEXE
            workspace — not a subscription.
          </p>
          <p className="text-sm mb-6">Scope: 100 complex products or 500 structured rows. Target 10-business-day delivery.</p>
          <ul className="text-sm text-[#5c5854] space-y-2 mb-8 leading-relaxed columns-1 sm:columns-2 gap-8">
            {[
              "Product-data ingestion",
              "Material normalization",
              "Immutable source preservation",
              "Provenance",
              "Deterministic validation",
              "Conflict detection",
              "Missing-data register",
              "Human review workflow",
              "DPP field preparation",
              "DPP generation for eligible pilot records",
              "Product identity / QR generation",
              "Passport preview",
              "Structured CSV/JSON outputs",
              "Private INTERTEXE workspace",
              "Implementation findings",
              "One revision",
            ].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryLink href="/platform/request?intent=founding_pilot&cta=pilot_card">
              Request the Founding DPP Pilot
            </PrimaryLink>
            <SecondaryLink href="/platform/request?intent=snapshot&cta=pilot_secondary">
              Try a free 10-product snapshot
            </SecondaryLink>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e8e3da] bg-[#faf8f5] py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Eyebrow>Workspace login</Eyebrow>
            <Heading className="text-2xl sm:text-3xl mb-2">Already in an INTERTEXE workspace?</Heading>
            <Body>Sign in to the dashboard. Prospects start with a snapshot or the Founding DPP Pilot.</Body>
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
          <Heading className="mb-6">Build your DPP foundation now.</Heading>
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
