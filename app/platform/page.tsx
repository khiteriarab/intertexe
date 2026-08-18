import type { Metadata } from "next";
import Link from "next/link";
import { PlatformChrome } from "./PlatformChrome";
import { PlatformViewTracker } from "./PlatformViewTracker";

export const metadata: Metadata = {
  title: "INTERTEXE Material Intelligence API",
  description:
    "Turn GTINs and product catalogs into normalized fibre composition, evidence-backed material records and structured outputs for commerce and emerging EU Digital Product Passport requirements.",
};

const EU_TEXTILE = "https://single-market-economy.ec.europa.eu/single-market/digital-product-passport/textile-apparel_en";
const EU_REGISTRY = "https://single-market-economy.ec.europa.eu/news/digital-product-passport-registry-now-live-2026-07-20_en";

export default function PlatformPage() {
  return (
    <PlatformChrome active="platform">
      <PlatformViewTracker event="platform_view" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-20 md:py-28">
        <p className="text-[10px] sm:text-[11px] tracking-[0.16em] sm:tracking-[0.25em] text-[#9c7b8b] mb-6 sm:mb-8">
          INTERTEXE PLATFORM
        </p>
        <h1
          className="text-[2rem] sm:text-4xl md:text-5xl font-light mb-6 sm:mb-8 leading-[1.15]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Material intelligence for fashion product data.
        </h1>
        <p className="text-base sm:text-lg text-[#5c5854] font-light leading-relaxed mb-5 sm:mb-6 max-w-2xl">
          Turn GTINs and product catalogs into normalized fibre composition, evidence-backed material records
          and structured outputs for commerce and emerging EU Digital Product Passport requirements.
        </p>
        <p className="text-sm text-[#8a847c] mb-8 sm:mb-12 max-w-2xl">
          Built to connect with existing PIM, PLM, ecommerce and DPP infrastructure. INTERTEXE does not
          provide legal certification.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Link
            href="/platform/demo"
            className="text-[11px] tracking-[0.14em] sm:tracking-[0.2em] uppercase bg-black text-white px-6 sm:px-10 py-4 text-center"
          >
            Try the API demo
          </Link>
          <Link
            href="/platform/request?intent=snapshot&cta=hero"
            className="text-[11px] tracking-[0.14em] sm:tracking-[0.2em] uppercase border border-black px-6 sm:px-10 py-4 text-center"
          >
            Request a 10-product snapshot
          </Link>
        </div>
      </div>

      <section className="border-y border-[#ddd5cb] py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
          <h2 className="text-2xl sm:text-3xl font-light mb-6" style={{ fontFamily: "Georgia, serif" }}>
            Your material data already exists. It just is not ready to move.
          </h2>
          <p className="text-sm text-[#5c5854] leading-relaxed max-w-2xl">
            Composition sits in supplier files, labels, brand systems, ecommerce pages and retailer feeds —
            with inconsistent names and uneven evidence. INTERTEXE reconciles that layer so it can feed the
            systems you already use.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 space-y-10 sm:space-y-12">
        <h2 className="text-2xl font-light" style={{ fontFamily: "Georgia, serif" }}>How it works</h2>
        <ol className="space-y-8 text-sm text-[#5c5854] leading-relaxed">
          <li>
            <strong className="text-[#1a1a1a]">1. Send identifiers or a catalog.</strong> Start with GTIN, UPC,
            EAN, canonical product URLs or a managed catalog file after qualification.
          </li>
          <li>
            <strong className="text-[#1a1a1a]">2. Reconcile the material record.</strong> Normalize fibre names
            and percentages, preserve the source, flag conflicts and identify missing evidence.
          </li>
          <li>
            <strong className="text-[#1a1a1a]">3. Use structured output.</strong> Receive JSON or CSV for catalog
            enrichment, product experiences and connection to the DPP system the brand chooses.
          </li>
        </ol>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 text-sm text-[#5c5854] leading-relaxed">
        <h2 className="text-2xl font-light text-[#1a1a1a] mb-4" style={{ fontFamily: "Georgia, serif" }}>
          What a record contains
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Product identifier and match type</li>
          <li>Normalized fibre composition</li>
          <li>Primary fibre and natural-fibre percentage</li>
          <li>Evidence status and source type</li>
          <li>Normalization warnings or conflicts</li>
          <li>Available and missing DPP-relevant fields</li>
          <li>Last-updated timestamp</li>
        </ul>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16">
        <h2 className="text-2xl font-light mb-4" style={{ fontFamily: "Georgia, serif" }}>
          A material claim is only as useful as its source.
        </h2>
        <dl className="text-sm text-[#5c5854] space-y-4 leading-relaxed">
          <div>
            <dt className="text-[#1a1a1a]">verified_label</dt>
            <dd>Physical content or care label that passed the defined review protocol.</dd>
          </div>
          <div>
            <dt className="text-[#1a1a1a]">reported_brand / reported_retailer</dt>
            <dd>Attributed claims from a brand source or a retailer/affiliate feed.</dd>
          </div>
          <div>
            <dt className="text-[#1a1a1a]">inferred</dt>
            <dd>Never presented as verified fact.</dd>
          </div>
          <div>
            <dt className="text-[#1a1a1a]">unknown_legacy</dt>
            <dd>A historical record exists but reliable source lineage is unavailable.</dd>
          </div>
          <div>
            <dt className="text-[#1a1a1a]">missing</dt>
            <dd>No product-level composition. A GS1 prefix never fills fibre percentages.</dd>
          </div>
        </dl>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        <h2 className="text-2xl font-light mb-4 leading-snug" style={{ fontFamily: "Georgia, serif" }}>
          Prepare the material-data layer now. Connect it to the infrastructure you choose later.
        </h2>
        <p className="text-sm text-[#5c5854] leading-relaxed mb-4 max-w-2xl">
          Textile apparel is a priority product group under the EU Ecodesign for Sustainable Products
          Regulation. The textile-specific delegated act is currently planned for Q4 2027, and the exact data
          requirements remain subject to the final delegated act and technical specifications.
        </p>
        <p className="text-sm text-[#5c5854] leading-relaxed mb-4 max-w-2xl">
          INTERTEXE helps brands structure and assess material data against the emerging framework. It does
          not provide legal certification or a guarantee of future compliance.
        </p>
        <p className="text-sm flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-0">
          <a href={EU_TEXTILE} className="underline underline-offset-4 break-words" target="_blank" rel="noreferrer">
            EU textile and apparel DPP
          </a>
          <span className="hidden sm:inline">{" · "}</span>
          <a href={EU_REGISTRY} className="underline underline-offset-4 break-words" target="_blank" rel="noreferrer">
            DPP Registry announcement
          </a>
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16">
        <div className="border border-[#ddd5cb] bg-white p-5 sm:p-8 md:p-12">
          <p className="text-[10px] sm:text-[11px] tracking-[0.14em] sm:tracking-[0.2em] uppercase text-[#9c7b8b] mb-3">
            Founding Material Data Pilot
          </p>
          <p className="text-4xl font-light mb-6" style={{ fontFamily: "Georgia, serif" }}>
            $5,000
          </p>
          <ul className="text-sm text-[#5c5854] space-y-2 mb-8 leading-relaxed">
            <li>Up to 500 submitted products</li>
            <li>Ten business days from receipt of a validated input file and required access</li>
            <li>Identifier matching and composition normalization</li>
            <li>Evidence status for each returned composition record</li>
            <li>Conflict, warning and missing-data report</li>
            <li>CSV and JSON delivery</li>
            <li>Five sample consumer-facing material records</li>
            <li>Sample authenticated API access for the pilot dataset</li>
            <li>DPP-readiness summary based on the emerging textile framework</li>
            <li>One findings and integration call</li>
          </ul>
          <Link
            href="/platform/request?intent=founding_pilot&cta=pilot_card"
            className="inline-block w-full sm:w-auto text-center text-[11px] tracking-[0.14em] sm:tracking-[0.2em] uppercase bg-black text-white px-6 sm:px-10 py-4"
          >
            Request the founding pilot
          </Link>
          <p className="text-xs text-[#8a847c] mt-6 max-w-xl leading-relaxed">
            Ongoing API access and systems integration are scoped after the pilot based on catalog volume,
            data complexity, refresh frequency and support requirements.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 space-y-6 text-sm text-[#5c5854] leading-relaxed">
        <h2 className="text-2xl font-light text-[#1a1a1a]" style={{ fontFamily: "Georgia, serif" }}>FAQ</h2>
        <div>
          <h3 className="text-[#1a1a1a] mb-2">Is INTERTEXE a DPP Registry or certification body?</h3>
          <p>No. The EU Registry registers passport identifiers. INTERTEXE is a material-data layer.</p>
        </div>
        <div>
          <h3 className="text-[#1a1a1a] mb-2">What does “verified” mean?</h3>
          <p>
            verified_label means a physical label passed INTERTEXE’s review protocol. It is not regulatory
            certification. Historical records without lineage are unknown_legacy.
          </p>
        </div>
        <div>
          <h3 className="text-[#1a1a1a] mb-2">What happens when you cannot find a product?</h3>
          <p>The API returns match_status not_found and an empty composition array. Nothing is guessed.</p>
        </div>
        <div>
          <h3 className="text-[#1a1a1a] mb-2">Can INTERTEXE work with our current PIM, PLM or DPP provider?</h3>
          <p>Yes. Output is JSON or CSV for the systems you already run.</p>
        </div>
        <div>
          <h3 className="text-[#1a1a1a] mb-2">What information do we need to submit?</h3>
          <p>Start with 10 GTINs. Do not upload confidential catalogs on the public form.</p>
        </div>
        <div>
          <h3 className="text-[#1a1a1a] mb-2">Who owns the catalog data and derived records?</h3>
          <p>
            You retain ownership of the catalog you submit. INTERTEXE does not publicly expose confidential
            client data without written permission. Derived matching methods remain INTERTEXE’s.
          </p>
        </div>
        <div>
          <h3 className="text-[#1a1a1a] mb-2">How is confidential data handled?</h3>
          <p>Secure transfer is arranged after qualification. See Privacy and Terms.</p>
        </div>
        <div>
          <h3 className="text-[#1a1a1a] mb-2">What is included in the $5,000 pilot?</h3>
          <p>The card above is the public scope. Ongoing licensing is custom after the pilot.</p>
        </div>
        <div>
          <h3 className="text-[#1a1a1a] mb-2">What happens after the pilot?</h3>
          <p>
            Ongoing API access and systems integration are scoped after the pilot based on catalog volume,
            data complexity, refresh frequency and support requirements. There is no published monthly grid
            yet.
          </p>
        </div>
        <div>
          <h3 className="text-[#1a1a1a] mb-2">When will textile DPP requirements apply?</h3>
          <p>
            The Registry is live. The textile delegated act is planned for Q4 2027. Application follows that
            act and a transition period.
          </p>
        </div>
      </section>
    </PlatformChrome>
  );
}
