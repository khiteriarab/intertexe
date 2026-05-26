import type { Metadata } from "next";
import Link from "next/link";
import { getCachedPlatformStats } from "../../lib/cached-catalog";
import {
  formatBrandCountLabel,
  formatProductCountLabel,
} from "../../lib/catalog-stats-labels";

export const metadata: Metadata = {
  title: "About INTERTEXE — The Natural Fabric Fashion Search Engine",
  description:
    "INTERTEXE verifies the fiber composition of every product on the platform. Learn how we make material transparency the standard in luxury fashion.",
  alternates: { canonical: "https://www.intertexe.com/about" },
};

export const revalidate = 600;

export default async function AboutPage() {
  const platformStats = await getCachedPlatformStats();
  const brandLabel = formatBrandCountLabel(platformStats.brandCount);
  const productLabel = formatProductCountLabel(platformStats.productCount);

  return (
    <div className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-12 md:gap-16 px-4">
      <header className="flex flex-col gap-4 md:gap-6">
        <span
          className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground"
          data-testid="text-about-eyebrow"
        >
          ABOUT INTERTEXE
        </span>
        <h1
          className="text-[32px] md:text-[40px] font-serif font-light leading-[1.15] text-foreground"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          data-testid="text-about-title"
        >
          Most fashion platforms show you what brands want you to see.
          <br className="hidden md:block" />
          Intertexe shows you what the label actually says.
        </h1>
      </header>

      <div className="flex flex-col gap-8 md:gap-10 text-[15px] md:text-base text-foreground/80 leading-relaxed font-light">
        <p>
          We verify the fiber composition of every product on the platform. Silk is silk. Cashmere is
          cashmere. Linen is linen. The wool coat you are spending $800 on is not 60% acrylic. Every
          product on Intertexe contains at least 80% natural fiber — verified before it is listed, not
          after a complaint.
        </p>

        <p>
          This is not a sustainability platform. It is a quality standard. The information was always on
          the label. We made it easy to find, impossible to fake, and beautiful to browse.
        </p>

        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-8 border-y border-border/40"
          data-testid="section-about-stats"
        >
          <div className="flex flex-col gap-1" data-testid="stat-brands-vetted">
            <span className="text-3xl md:text-4xl font-serif font-light text-foreground">
              {platformStats.brandCount > 0 ? brandLabel : "253+"}
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              brands vetted
            </span>
          </div>
          <div className="flex flex-col gap-1" data-testid="stat-products-verified">
            <span className="text-3xl md:text-4xl font-serif font-light text-foreground">
              {platformStats.productCount > 0 ? productLabel : "33,430"}
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              verified pieces
            </span>
          </div>
          <div className="flex flex-col gap-1" data-testid="stat-composition-checked">
            <span className="text-3xl md:text-4xl font-serif font-light text-foreground">100%</span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              composition checked
            </span>
          </div>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">THE SCANNER</h2>
          <p>
            Point your camera at any care label or price tag in any store in the world. Intertexe reads
            the fiber composition instantly, tells you the exact natural fiber percentage, and shows you
            better alternatives at a similar price if the piece is mostly synthetic.
          </p>
          <p>
            Every scan teaches the platform something. Every barcode linked to a composition makes the
            next scan faster. After enough scans Intertexe will have the most comprehensive fashion fiber
            composition database in the world — one that does not exist anywhere else and cannot be
            replicated quickly by any competitor.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            FOR BRANDS AND PARTNERS
          </h2>
          <p>
            Intertexe is building the infrastructure layer for material transparency in fashion. If you
            are a brand, retailer, or platform interested in verified composition data, API access, or
            featured placement within the Intertexe edit, we would like to hear from you.
          </p>
          <Link
            href="mailto:hello@intertexe.com"
            className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-foreground border-b border-foreground/30 pb-1 w-fit hover:text-muted-foreground transition-colors"
            data-testid="link-contact-partners"
          >
            Contact us → hello@intertexe.com
          </Link>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">THE STANDARD</h2>
          <p>
            Intertexe is the only fashion platform that verifies the fiber composition of every product
            it carries. That is the standard. Everything else is a promise.
          </p>
        </section>
      </div>
    </div>
  );
}
