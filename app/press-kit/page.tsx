import type { Metadata } from "next";
import { HOMEPAGE_HERO_IMAGE } from "@/lib/editorial-assets";
import { PressKitToolbar } from "./PressKitToolbar";
import "./press-kit.css";

export const metadata: Metadata = {
  title: "Press Kit",
  description:
    "INTERTEXE press kit — verified natural fiber fashion, the iOS scanner, and platform statistics.",
  alternates: { canonical: "https://www.intertexe.com/press-kit" },
  robots: { index: true, follow: true },
};

function PressKitWordmark({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] ${className}`} style={{ letterSpacing: "6px" }}>
      <span className="font-light">INTER</span>
      <span className="font-bold">TEXE</span>
    </p>
  );
}

export default function PressKitPage() {
  return (
    <article className="press-kit">
      <PressKitToolbar />

      {/* PAGE 1 — COVER */}
      <section
        className="page-break press-cover relative flex flex-col items-center justify-center text-center text-white"
        style={{
          backgroundImage: `url(${HOMEPAGE_HERO_IMAGE})`,
          minHeight: "100vh",
        }}
      >
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <div className="relative z-10 px-6">
          <PressKitWordmark className="mb-4" />
          <h1
            className="press-serif text-[48px] font-light leading-[1.2] mb-5"
          >
            Know what you
            <br />
            are wearing.
          </h1>
          <p
            className="text-[13px] font-light"
            style={{ letterSpacing: "2px", color: "rgba(255,255,255,0.7)" }}
          >
            PRESS KIT · 2026
          </p>
        </div>
      </section>

      {/* PAGE 2 — THE PITCH */}
      <section className="page-break press-section bg-white">
        <div className="press-inner">
          <p className="press-eyebrow">ABOUT INTERTEXE</p>
          <h2 className="press-serif text-[32px] font-light leading-[1.25] text-[#1C2B2A] mb-6">
            The only fashion platform that verifies the fiber composition of every product it carries.
          </h2>
          <p className="press-body mb-4">
            Intertexe is a natural fiber fashion discovery platform and iOS scanner. We verify that silk is
            silk, cashmere is cashmere, and linen is linen — before anything is listed on the platform.
            Every product on Intertexe contains at least 80% natural fiber. Verified before it is listed.
            Not after a complaint.
          </p>
          <p className="press-body mb-4">
            The iOS app includes a scanner that reads any clothing label in real time. Point your camera at
            any care label or price tag in any store in the world. Intertexe reads the fiber composition
            instantly, gives it a natural fiber score from 0 to 100, and shows curated natural fiber
            alternatives at a similar price if the piece falls short.
          </p>
          <p className="press-body">
            Most fashion platforms show you what brands want you to see. Intertexe shows you what the label
            actually says.
          </p>
        </div>
      </section>

      {/* PAGE 3 — THE NUMBERS */}
      <section className="page-break press-section bg-white">
        <div className="press-stat-grid">
          <div>
            <p className="press-stat-number">84,704+</p>
            <p className="press-stat-label">Verified natural fiber pieces</p>
          </div>
          <div>
            <p className="press-stat-number">253+</p>
            <p className="press-stat-label">Brands vetted and listed</p>
          </div>
          <div>
            <p className="press-stat-number">63,832</p>
            <p className="press-stat-label">Barcodes in composition database</p>
          </div>
          <div>
            <p className="press-stat-number">100%</p>
            <p className="press-stat-label">Compositions verified before listing</p>
          </div>
        </div>
      </section>

      {/* PAGE 4 — PROBLEM & SOLUTION */}
      <section className="page-break press-section bg-white">
        <div className="press-two-col px-0">
          <div>
            <p className="press-eyebrow">THE PROBLEM</p>
            <p className="press-body">
              60% of all clothing sold globally is made from plastic-based synthetic fibers. Polyester,
              nylon, acrylic. Most fashion platforms show you what brands want you to see — not what the
              label actually says. There is no easy way to know what your clothes are actually made of
              before you buy them. Labels exist but finding them, reading them, and understanding what they
              mean takes effort most shoppers do not make.
            </p>
          </div>
          <div>
            <p className="press-eyebrow">THE SOLUTION</p>
            <p className="press-body">
              Intertexe verifies the fiber composition of every product before it is listed. The iOS
              scanner reads any label in real time and returns an instant natural fiber score. The platform
              cross-references composition data from brand feeds, label scans, and a proprietary barcode
              database that grows with every user scan. After enough scans Intertexe will hold the most
              comprehensive fashion fiber composition database in the world — one that does not exist
              anywhere else and cannot be replicated quickly.
            </p>
          </div>
        </div>
      </section>

      {/* PAGE 5 — THE SCANNER */}
      <section className="page-break press-section bg-white">
        <div className="press-scanner-grid">
          <div className="press-phone">
            <p className="text-[10px] tracking-[0.2em] text-[#999]">SCANNER</p>
            <p className="press-serif text-3xl font-light text-[#1C2B2A]">78%</p>
            <p className="text-xs text-[#666]">natural fiber</p>
            <p className="text-xs text-[#888]">Silk · Wool · Elastane</p>
            <p className="text-[10px] tracking-[0.15em] text-[#0D9488] mt-2">GOOD QUALITY</p>
            <p className="text-xs text-[#1C2B2A] underline underline-offset-4 mt-4">
              See 6 alternatives →
            </p>
          </div>
          <div>
            <p className="press-eyebrow">THE SCANNER</p>
            <p className="press-body mb-4">
              Point your camera at any care label or price tag. Anywhere. Any brand. Any store in the world.
            </p>
            <p className="press-body mb-3">Intertexe reads the fiber composition instantly and returns:</p>
            <ul className="press-body space-y-2 list-none pl-0">
              <li>· The exact fiber breakdown</li>
              <li>· A natural fiber percentage score</li>
              <li>· A verdict — Exceptional, Good Quality, A Blend, or Mostly Synthetic</li>
              <li>· Six curated natural fiber alternatives at a similar price</li>
            </ul>
            <p className="press-body mt-6">
              Every scan teaches the platform something. Every barcode linked to a composition makes the
              next scan faster. Over 63,000 barcodes are already in the database before the first public
              user ever opens the app.
            </p>
          </div>
        </div>
      </section>

      {/* PAGE 6 — COLLECTIONS */}
      <section className="page-break press-section bg-white">
        <div className="press-tile-grid">
          <div className="press-tile" style={{ backgroundColor: "#F5F0E8" }}>
            <h3 className="text-[#1C2B2A]">Vacation</h3>
            <p>
              Resort dressing for warm water and warm light. Linen that moves. Silk at sunset.
            </p>
          </div>
          <div className="press-tile text-white" style={{ backgroundColor: "#1C2B2A" }}>
            <h3>Evening</h3>
            <p style={{ color: "rgba(255,255,255,0.75)" }}>
              For the occasion that deserves the real thing. Silk. Wool crêpe. Verified.
            </p>
          </div>
          <div className="press-tile" style={{ backgroundColor: "#E8E4DC" }}>
            <h3 className="text-[#1C2B2A]">Tailoring</h3>
            <p>
              Investment dressing. The pieces that outlast every trend. Wool. Cashmere. Cotton.
            </p>
          </div>
          <div className="press-tile" style={{ backgroundColor: "#FAFAFA" }}>
            <h3 className="text-[#1C2B2A]">The White Edit</h3>
            <p>White in every form. Ivory. Chalk. Cream. All natural.</p>
          </div>
        </div>
      </section>

      {/* PAGE 7 — TECHNOLOGY */}
      <section className="page-break press-section bg-white">
        <div className="press-inner-wide space-y-10">
          <div>
            <p className="press-eyebrow">THE SCANNER DATABASE</p>
            <p className="press-body">
              The scanner uses computer vision to read clothing labels in real time. Results come from a
              proprietary barcode composition database built from real label scans by real users in real
              stores. Over 63,000 barcodes are already indexed. The database is self-compounding — every scan
              makes the next scan faster and more accurate. This data does not exist anywhere else.
            </p>
          </div>
          <div>
            <p className="press-eyebrow">THE VERIFICATION STANDARD</p>
            <p className="press-body">
              Every product on Intertexe must contain at least 80% natural fiber to be listed. Composition is
              cross-referenced against brand affiliate feed data and label scan data. Products that do not
              meet the standard are not listed regardless of brand name or price point.
            </p>
          </div>
          <div>
            <p className="press-eyebrow">THE DIGITAL PRODUCT PASSPORT</p>
            <p className="press-body">
              The EU Digital Product Passport for textiles arrives in 2026 requiring verified composition
              data for every garment sold in Europe. Intertexe is building the composition data
              infrastructure brands and retailers will need to comply. Our API gives enterprise partners
              access to verified fiber composition data, DPP-ready product records, and catalog enrichment
              services.
            </p>
          </div>
        </div>
      </section>

      {/* PAGE 8 — STORY ANGLES */}
      <section className="page-break press-section bg-white">
        <div className="press-inner-wide">
          <p className="press-eyebrow">STORY ANGLES FOR PRESS</p>
          <ul className="press-angle-list">
            <li>
              The only platform that verifies what fashion is actually made of — and why that matters now.
            </li>
            <li>
              The scanner that tells you if your expensive dress is mostly plastic — and what it should have
              been.
            </li>
            <li>
              How one app is building the world&apos;s most comprehensive fashion fiber composition database
              — one scan at a time.
            </li>
            <li>
              The EU Digital Product Passport arrives in 2026. This startup is already building the
              infrastructure brands will need to comply.
            </li>
            <li>
              Why natural fiber fashion is having a moment — and the platform that saw it coming.
            </li>
            <li>
              Microplastics, greenwashing, and the rise of the informed fashion consumer. Meet the app that
              gives shoppers the truth.
            </li>
          </ul>
        </div>
      </section>

      {/* PAGE 9 — PRESS CONTACT */}
      <section className="page-break press-section bg-white text-center">
        <div className="press-inner">
          <p className="press-eyebrow">PRESS CONTACT</p>
          <p className="press-body mb-6">
            For interviews, features, and media assets:
            <br />
            <a
              href="mailto:press@intertexe.com"
              className="text-[#1C2B2A] underline underline-offset-4"
            >
              press@intertexe.com
            </a>
          </p>
          <div className="press-body space-y-1">
            <p>Website: intertexe.com</p>
            <p>iOS App: Available on the App Store</p>
            <p>Instagram: @intertexe</p>
            <p>TikTok: @intertexe</p>
          </div>
          <p className="press-body mt-8 text-sm">
            High resolution logo, hero images, app screenshots, and product photography available on
            request.
          </p>
        </div>
      </section>

      {/* PAGE 10 — BACK COVER */}
      <section
        className="press-section flex flex-col items-center justify-center text-center text-white min-h-[70vh]"
        style={{ backgroundColor: "#1C2B2A" }}
      >
        <PressKitWordmark className="mb-6" />
        <p className="text-sm mb-4" style={{ letterSpacing: "0.1em" }}>
          intertexe.com
        </p>
        <p className="press-serif text-xl font-light mb-8">Know what you are wearing.</p>
        <p className="text-xs text-white/50">© 2026 Intertexe. All rights reserved.</p>
      </section>
    </article>
  );
}
