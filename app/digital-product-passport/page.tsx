import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PlatformChrome } from "../platform/PlatformChrome";
import { PlatformViewTracker } from "../platform/PlatformViewTracker";
import { Body, Eyebrow, Heading, PrimaryLink, SecondaryLink, SERIF } from "../platform/platform-ui";
import {
  JsonLd,
  absoluteUrl,
  b2bPageMetadata,
  breadcrumbJsonLd,
  faqPageJsonLd,
  softwareApplicationJsonLd,
} from "../../lib/seo/b2b-metadata";
import "../platform/solutions/solutions.css";
import "./dpp-landing.css";

export const dynamic = "force-static";

const TITLE = "Digital Product Passport Software for Fashion | INTERTEXE";
const DESCRIPTION =
  "Create, govern and publish Digital Product Passports for fashion and apparel. INTERTEXE connects product, material, supplier and lifecycle data into one governed record.";

export const metadata: Metadata = b2bPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/digital-product-passport",
  ogImageAlt: "INTERTEXE fashion Digital Product Passport lifecycle dashboard",
});

const CAPABILITIES = [
  {
    title: "Ingest from existing systems",
    copy: "Bring product information from PLM, ERP, supplier files, spreadsheets, and other sources into one governed workflow — without discarding original source data.",
  },
  {
    title: "Normalize material composition",
    copy: "Turn messy composition strings into structured fiber data your teams can compare, validate, and publish consistently.",
  },
  {
    title: "Retain source provenance",
    copy: "INTERTEXE preserves where each claim came from so teams can review conflicts instead of silently overwriting upstream systems.",
  },
  {
    title: "Surface gaps and conflicts",
    copy: "Identify missing fields, conflicting values, and evidence that still needs review before a passport is published.",
  },
  {
    title: "Connect supplier evidence",
    copy: "Link certifications, sourcing documentation, and supplier records to the same product identity used for compliance and consumer disclosure.",
  },
  {
    title: "Publish Digital Product Passports",
    copy: "Turn approved product records into living Digital Product Passports for QR, web, app, white-label, and API distribution.",
  },
] as const;

const LIFECYCLE = [
  "Care instructions",
  "Repair pathways",
  "Resale and ownership transfer",
  "Next-life and circularity guidance",
  "Benchmarking and material intelligence",
] as const;

const FAQ = [
  {
    q: "What is a Digital Product Passport?",
    a: "A Digital Product Passport is a structured digital record of product information that can support transparency, compliance readiness, and post-purchase services. For fashion, it typically connects identity, materials, evidence, and lifecycle data to a persistent product record.",
  },
  {
    q: "How does a Digital Product Passport work for fashion?",
    a: "Brands structure product and material data into a governed record, then publish that record to channels such as a hosted passport page, QR carrier, website, app, or API. Consumers and partners can access approved information without each team rebuilding the same product data.",
  },
  {
    q: "What information can a fashion Digital Product Passport contain?",
    a: "Depending on brand scope and readiness, passports can include product identity, material composition, supplier and manufacturing evidence, care guidance, repair and resale pathways, and other lifecycle details connected to the same record.",
  },
  {
    q: "How does INTERTEXE create a Digital Product Passport?",
    a: "INTERTEXE ingests product data from existing systems, normalizes key attributes, preserves provenance, connects supplier evidence, and publishes approved records as Digital Product Passports for hosted, white-label, QR, or API delivery.",
  },
  {
    q: "Can INTERTEXE connect to existing PLM, ERP or supplier data?",
    a: "Yes. INTERTEXE is designed to work with product information from PLM, ERP, supplier files, spreadsheets, and related systems, mapping those inputs into a governed product record rather than requiring a full catalog rewrite.",
  },
  {
    q: "Can brands use their own Digital Product Passport design?",
    a: "Brands can use INTERTEXE-hosted passports, white-label experiences, or access the same governed record through the API for their own website or app presentation.",
  },
  {
    q: "Does INTERTEXE support QR codes?",
    a: "Yes. Approved product records can be connected to physical carriers such as QR, and where applicable NFC or RFID, so shoppers and partners can open the passport from the product.",
  },
  {
    q: "Can the passport update after a product is sold?",
    a: "INTERTEXE treats the passport as a living record connected to the governed product identity, so care, repair, ownership transfer, resale, and next-life information can evolve with the product over time.",
  },
  {
    q: "Are Digital Product Passports already mandatory for textiles in the EU?",
    a: "Textile-specific Digital Product Passport requirements are still being finalized. INTERTEXE helps brands prepare product records for emerging EU Digital Product Passport requirements and publish structured product data as those frameworks mature — without claiming that every textile category is already fully mandatory today.",
  },
] as const;

export default function DigitalProductPassportLandingPage() {
  return (
    <PlatformChrome active="solutions">
      <PlatformViewTracker event="platform_dpp_landing_view" />
      <JsonLd
        data={softwareApplicationJsonLd({
          url: absoluteUrl("/digital-product-passport"),
          name: "INTERTEXE Digital Product Passport",
          description:
            "Fashion Digital Product Passport software for apparel brands — governed product records, material intelligence, QR, and multi-channel publication.",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "INTERTEXE for Brands", path: "/brands" },
          { name: "Digital Product Passport", path: "/digital-product-passport" },
        ])}
      />
      <JsonLd data={faqPageJsonLd([...FAQ])} />

      <section className="dpp-hero">
        <div className="platform-lux-wrap">
          <div className="dpp-hero-grid">
            <div className="dpp-hero-copy">
              <Eyebrow>Digital Product Passport</Eyebrow>
              <h1 className="dpp-h1" style={SERIF}>
                Digital Product Passport software built for fashion.
              </h1>
              <Body className="mb-6">
                INTERTEXE structures and governs product data for DPP readiness and publication — connecting product,
                material, supplier, and lifecycle information into one record brands can trust across teams and
                channels.
              </Body>
              <Body className="mb-8 dpp-careful">
                Prepare product records for emerging EU Digital Product Passport requirements. Textile-specific
                requirements are still being finalized; INTERTEXE helps you organize, evidence, and publish product data
                as those frameworks mature.
              </Body>
              <div className="dpp-actions">
                <PrimaryLink href="/brands/demo">See it live</PrimaryLink>
                <SecondaryLink href="/brands/request?intent=demo&cta=dpp_landing">Request a demo</SecondaryLink>
              </div>
            </div>
            <div className="dpp-hero-visual">
              <Image
                src="/platform/act-passport.png"
                alt="INTERTEXE fashion Digital Product Passport lifecycle dashboard"
                width={960}
                height={720}
                className="dpp-hero-image"
                sizes="(max-width: 899px) 92vw, 44vw"
                priority
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      <section className="dpp-section" aria-labelledby="dpp-what-heading">
        <div className="platform-lux-wrap">
          <div className="dpp-section-head">
            <Eyebrow>What INTERTEXE does</Eyebrow>
            <Heading id="dpp-what-heading" className="mb-4">
              From fragmented product data to a publishable passport.
            </Heading>
            <Body className="mb-0 max-w-3xl">
              Fashion brands rarely lack product information — they lack a governed way to normalize it, prove it, and
              publish it. INTERTEXE turns that fragmentation into{" "}
              <Link href="/brands" className="dpp-inline-link">
                material intelligence
              </Link>{" "}
              and a living Digital Product Passport.
            </Body>
          </div>
          <ul className="dpp-capability-grid">
            {CAPABILITIES.map((item) => (
              <li key={item.title}>
                <h3 className="dpp-capability-title" style={SERIF}>
                  {item.title}
                </h3>
                <p>{item.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dpp-section dpp-section--soft" aria-labelledby="dpp-publish-heading">
        <div className="platform-lux-wrap dpp-split">
          <div>
            <Eyebrow>Publish everywhere</Eyebrow>
            <Heading id="dpp-publish-heading" className="mb-4">
              One governed record. Many connected channels.
            </Heading>
            <Body className="mb-5">
              Once product information is approved, INTERTEXE can publish a Digital Product Passport for clothing and
              apparel experiences — hosted by INTERTEXE, white-labeled for your brand, linked from QR, or delivered
              through your website, app, and{" "}
              <Link href="/brands" className="dpp-inline-link">
                platform API pathways
              </Link>
              .
            </Body>
            <ul className="dpp-checklist">
              {LIFECYCLE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="dpp-actions dpp-actions--tight">
              <SecondaryLink href="/brands/demo">See a live product passport</SecondaryLink>
            </div>
          </div>
          <div className="dpp-split-visual">
            <Image
              src="/platform/workspace-product-record.png"
              alt="Fashion product record showing material composition, traceability and Digital Product Passport data"
              width={960}
              height={720}
              className="dpp-hero-image"
              sizes="(max-width: 899px) 92vw, 42vw"
              unoptimized
            />
          </div>
        </div>
      </section>

      <section className="dpp-section" aria-labelledby="dpp-faq-heading">
        <div className="platform-lux-wrap dpp-faq-layout">
          <div>
            <Eyebrow>FAQ</Eyebrow>
            <Heading id="dpp-faq-heading" className="mb-4">
              Digital Product Passports for fashion, answered carefully.
            </Heading>
            <Body className="mb-0">
              Clear answers for sustainability, product, compliance, and digital teams evaluating DPP software for
              apparel.
            </Body>
          </div>
          <div className="dpp-faq-list">
            {FAQ.map((item) => (
              <details key={item.q} className="dpp-faq-item" name="dpp-faq">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="dpp-close">
        <div className="platform-lux-wrap">
          <Heading className="mb-4">Ready to prepare fashion product data for DPP publication?</Heading>
          <Body className="mb-8 max-w-2xl">
            Explore the{" "}
            <Link href="/brands" className="dpp-inline-link-light">
              INTERTEXE platform
            </Link>
            , see a live passport, or talk with the team about your catalog and evidence workflow.
          </Body>
          <div className="dpp-actions">
            <PrimaryLink href="/brands/demo">See it live</PrimaryLink>
            <SecondaryLink href="/brands/pricing">Explore pricing</SecondaryLink>
          </div>
        </div>
      </section>
    </PlatformChrome>
  );
}
