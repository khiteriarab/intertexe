import type { Metadata } from "next";
import Link from "next/link";
import { PILOT_MAILTO, SNAPSHOT_MAILTO } from "../../../lib/platform-demo";
import { PlatformChrome } from "../PlatformChrome";

export const metadata: Metadata = {
  title: "Material Intelligence API documentation",
  description:
    "Sample request and response, data dictionary, provenance definitions, coverage method, and Catalog Enrichment Pilot terms for INTERTEXE.",
  alternates: { canonical: "https://www.intertexe.com/platform/docs" },
};

export default function PlatformDocsPage() {
  return (
    <PlatformChrome active="docs">
      <div className="max-w-3xl mx-auto px-6 md:px-8 py-16 md:py-24">
        <p className="text-[11px] tracking-[0.25em] text-[#9c7b8b] mb-6">API DOCUMENTATION</p>
        <h1
          className="text-4xl font-light mb-6"
          style={{ fontFamily: "Georgia, 'Iowan Old Style', serif" }}
        >
          Material Intelligence API
        </h1>
        <p className="text-[#5c5854] leading-relaxed mb-4">
          Send a GTIN, EAN or SKU. Receive normalized fibre composition, evidence provenance and a
          DPP-readiness map. The public path is a read-only demonstration. Partner credentials are issued
          after a Material Data Snapshot or Catalog Enrichment Pilot.
        </p>
        <p className="text-sm text-[#8a847c] mb-12">
          DPP-readiness is a schema map, not legal certification. Textile-specific DPP requirements are
          planned for a Q4 2027 delegated act and are not yet final.
        </p>

        <nav className="text-sm space-y-2 mb-16 text-[#5c5854]">
          <p>
            <a href="#sample" className="underline underline-offset-4">
              Sample request and response
            </a>
          </p>
          <p>
            <a href="#dictionary" className="underline underline-offset-4">
              Data dictionary
            </a>
          </p>
          <p>
            <a href="#provenance" className="underline underline-offset-4">
              Provenance and verification
            </a>
          </p>
          <p>
            <a href="#coverage" className="underline underline-offset-4">
              Coverage methodology
            </a>
          </p>
          <p>
            <a href="#pilot" className="underline underline-offset-4">
              Pilot scope and price
            </a>
          </p>
          <p>
            <a href="#ownership" className="underline underline-offset-4">
              Data ownership and confidentiality
            </a>
          </p>
        </nav>

        <section id="sample" className="border-t border-[#ddd5cb] py-12">
          <h2 className="text-2xl font-light mb-4" style={{ fontFamily: "Georgia, serif" }}>
            Sample request and response
          </h2>
          <p className="text-sm text-[#5c5854] leading-relaxed mb-4">
            Demonstration endpoint — no API key, rate-limited, static records only.
          </p>
          <pre className="bg-white border border-[#ddd5cb] p-4 text-xs overflow-x-auto mb-4">{`GET https://www.intertexe.com/api/v1/demo/composition/0123456789012`}</pre>
          <pre className="bg-white border border-[#ddd5cb] p-4 text-xs overflow-x-auto mb-4">{`curl -sS https://www.intertexe.com/api/v1/demo/composition/0123456789012`}</pre>
          <pre className="bg-white border border-[#ddd5cb] p-4 text-xs overflow-x-auto mb-6">{`{
  "product": {
    "gtin": "0123456789012",
    "brand": "Demo Brand",
    "name": "Silk Midi Skirt",
    "match_type": "exact_gtin"
  },
  "composition": [
    { "fiber": "silk", "percentage": 96 },
    { "fiber": "elastane", "percentage": 4 }
  ],
  "material_intelligence": {
    "natural_fiber_percentage": 96,
    "primary_fiber": "silk"
  },
  "provenance": {
    "status": "verified",
    "source_type": "garment_label",
    "captured_at": "2026-08-18",
    "reviewed": true
  },
  "dpp_readiness": {
    "status": "partial",
    "mapped_fields": ["product_identifier", "fiber_composition"],
    "missing_fields": ["country_of_origin", "manufacturer_identifier", "repair_information"]
  },
  "notice": "DPP-readiness output, not legal certification."
}`}</pre>
          <p className="text-sm text-[#5c5854] leading-relaxed">
            Three demonstration identifiers:{" "}
            <code className="text-xs">0123456789012</code> (verified),{" "}
            <code className="text-xs">0198765432104</code> (reported),{" "}
            <code className="text-xs">0500123456789</code> (company prefix, no composition). Try them on{" "}
            <Link href="/platform/demo" className="underline underline-offset-4 text-[#1a1a1a]">
              /platform/demo
            </Link>
            .
          </p>
        </section>

        <section id="dictionary" className="border-t border-[#ddd5cb] py-12">
          <h2 className="text-2xl font-light mb-6" style={{ fontFamily: "Georgia, serif" }}>
            Data dictionary
          </h2>
          <dl className="text-sm space-y-5 text-[#5c5854]">
            <div>
              <dt className="text-[#1a1a1a]">product.gtin</dt>
              <dd>Normalized GTIN/EAN digits as submitted or stored.</dd>
            </div>
            <div>
              <dt className="text-[#1a1a1a]">product.match_type</dt>
              <dd>
                <code className="text-xs">exact_gtin</code>, <code className="text-xs">sku</code>,{" "}
                <code className="text-xs">company_prefix</code>, or <code className="text-xs">none</code>.
              </dd>
            </div>
            <div>
              <dt className="text-[#1a1a1a]">composition[]</dt>
              <dd>Fiber name and integer percentage. Empty when no product-level evidence exists.</dd>
            </div>
            <div>
              <dt className="text-[#1a1a1a]">material_intelligence.natural_fiber_percentage</dt>
              <dd>Sum of cotton, linen, silk, wool, cashmere, hemp, leather and similar natural fibres.</dd>
            </div>
            <div>
              <dt className="text-[#1a1a1a]">provenance.status</dt>
              <dd>
                <code className="text-xs">verified</code>, <code className="text-xs">reported</code>, or{" "}
                <code className="text-xs">not_found</code>. See below.
              </dd>
            </div>
            <div>
              <dt className="text-[#1a1a1a]">dpp_readiness</dt>
              <dd>
                Coverage against an emerging schema. <code className="text-xs">mapped</code> /{" "}
                <code className="text-xs">partial</code> / <code className="text-xs">insufficient</code>. Not
                a claim of legal DPP compliance.
              </dd>
            </div>
          </dl>
        </section>

        <section id="provenance" className="border-t border-[#ddd5cb] py-12">
          <h2 className="text-2xl font-light mb-6" style={{ fontFamily: "Georgia, serif" }}>
            Provenance and verification
          </h2>
          <ul className="text-sm text-[#5c5854] leading-relaxed space-y-4">
            <li>
              <strong className="text-[#1a1a1a] font-medium">Verified</strong> — composition extracted from a
              garment label, with image, extraction and review status retained.{" "}
              <code className="text-xs">reviewed: true</code>.
            </li>
            <li>
              <strong className="text-[#1a1a1a] font-medium">Reported</strong> — composition obtained from a
              brand catalog, retailer page or affiliate feed. Useful commercially; not label-verified.
            </li>
            <li>
              <strong className="text-[#1a1a1a] font-medium">Not found</strong> — no product-level composition.
              A company prefix may still identify the manufacturer. Composition is never filled in from brand
              averages.
            </li>
          </ul>
        </section>

        <section id="coverage" className="border-t border-[#ddd5cb] py-12">
          <h2 className="text-2xl font-light mb-4" style={{ fontFamily: "Georgia, serif" }}>
            Coverage methodology
          </h2>
          <p className="text-sm text-[#5c5854] leading-relaxed mb-4">
            A match is counted when INTERTEXE returns a product-level composition record for a partner
            identifier (GTIN/EAN first, then SKU, then brand + product name). Company-prefix identity
            without composition is not a match.
          </p>
          <p className="text-sm text-[#5c5854] leading-relaxed mb-4">
            Coverage is measured per catalog, not as a global SLA. Public shop figures (product and brand
            counts on intertexe.com) describe vetted consumer listings with an 80% natural-fiber listing
            standard. They are not a count of DPP-complete passports.
          </p>
          <p className="text-sm text-[#5c5854] leading-relaxed">
            A 10-product Material Data Snapshot is the test: exact matches, source conflicts, and missing
            evidence on the buyer&apos;s own identifiers.
          </p>
        </section>

        <section id="pilot" className="border-t border-[#ddd5cb] py-12">
          <h2 className="text-2xl font-light mb-4" style={{ fontFamily: "Georgia, serif" }}>
            Pilot scope and price
          </h2>
          <ol className="text-sm text-[#5c5854] leading-relaxed space-y-3 mb-6">
            <li>
              <strong className="text-[#1a1a1a] font-medium">Material Data Snapshot</strong> — 10 GTINs or
              catalog rows. Written report of matches, conflicts and gaps. No fee for qualified brands
              after the public demo.
            </li>
            <li>
              <strong className="text-[#1a1a1a] font-medium">Catalog Enrichment Pilot</strong> — $5,000.
              Up to 500 products. Structured material records, provenance, DPP-readiness map, and Starter
              API credentials (lookup). Typical delivery inside four weeks of a clean file.
            </li>
          </ol>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={SNAPSHOT_MAILTO}
              className="text-[11px] tracking-[0.16em] uppercase bg-black text-white px-6 py-3 text-center"
            >
              Submit 10 products
            </a>
            <a
              href={PILOT_MAILTO}
              className="text-[11px] tracking-[0.16em] uppercase border border-black px-6 py-3 text-center"
            >
              Start the $5,000 pilot
            </a>
          </div>
        </section>

        <section id="ownership" className="border-t border-[#ddd5cb] py-12">
          <h2 className="text-2xl font-light mb-4" style={{ fontFamily: "Georgia, serif" }}>
            Data ownership and confidentiality
          </h2>
          <ul className="text-sm text-[#5c5854] leading-relaxed space-y-3">
            <li>The brand owns its catalog file and the identifiers it submits.</li>
            <li>
              INTERTEXE owns its composition database, matching methods and demonstration records.
            </li>
            <li>
              Partner files are used only to perform the snapshot or pilot. They are not sold, and they are
              not published on the consumer shop without a separate written agreement.
            </li>
            <li>
              A one-page data-processing note is sent before any file transfer. NDA available on request
              at{" "}
              <a href="mailto:info@intertexe.com" className="underline underline-offset-4 text-[#1a1a1a]">
                info@intertexe.com
              </a>
              .
            </li>
            <li>The demonstration API uses static records and does not read partner catalogs.</li>
          </ul>
        </section>
      </div>
    </PlatformChrome>
  );
}
