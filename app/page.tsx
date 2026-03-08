import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  fetchDesigners,
  fetchDesignerBySlug,
  fetchProductsByFiber,
  fetchProductsByBrandWithImages,
  fetchProductCount,
  fetchProductCountsByBrand,
} from "../lib/supabase-server";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { HorizontalProductScroll, BrandGrid } from "./components/HomeClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "INTERTEXE — The Material Standard",
  description:
    "Shop fashion by fabric, not just style. 17,000+ clothing items ranked by material quality. Filter polyester out and find natural fibers instantly across 60+ curated brands.",
  alternates: { canonical: "https://www.intertexe.com" },
};

const CURATED_BRAND_SLUGS = [
  "khaite", "anine-bing", "toteme", "frame", "diesel",
  "nanushka", "acne-studios", "the-row", "sandro", "agolde",
];

export default async function HomePage() {
  const [designers, productCount, cashmereProducts, silkProducts, linenProducts, productCountByBrand] =
    await Promise.all([
      fetchDesigners(undefined, 100),
      fetchProductCount(),
      fetchProductsByFiber("cashmere").then((p) => p.slice(0, 16)),
      fetchProductsByFiber("silk").then((p) => p.slice(0, 16)),
      fetchProductsByFiber("linen").then((p) => p.slice(0, 16)),
      fetchProductCountsByBrand(CURATED_BRAND_SLUGS),
    ]);

  const curatedDesignerResults = await Promise.all(
    CURATED_BRAND_SLUGS.map(async (slug) => {
      const designer = await fetchDesignerBySlug(slug);
      if (!designer) return null;
      if (designer.naturalFiberPercent != null) return designer;
      const score = getCuratedScore(designer.name);
      return score != null ? { ...designer, naturalFiberPercent: score } : designer;
    })
  );
  const curatedDesigners = curatedDesignerResults.filter(Boolean);

  const [alcProducts, dieselProducts] = await Promise.all([
    fetchProductsByBrandWithImages("a-l-c-", 24),
    fetchProductsByBrandWithImages("diesel", 24),
  ]);

  const seenIds = new Set<string>();
  const newInProducts: any[] = [];
  for (const p of [...alcProducts, ...dieselProducts]) {
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      newInProducts.push(p);
    }
  }

  const displayCount = productCount > 0 ? new Intl.NumberFormat("en-US").format(productCount) : "17,553";

  return (
    <div className="flex flex-col gap-0">
      <section className="relative h-[75vh] md:h-[80vh] min-h-[480px] flex items-end overflow-hidden -mx-4 md:-mx-8">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-fashion.jpg"
            alt="Luxury Fashion Editorial"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/5" />
        </div>

        <div
          className="relative z-10 px-5 md:px-10 pb-12 md:pb-16 max-w-2xl flex flex-col"
          style={{ paddingBottom: "max(3rem, calc(env(safe-area-inset-bottom, 0px) + 2.5rem))" }}
        >
          <h1
            className="text-[32px] leading-[1.15] md:text-6xl font-serif text-white mb-4 md:mb-6"
            data-testid="text-hero-headline"
          >
            Shop Natural Fabrics
          </h1>
          <p
            className="text-[13px] md:text-lg text-white/80 mb-6 md:mb-8 font-light leading-relaxed max-w-md"
            data-testid="text-hero-subtext"
          >
            {displayCount} verified products. Choose your fabrics, browse ranked pieces, shop better materials instantly.
          </p>
          <Link
            href="/materials"
            className="bg-white text-black px-6 py-3.5 md:px-8 md:py-4 uppercase tracking-[0.15em] text-xs md:text-sm font-medium hover:bg-white/90 transition-colors flex items-center gap-2 w-fit active:scale-[0.97]"
            data-testid="button-shop-now"
          >
            Browse Fabrics <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {newInProducts.length > 0 && (
        <section className="py-10 md:py-16">
          <HorizontalProductScroll
            products={newInProducts.slice(0, 30)}
            title="New In"
            subtitle={`${displayCount} verified products`}
            linkHref="/shop"
            linkText="Shop New In"
          />
        </section>
      )}

      <section className="py-8 md:py-14 border-t border-border/30">
        <div className="flex justify-between items-end mb-8 md:mb-10">
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1">
              INTERTEXE Approved
            </p>
            <h2 className="text-2xl md:text-3xl font-serif">The Brands We Love</h2>
          </div>
          <Link
            href="/designers"
            className="text-[10px] md:text-sm uppercase tracking-[0.15em] hover:text-muted-foreground transition-colors"
            data-testid="link-view-all-designers"
          >
            View All
          </Link>
        </div>

        <BrandGrid designers={curatedDesigners} productCounts={productCountByBrand} />
      </section>

      {cashmereProducts.length > 0 && (
        <section className="py-8 md:py-14 border-t border-border/30">
          <HorizontalProductScroll
            products={cashmereProducts}
            title="The Cashmere Edit"
            subtitle="Pure luxury, verified"
            linkHref="/materials/cashmere"
            linkText="Shop all cashmere"
          />
        </section>
      )}

      <section className="-mx-4 md:-mx-8 grid grid-cols-1 md:grid-cols-2">
        <Link
          href="/materials/silk-tops"
          className="group relative aspect-[4/3] md:aspect-[3/2] overflow-hidden flex items-end"
          data-testid="link-edit-silk"
        >
          <div className="absolute inset-0 bg-[#f5f5f5]">
            {silkProducts[0]?.imageUrl && (
              <img
                src={silkProducts[0].imageUrl}
                alt="Silk Edit"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          </div>
          <div className="relative z-10 p-6 md:p-8 flex flex-col gap-1">
            <h3 className="text-white text-xl md:text-2xl font-serif">The Silk Edit</h3>
            <p className="text-white/70 text-xs md:text-sm">Blouses, dresses, and camisoles in pure silk</p>
            <span className="text-white/90 text-[10px] uppercase tracking-[0.15em] mt-2 flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
              Shop the edit <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
        <Link
          href="/materials/linen-dresses"
          className="group relative aspect-[4/3] md:aspect-[3/2] overflow-hidden flex items-end"
          data-testid="link-edit-linen"
        >
          <div className="absolute inset-0 bg-[#f5f5f5]">
            {linenProducts[0]?.imageUrl && (
              <img
                src={linenProducts[0].imageUrl}
                alt="Linen Edit"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          </div>
          <div className="relative z-10 p-6 md:p-8 flex flex-col gap-1">
            <h3 className="text-white text-xl md:text-2xl font-serif">Linen for Every Day</h3>
            <p className="text-white/70 text-xs md:text-sm">Dresses, tops, and suiting in natural linen</p>
            <span className="text-white/90 text-[10px] uppercase tracking-[0.15em] mt-2 flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
              Shop the edit <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </section>

      {silkProducts.length > 0 && (
        <section className="py-8 md:py-14">
          <HorizontalProductScroll
            products={silkProducts}
            title="Silk Essentials"
            subtitle="Effortless elegance"
            linkHref="/materials/silk"
            linkText="Shop all silk"
          />
        </section>
      )}

      <section className="border-t border-b border-border/30 -mx-4 md:-mx-8 px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/30">
          <div className="py-8 md:py-12 flex flex-col items-center text-center gap-1">
            <span className="text-2xl md:text-4xl font-serif">{new Intl.NumberFormat("en-US").format(designers.length)}+</span>
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Brands Vetted
            </span>
          </div>
          <div className="py-8 md:py-12 flex flex-col items-center text-center gap-1">
            <span className="text-2xl md:text-4xl font-serif">{displayCount}</span>
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Verified Products
            </span>
          </div>
          <div className="py-8 md:py-12 flex flex-col items-center text-center gap-1">
            <span className="text-2xl md:text-4xl font-serif">5</span>
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Material Guides
            </span>
          </div>
          <div className="py-8 md:py-12 flex flex-col items-center text-center gap-1">
            <span className="text-2xl md:text-4xl font-serif">100%</span>
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Composition Verified
            </span>
          </div>
        </div>
      </section>

      <section className="text-center py-12 md:py-20 max-w-2xl mx-auto flex flex-col items-center gap-4 md:gap-6">
        <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Personalized For You
        </p>
        <h2 className="text-2xl md:text-4xl font-serif leading-tight">Not Sure Where to Start?</h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-md leading-relaxed">
          Take our 2-minute quiz. We&apos;ll match you with your fabric persona and recommend the designers you&apos;ll love.
        </p>
        <Link
          href="/quiz"
          className="bg-foreground text-background px-8 py-3.5 uppercase tracking-[0.15em] text-xs font-medium hover:bg-foreground/90 transition-colors mt-2 active:scale-95"
          data-testid="button-cta-quiz"
        >
          Find My Designers
        </Link>
      </section>
    </div>
  );
}
