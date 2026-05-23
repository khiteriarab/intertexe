import type { Metadata } from "next";
import Link from "next/link";
import { getQualityTier, getTierColor } from "../../lib/quality-tiers";
import { getBrandProfile } from "../../lib/brand-profiles";
import { DesignerSearchClient } from "./DesignerSearchClient";
import { getCachedBrandStats, getCachedPlatformStats } from "../../lib/cached-catalog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Brand Directory — 11,000+ Brands Ranked by Natural Fiber Quality",
  description: "Browse and search 11,000+ fashion brands ranked by natural fiber quality. Find brands committed to cotton, linen, silk, wool, and cashmere.",
  openGraph: {
    title: "Brand Directory — 11,000+ Brands Ranked by Natural Fiber Quality",
    description: "Browse and search 11,000+ fashion brands ranked by natural fiber quality.",
  },
};

export default async function DesignersPage() {
  const [platformStats, brandStats] = await Promise.all([
    getCachedPlatformStats(),
    getCachedBrandStats(),
  ]);
  const shoppableBrands = brandStats.filter((b) => b.count >= 2);
  const productLabel =
    platformStats.productCount >= 1000
      ? `${platformStats.productCount.toLocaleString()}+`
      : platformStats.productCount.toLocaleString();
  const brandLabel =
    platformStats.brandCount >= 20
      ? `${platformStats.brandCount}+`
      : platformStats.brandCount.toLocaleString();
  return (
    <div className="py-6 md:py-12 flex flex-col gap-8 md:gap-12 max-w-6xl mx-auto px-4">
      <header className="flex flex-col items-center text-center gap-4 md:gap-6 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-serif" style={{ fontFamily: "Playfair Display, serif" }} data-testid="text-directory-title">The Directory</h1>
        <p className="text-muted-foreground text-sm md:text-base" data-testid="text-directory-stats">
          {productLabel} verified products across {brandLabel} brands in natural silk, linen, cotton, wool, and cashmere.
        </p>
        {shoppableBrands.length > 0 && (
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">
            Featured below — {shoppableBrands.length.toLocaleString()} brands with live inventory
          </p>
        )}
      </header>

      <DesignerSearchClient />

      {shoppableBrands.length > 0 && (
      <section className="flex flex-col gap-6 md:gap-8" data-testid="section-brands-with-products">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl md:text-2xl font-serif" style={{ fontFamily: "Playfair Display, serif" }}>Brands You Can Shop</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {shoppableBrands.map(brand => {
            const tier = getQualityTier(brand.avgNaturalFiber);
            const profile = getBrandProfile(brand.slug);
            return (
              <Link
                key={brand.slug}
                href={`/designers/${brand.slug}`}
                className="group flex flex-col gap-2 p-3 md:p-4 border border-border/20 hover:border-foreground/20 transition-all active:opacity-70"
                data-testid={`card-shoppable-${brand.slug}`}
              >
                <div className="flex justify-between items-start gap-1">
                  <h3 className="text-sm md:text-base font-serif leading-tight group-hover:text-muted-foreground transition-colors">{brand.name}</h3>
                  <span className={`px-1.5 py-0.5 text-[7px] md:text-[8px] uppercase tracking-[0.1em] font-medium flex-shrink-0 ${getTierColor(tier.tier)}`}>
                    {tier.shortLabel}
                  </span>
                </div>
                {profile && (
                  <div className="flex flex-wrap gap-1">
                    {profile.materialStrengths.slice(0, 3).map(mat => (
                      <span key={mat} className="text-[7px] md:text-[8px] uppercase tracking-wider text-muted-foreground bg-secondary/60 px-1.5 py-0.5">{mat}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-muted-foreground">{brand.count.toLocaleString()} products</span>
                  <svg className="w-3 h-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" /></svg>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
          <Link
            href="/shop"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 bg-foreground text-background py-3.5 uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-foreground/90 transition-colors active:scale-[0.98]"
            data-testid="link-shop-all-from-directory"
          >
            Shop All Products
          </Link>
          <Link
            href="/designers/all"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 border border-foreground text-foreground py-3.5 uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-foreground hover:text-background transition-colors active:scale-[0.98]"
            data-testid="link-display-all-brands"
          >
            Display All Brands
          </Link>
        </div>
      </section>
      )}
    </div>
  );
}
