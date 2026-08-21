import type { Metadata } from "next";
import Link from "next/link";
import { AFFILIATE_PAGE_DISCLOSURE } from "../../lib/seo-policy";

export const metadata: Metadata = {
  title: "Material Methodology",
  description:
    "How INTERTEXE verifies clothing composition, what qualifies a product for the catalog, and how we talk about natural and synthetic fibers.",
  alternates: { canonical: "https://www.intertexe.com/methodology" },
};

export default function MethodologyPage() {
  return (
    <div className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-10 md:gap-12 px-4">
      <header className="flex flex-col gap-4">
        <nav className="text-xs text-muted-foreground flex gap-2">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="text-foreground">Methodology</span>
        </nav>
        <h1 className="text-3xl md:text-5xl font-serif">How INTERTEXE reads a label</h1>
        <p className="text-sm text-muted-foreground">Last reviewed: August 2026</p>
      </header>

      <div className="flex flex-col gap-8 text-[15px] md:text-base text-foreground/80 leading-relaxed font-light">
        <p>
          INTERTEXE is a fashion discovery and material-intelligence platform. We verify fiber composition
          so shoppers can compare cloth quality with price before they click through to a retailer. We are
          not the seller.
        </p>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">What we verify</h2>
          <p>
            Catalog products are listed only when composition data is present and natural-fiber content
            meets the published standard (currently 80% or higher for shoppable apparel). Percentages come
            from product data and labels. We do not invent GTINs, ratings, stock, or fiber content.
          </p>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">Natural and synthetic fibers</h2>
          <p>
            Natural fibers such as silk, linen, cotton, wool, and cashmere are the core of the catalog.
            That is not a claim that every synthetic is universally bad. Elastane can make a wool trouser
            wearable. Recycled nylon can be the right choice for a specific use. INTERTEXE helps you see
            the composition in context — use, durability, construction, price, and preference.
          </p>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">Editorial standards</h2>
          <p>
            Material hubs and guides are written by INTERTEXE and reviewed when the underlying inventory
            or method changes. Page dates reflect real review activity, not automatic regeneration.
          </p>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">Affiliate disclosure</h2>
          <p>{AFFILIATE_PAGE_DISCLOSURE}</p>
        </section>
        <p className="text-sm">
          Related: <Link href="/about" className="border-b border-foreground">About</Link>
          {" · "}
          <Link href="/guides" className="border-b border-foreground">Guides</Link>
          {" · "}
          <Link href="/terms" className="border-b border-foreground">Terms</Link>
        </p>
      </div>
    </div>
  );
}
