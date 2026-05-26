import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "INTERTEXE Platform — Digital Product Passport Infrastructure",
  description:
    "Verified fiber composition data and API for EU Digital Product Passport compliance. Built for fashion brands and retailers.",
};

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-8 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm tracking-widest font-light"
          style={{ letterSpacing: "0.3em" }}
        >
          INTER<span className="font-semibold">TEXE</span>
        </Link>
        <div className="flex items-center gap-8">
          <Link
            href="/platform/docs"
            className="text-xs text-gray-500 tracking-widest uppercase hover:text-black transition-colors"
            style={{ letterSpacing: "0.15em" }}
          >
            Documentation
          </Link>
          <Link
            href="/platform/login"
            className="text-xs text-gray-500 tracking-widest uppercase hover:text-black transition-colors"
            style={{ letterSpacing: "0.15em" }}
          >
            Log in
          </Link>
          <a
            href="mailto:platform@intertexe.com"
            className="text-xs tracking-widest uppercase bg-black text-white px-6 py-3 hover:bg-gray-800 transition-colors"
            style={{ letterSpacing: "0.15em" }}
          >
            Request access
          </a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-28">
        <p className="text-xs tracking-widest text-gray-400 mb-8" style={{ letterSpacing: "0.25em" }}>
          INTERTEXE PLATFORM
        </p>

        <h1
          className="text-5xl font-light text-gray-900 mb-8 leading-tight"
          style={{ fontFamily: "Georgia, serif", lineHeight: 1.15 }}
        >
          Fiber composition data infrastructure for the EU Digital Product Passport.
        </h1>

        <p className="text-lg text-gray-500 font-light leading-relaxed mb-6 max-w-2xl">
          The EU Digital Product Passport requires verified composition data for every textile product sold in
          Europe. Intertexe has built that database — scan by scan, label by label.
        </p>

        <p className="text-lg text-gray-500 font-light leading-relaxed mb-12 max-w-2xl">
          Access our verified fiber composition database via API. Generate DPP-ready product records. Verify what
          your garments are actually made of.
        </p>

        <div className="flex items-center gap-6">
          <a
            href="mailto:platform@intertexe.com"
            className="text-xs tracking-widest uppercase bg-black text-white px-10 py-4 hover:bg-gray-800 transition-colors"
            style={{ letterSpacing: "0.2em" }}
          >
            Request API access
          </a>
          <a
            href="mailto:platform@intertexe.com"
            className="text-xs tracking-widest uppercase text-gray-900 underline underline-offset-4"
            style={{ letterSpacing: "0.15em" }}
          >
            Talk to the team →
          </a>
        </div>
      </div>

      <div className="border-t border-b border-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-8">
          <div
            className="flex flex-wrap gap-x-12 gap-y-4 text-xs tracking-widest text-gray-400 uppercase"
            style={{ letterSpacing: "0.2em" }}
          >
            <span>330,000+ products with UPC data</span>
            <span>·</span>
            <span>28,509 brand prefixes indexed</span>
            <span>·</span>
            <span>253+ brands verified</span>
            <span>·</span>
            <span>Growing with every scan</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-24">
        <div className="border-t border-gray-100 py-16 grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <p className="text-xs tracking-widest text-gray-400 uppercase mb-4" style={{ letterSpacing: "0.2em" }}>
              01
            </p>
            <h2 className="text-2xl font-light text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
              Composition lookup by barcode
            </h2>
          </div>
          <div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Send us any UPC or EAN barcode and receive the verified fiber composition for that product — natural
              fiber percentage, fiber breakdown, primary fiber type, and DPP-ready metadata.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Our database is built from real label scans. Every time a user scans a garment label with the
              Intertexe app the composition is verified and stored. The database grows continuously and cannot be
              replicated from any other source.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              For products not yet in the database we fall back to our 28,509 brand prefix table to identify the
              manufacturer and return brand-level composition data.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 py-16 grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <p className="text-xs tracking-widest text-gray-400 uppercase mb-4" style={{ letterSpacing: "0.2em" }}>
              02
            </p>
            <h2 className="text-2xl font-light text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
              DPP record generation
            </h2>
          </div>
          <div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              The EU Digital Product Passport for textiles requires a structured digital record for every garment
              sold in Europe — fiber composition, care instructions, country of origin, and material traceability.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Intertexe generates DPP-ready records from our verified composition database. Upload your product
              catalog and receive structured DPP data for every item we have composition data for.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Compliance deadlines begin in 2026. Brands that start building their composition data infrastructure
              now will be ready. Brands that wait will not.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 py-16 grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <p className="text-xs tracking-widest text-gray-400 uppercase mb-4" style={{ letterSpacing: "0.2em" }}>
              03
            </p>
            <h2 className="text-2xl font-light text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
              Catalog enrichment
            </h2>
          </div>
          <div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Many fashion brands and retailers have product catalogs with incomplete or unverified composition
              data. Our API enriches your existing catalog — send us your product list and receive verified
              composition data, natural fiber percentages, and fiber classification for every item we can match.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Match rate depends on catalog overlap with our database. For major fashion brands our current match
              rate exceeds 60% and grows monthly as the database expands.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Verified composition data improves search discoverability, builds consumer trust, and prepares your
              catalog for DPP compliance requirements.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 py-16">
          <p className="text-xs tracking-widest text-gray-400 uppercase mb-12" style={{ letterSpacing: "0.2em" }}>
            THE REGULATORY CONTEXT
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <p className="text-3xl font-light text-gray-900 mb-3">2026</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                EU Digital Product Passport requirements begin for textiles. Every garment sold in Europe needs a
                verified digital record of its composition.
              </p>
            </div>
            <div>
              <p className="text-3xl font-light text-gray-900 mb-3">60%</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                of fibres used in clothing come from plastic-based materials. Microplastic regulation is
                accelerating globally alongside DPP requirements.
              </p>
            </div>
            <div>
              <p className="text-3xl font-light text-gray-900 mb-3">∞</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Our database grows with every user scan. The composition data we have today is a fraction of what we
                will have in 12 months. Early API partners benefit from the full growth of the database.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 py-16">
          <p className="text-xs tracking-widest text-gray-400 uppercase mb-12" style={{ letterSpacing: "0.2em" }}>
            HOW THE DATABASE IS BUILT
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4 max-w-2xl">
            Every time a user scans a clothing label with the Intertexe app the system reads the fiber composition
            from the physical label using computer vision. That composition is linked to the product barcode and
            stored permanently in our database.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4 max-w-2xl">
            The next user who scans the same barcode gets the result instantly — no AI call, no external API, just
            our database responding in milliseconds. The database is self-compounding. Every scan makes the next scan
            faster and more accurate.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
            This data does not exist anywhere else. It cannot be purchased from GS1. It cannot be downloaded from
            any government registry. It is built exclusively from real label scans by real users in real stores
            around the world. After one million scans it becomes the most comprehensive fashion fiber composition
            database ever created.
          </p>
        </div>

        <div className="border-t border-gray-100 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2
                className="text-3xl font-light text-gray-900"
                style={{ fontFamily: "Georgia, serif", lineHeight: 1.3 }}
              >
                The composition data your compliance team needs. Built from the ground up.
              </h2>
            </div>
            <div>
              <p className="text-sm text-gray-600 leading-relaxed mb-8">
                We are onboarding a small number of early API partners now. Early partners get priority database
                coverage, dedicated support, and input into the product roadmap.
              </p>
              <a
                href="mailto:platform@intertexe.com"
                className="inline-block text-xs tracking-widest uppercase bg-black text-white px-10 py-4 hover:bg-gray-800 transition-colors mb-4 w-full text-center"
                style={{ letterSpacing: "0.2em" }}
              >
                Request API access
              </a>
              <p className="text-xs text-gray-400 text-center">platform@intertexe.com</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-8 py-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-gray-400">© 2026 Intertexe. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/" className="text-xs text-gray-400 hover:text-black transition-colors">
              Consumer platform
            </Link>
            <Link href="/about" className="text-xs text-gray-400 hover:text-black transition-colors">
              About
            </Link>
            <Link href="/press" className="text-xs text-gray-400 hover:text-black transition-colors">
              Press
            </Link>
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-black transition-colors">
              Privacy
            </Link>
            <a href="mailto:platform@intertexe.com" className="text-xs text-gray-400 hover:text-black transition-colors">
              platform@intertexe.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
