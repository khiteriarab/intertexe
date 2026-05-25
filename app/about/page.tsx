import type { Metadata } from "next";
import Link from "next/link";
import { getCachedPlatformStats } from "../../lib/cached-catalog";
import {
  formatBrandCountLabel,
  formatProductCountLabel,
} from "../../lib/catalog-stats-labels";

export const metadata: Metadata = {
  title: "About INTERTEXE — The Natural Fabric Fashion Search Engine",
  description: "INTERTEXE is the first fashion discovery platform that ranks designers by the quality of their materials and commitment to natural fibers. Learn about our mission to make fabric-first shopping the standard.",
  alternates: { canonical: "https://www.intertexe.com/about" },
};

export const revalidate = 600;

export default async function AboutPage() {
  const platformStats = await getCachedPlatformStats();
  const shoppableBrands = platformStats.brandCount;
  const designerLabel = formatBrandCountLabel(shoppableBrands);
  const productLabel = formatProductCountLabel(platformStats.productCount);

  return (
    <div className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-10 md:gap-16">
      <header className="flex flex-col gap-4 md:gap-6">
        <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Our Story</span>
        <h1 className="text-3xl md:text-6xl font-serif" data-testid="text-about-title">About <span className="tracking-widest uppercase">Intertexe</span></h1>
      </header>

      <div className="flex flex-col gap-8 md:gap-12 text-base md:text-lg text-foreground/80 leading-relaxed font-light">
        <p>
          Most fashion platforms show you what brands want you to see. Intertexe shows you what the label actually says. We verify the composition of every product on the platform. This is not a sustainability platform. It is a quality standard.
        </p>

        <div className="border-l-2 border-foreground pl-6 md:pl-8 py-2">
          <p className="font-serif text-xl md:text-2xl text-foreground/90 italic">
            &ldquo;The fabric is the foundation of everything. Without exceptional materials, even the most beautiful design falls short.&rdquo;
          </p>
        </div>

        <p>
          Our directory features {designerLabel} brands with live inventory, each evaluated on the percentage of natural fibers used across their collections. From heritage houses like Loro Piana and Brunello Cucinelli to emerging ateliers pushing the boundaries of sustainable luxury, we give you a transparent view into what truly makes a garment exceptional.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 py-6 md:py-8 border-y border-border/40">
          <div className="flex flex-col gap-2" data-testid="stat-designers">
            <span className="text-4xl md:text-5xl font-serif">{shoppableBrands > 0 ? designerLabel : "—"}</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Brands With Live Inventory</span>
          </div>
          <div className="flex flex-col gap-2" data-testid="stat-products">
            <span className="text-4xl md:text-5xl font-serif">{platformStats.productCount > 0 ? productLabel : "—"}</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Verified Products</span>
          </div>
          <div className="flex flex-col gap-2" data-testid="stat-fibers">
            <span className="text-4xl md:text-5xl font-serif">100%</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Material Transparency</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground">Our Mission</h2>
          <p>
            We believe shopping for clothing should start with the fabric. Every product on INTERTEXE is verified to contain at least 80% natural fibers — so you can shop silk, linen, cotton, wool, and cashmere with confidence, not guesswork.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground">How We Rank Brands</h2>
          <p>
            Each brand receives a quality score based on the average natural fiber percentage across their verified catalog. We surface brands that consistently prioritize natural materials — not marketing claims.
          </p>
        </div>

        <div className="pt-4">
          <Link href="/designers" className="text-sm uppercase tracking-widest underline underline-offset-4 hover:text-muted-foreground transition-colors">
            Explore the brand directory →
          </Link>
        </div>
      </div>
    </div>
  );
}
