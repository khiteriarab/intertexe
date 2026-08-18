import type { Metadata } from "next";
import Link from "next/link";
import { CATALOG_STATS } from "../../lib/catalog-stats";
import { PILOT_MAILTO, SNAPSHOT_MAILTO } from "../../lib/platform-demo";
import { PlatformChrome } from "./PlatformChrome";

export const metadata: Metadata = {
  title: "INTERTEXE Platform — Material Intelligence",
  description:
    "The material-intelligence layer for fashion. Composition lookup, structured material records, catalog enrichment and API access — useful today for commerce, and mapped toward emerging DPP requirements.",
};

export default function PlatformPage() {
  return (
    <PlatformChrome active="platform">
      <div className="max-w-4xl mx-auto px-6 md:px-8 py-20 md:py-28">
        <p className="text-[11px] tracking-[0.25em] text-[#9c7b8b] mb-8">INTERTEXE PLATFORM</p>

        <h1
          className="text-4xl md:text-5xl font-light text-[#1a1a1a] mb-8 leading-[1.15]"
          style={{ fontFamily: "Georgia, 'Iowan Old Style', serif" }}
        >
          The material-intelligence layer for fashion.
        </h1>

        <p className="text-lg text-[#5c5854] font-light leading-relaxed mb-6 max-w-2xl">
          Brands upload their catalogs. INTERTEXE reconciles fibre composition, attaches provenance,
          identifies gaps and returns structured records for commerce — and for future Digital Product
          Passport systems.
        </p>

        <p className="text-lg text-[#5c5854] font-light leading-relaxed mb-12 max-w-2xl">
          DPP creates the urgency. The product is useful today for search, filtering, retailer consistency,
          product pages and consumer trust.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link
            href="/platform/demo"
            className="text-[11px] tracking-[0.2em] uppercase bg-black text-white px-10 py-4 hover:bg-[#2a2a2a]"
          >
            Try the two-minute demo
          </Link>
          <a
            href={SNAPSHOT_MAILTO}
            className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a] underline underline-offset-4"
          >
            Submit 10 products →
          </a>
        </div>
      </div>

      <div className="border-y border-[#ddd5cb] py-10">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          <div className="flex flex-wrap gap-x-10 gap-y-3 text-[11px] tracking-[0.18em] text-[#8a847c] uppercase">
            <span>Composition lookup by GTIN</span>
            <span>·</span>
            <span>Structured material records</span>
            <span>·</span>
            <span>Catalog enrichment</span>
            <span>·</span>
            <span>API access</span>
            <span>·</span>
            <span>Consumer scan loop</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 md:px-8 py-20">
        <div className="border-t border-[#ddd5cb] py-14 grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-[#8a847c] uppercase mb-4">01</p>
            <h2 className="text-2xl font-light" style={{ fontFamily: "Georgia, serif" }}>
              Composition lookup
            </h2>
          </div>
          <div>
            <p className="text-sm text-[#5c5854] leading-relaxed mb-4">
              Send a GTIN, EAN or SKU. Receive normalized fibre composition, natural-fiber percentage,
              primary fiber, and a DPP-readiness map — not a legal certificate.
            </p>
            <p className="text-sm text-[#5c5854] leading-relaxed">
              A company prefix can identify a manufacturer. It never returns assumed composition as verified
              product-level data.
            </p>
          </div>
        </div>

        <div className="border-t border-[#ddd5cb] py-14 grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-[#8a847c] uppercase mb-4">02</p>
            <h2 className="text-2xl font-light" style={{ fontFamily: "Georgia, serif" }}>
              Structured material records
            </h2>
          </div>
          <div>
            <p className="text-sm text-[#5c5854] leading-relaxed mb-4">
              Each record carries composition, provenance (source, capture date, review status) and a field
              map toward an emerging DPP schema. Gaps stay visible.
            </p>
            <p className="text-sm text-[#5c5854] leading-relaxed">
              OCR from a label scan is evidence. INTERTEXE only calls a record{" "}
              <span className="text-[#1a1a1a]">verified</span> when the image, extraction and review status
              are retained.
            </p>
          </div>
        </div>

        <div className="border-t border-[#ddd5cb] py-14 grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-[#8a847c] uppercase mb-4">03</p>
            <h2 className="text-2xl font-light" style={{ fontFamily: "Georgia, serif" }}>
              Catalog enrichment
            </h2>
          </div>
          <div>
            <p className="text-sm text-[#5c5854] leading-relaxed mb-4">
              Upload a product list. We match identifiers, attach composition where evidence exists, flag
              conflicts, and return structured rows for PIM, search, PDPs and retailer feeds.
            </p>
            <p className="text-sm text-[#5c5854] leading-relaxed mb-4">
              Match rate is catalog-specific. We do not publish a guaranteed percentage. Coverage method is
              documented; a 10-product snapshot shows your exact matches before a paid pilot.
            </p>
            <p className="text-sm text-[#5c5854] leading-relaxed">
              Consumer listing counts ({CATALOG_STATS.productCountFormatted} shoppable pieces,{" "}
              {CATALOG_STATS.brandCountFormatted} vetted brands) describe the INTERTEXE shop, not
              barcode-verified DPP coverage.
            </p>
          </div>
        </div>

        <div className="border-t border-[#ddd5cb] py-14 grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-[#8a847c] uppercase mb-4">04</p>
            <h2 className="text-2xl font-light" style={{ fontFamily: "Georgia, serif" }}>
              API access
            </h2>
          </div>
          <div>
            <p className="text-sm text-[#5c5854] leading-relaxed mb-4">
              License lookup and enrichment over HTTPS. The public demonstration is{" "}
              <Link href="/platform/demo" className="underline underline-offset-4 text-[#1a1a1a]">
                /platform/demo
              </Link>
              . Partner keys are issued after a snapshot or pilot.
            </p>
            <p className="text-sm text-[#5c5854] leading-relaxed">
              Consumer scans continue to grow the evidence loop. Catalog architecture also uses brand,
              retailer and affiliate-feed information — those sources are labelled, never presented as
              reviewed label evidence.
            </p>
          </div>
        </div>

        <div className="border-t border-[#ddd5cb] py-16">
          <p className="text-[11px] tracking-[0.2em] text-[#8a847c] uppercase mb-12">THE REGULATORY CONTEXT</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <p className="text-3xl font-light mb-3">2026</p>
              <p className="text-xs text-[#5c5854] leading-relaxed">
                The EU DPP Registry launched. It is infrastructure for the Ecodesign system — not the start
                of textile product obligations.
              </p>
            </div>
            <div>
              <p className="text-3xl font-light mb-3">Q4 2027</p>
              <p className="text-xs text-[#5c5854] leading-relaxed">
                Planned adoption of the ESPR delegated act for textiles. Specific DPP data fields are not
                final until that act.{" "}
                <a
                  href="https://single-market-economy.ec.europa.eu/single-market/digital-product-passport/textile-apparel_en"
                  className="underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  European Commission
                </a>
              </p>
            </div>
            <div>
              <p className="text-3xl font-light mb-3">Today</p>
              <p className="text-xs text-[#5c5854] leading-relaxed">
                Material records already improve search, filtering, PDPs and trust. INTERTEXE maps to an
                emerging schema (DPP-readiness), not a completed legal requirement.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#ddd5cb] py-16">
          <p className="text-[11px] tracking-[0.2em] text-[#8a847c] uppercase mb-6">THREE LAYERS</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <p className="text-[11px] tracking-[0.16em] text-[#8a847c] uppercase mb-3">01 · Consumer</p>
              <h3 className="text-xl font-light mb-3" style={{ fontFamily: "Georgia, serif" }}>
                Scan loop
              </h3>
              <p className="text-sm text-[#5c5854] leading-relaxed">
                Shoppers scan labels and save pieces. That feedback loop adds evidence; it is not the sole
                source of the catalog.
              </p>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.16em] text-[#8a847c] uppercase mb-3">02 · Data</p>
              <h3 className="text-xl font-light mb-3" style={{ fontFamily: "Georgia, serif" }}>
                Composition intelligence
              </h3>
              <p className="text-sm text-[#5c5854] leading-relaxed">
                Normalized fibre records, provenance, and gap reports brands can plug into commerce systems.
              </p>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.16em] text-[#8a847c] uppercase mb-3">03 · Readiness</p>
              <h3 className="text-xl font-light mb-3" style={{ fontFamily: "Georgia, serif" }}>
                DPP-readiness
              </h3>
              <p className="text-sm text-[#5c5854] leading-relaxed">
                Field coverage against an emerging schema. The entry product into the API — not the identity
                of the company.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#ddd5cb] py-16 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <h2 className="text-3xl font-light leading-snug" style={{ fontFamily: "Georgia, serif" }}>
            Start with 10 products. Then a 500-product pilot.
          </h2>
          <div>
            <p className="text-sm text-[#5c5854] leading-relaxed mb-6">
              The first transaction is a Material Data Snapshot on 10 GTINs, then the $5,000 Catalog
              Enrichment Pilot covering 500 products. Early partners get API credentials, coverage priority
              and a written data-processing note before any file is transferred.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/platform/demo"
                className="inline-block text-[11px] tracking-[0.2em] uppercase bg-black text-white px-10 py-4 text-center hover:bg-[#2a2a2a]"
              >
                Open the API demo
              </Link>
              <a
                href={PILOT_MAILTO}
                className="inline-block text-[11px] tracking-[0.2em] uppercase border border-black px-10 py-4 text-center hover:bg-black hover:text-white transition-colors"
              >
                $5,000 Catalog Enrichment Pilot
              </a>
            </div>
          </div>
        </div>
      </div>
    </PlatformChrome>
  );
}
