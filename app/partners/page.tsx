import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Brand Partnerships — INTERTEXE",
  description:
    "Partner with Intertexe to reach natural fiber fashion shoppers at the moment of purchase intent.",
  robots: { index: false, follow: false },
};

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-8 py-5 flex items-center justify-between">
        <Link href="/" className="text-sm tracking-widest font-light" style={{ letterSpacing: "0.3em" }}>
          INTER<span className="font-semibold">TEXE</span>
        </Link>
        <a
          href="mailto:partners@intertexe.com"
          className="text-xs tracking-widest uppercase bg-black text-white px-6 py-3"
          style={{ letterSpacing: "0.15em" }}
        >
          Get in touch
        </a>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-28">
        <p className="text-xs tracking-widest text-gray-400 mb-8" style={{ letterSpacing: "0.25em" }}>
          BRAND PARTNERSHIPS
        </p>

        <h1
          className="text-5xl font-light text-gray-900 mb-8 leading-tight"
          style={{ fontFamily: "Georgia, serif", lineHeight: 1.15 }}
        >
          Reach natural fiber shoppers at the moment of purchase intent.
        </h1>

        <p className="text-lg text-gray-500 font-light leading-relaxed mb-12 max-w-2xl">
          Intertexe is where discerning shoppers go to find fashion that is actually made from natural fibers. Our
          audience is actively looking for brands like yours.
        </p>

        <div className="border-t border-gray-100 py-16">
          <p className="text-xs tracking-widest text-gray-400 uppercase mb-12" style={{ letterSpacing: "0.2em" }}>
            THE AUDIENCE
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <p className="text-3xl font-light text-gray-900 mb-3">28—45</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Women who shop Net-a-Porter, Mytheresa, and Shopbop. Quality over quantity. Buying fewer pieces but
                better ones.
              </p>
            </div>
            <div>
              <p className="text-3xl font-light text-gray-900 mb-3">$300+</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Average spend per item. This audience invests in pieces they will wear for years not seasons.
              </p>
            </div>
            <div>
              <p className="text-3xl font-light text-gray-900 mb-3">Intent</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Every user on Intertexe is actively looking for natural fiber fashion. This is not passive browsing.
                This is purchase intent.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 py-16">
          <p className="text-xs tracking-widest text-gray-400 uppercase mb-12" style={{ letterSpacing: "0.2em" }}>
            PLACEMENT OPTIONS
          </p>

          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-xl font-light text-gray-900 mb-2" style={{ fontFamily: "Georgia, serif" }}>
                  Scanner alternatives
                </h2>
                <p className="text-xs text-gray-400 mb-4">Highest intent placement</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  When a user scans a synthetic garment your natural fiber alternative appears as a recommendation.
                  This is the highest intent moment in fashion — a shopper actively looking for something better than
                  what they are holding.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-xl font-light text-gray-900 mb-2" style={{ fontFamily: "Georgia, serif" }}>
                  Collection placement
                </h2>
                <p className="text-xs text-gray-400 mb-4">Editorial context</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your products featured in our curated collections — Vacation, Evening, Tailoring, Summer in the
                  City, The White Edit. Editorial placement alongside verified natural fiber pieces from the
                  world&apos;s best brands.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-xl font-light text-gray-900 mb-2" style={{ fontFamily: "Georgia, serif" }}>
                  Brands we love
                </h2>
                <p className="text-xs text-gray-400 mb-4">Homepage visibility</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Featured in the Brands We Love section on the Intertexe homepage. Six brand positions. Shown to every
                  visitor. Includes brand card with editorial image and EXCEPTIONAL rating.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 py-16">
          <p className="text-xs tracking-widest text-gray-400 uppercase mb-12" style={{ letterSpacing: "0.2em" }}>
            INVESTMENT
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4 max-w-xl">
            Brand placement starts at $500 per month. All placements include full click and conversion tracking so
            you can see exactly what your investment is driving.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
            We work with a small number of brands at a time to ensure placement quality and editorial integrity.
            Availability is limited.
          </p>
        </div>

        <div className="border-t border-gray-100 py-16">
          <h2 className="text-3xl font-light text-gray-900 mb-6" style={{ fontFamily: "Georgia, serif" }}>
            Interested in working together?
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-8 max-w-xl">
            Send us a note and we will follow up within 48 hours with placement availability and a proposal tailored
            to your brand.
          </p>
          <a
            href="mailto:partners@intertexe.com"
            className="inline-block text-xs tracking-widest uppercase bg-black text-white px-10 py-4 hover:bg-gray-800 transition-colors"
            style={{ letterSpacing: "0.2em" }}
          >
            partners@intertexe.com
          </a>
        </div>
      </div>

      <div className="border-t border-gray-100 px-8 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-400">© 2026 Intertexe.</p>
          <Link href="/" className="text-xs text-gray-400 hover:text-black transition-colors">
            Back to Intertexe
          </Link>
        </div>
      </div>
    </div>
  );
}
