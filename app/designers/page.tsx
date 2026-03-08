import type { Metadata } from "next";
import Link from "next/link";
import { getQualityTier, getTierColor } from "../../lib/quality-tiers";
import { getCuratedScore } from "../../lib/curated-quality-scores";
import { getBrandProfile } from "../../lib/brand-profiles";
import { DesignerSearchClient } from "./DesignerSearchClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brand Directory — 11,000+ Brands Ranked by Natural Fiber Quality",
  description: "Browse and search 11,000+ fashion brands ranked by natural fiber quality. Find brands committed to cotton, linen, silk, wool, and cashmere.",
  openGraph: {
    title: "Brand Directory — 11,000+ Brands Ranked by Natural Fiber Quality",
    description: "Browse and search 11,000+ fashion brands ranked by natural fiber quality.",
  },
};

const BRANDS_WITH_PRODUCTS: { slug: string; name: string; products: number }[] = [
  { slug: "aje", name: "Aje", products: 1360 },
  { slug: "tibi", name: "Tibi", products: 1300 },
  { slug: "rails", name: "Rails", products: 1283 },
  { slug: "citizens-of-humanity", name: "Citizens of Humanity", products: 902 },
  { slug: "l-agence", name: "L'Agence", products: 880 },
  { slug: "veronica-beard", name: "Veronica Beard", products: 831 },
  { slug: "velvet-by-graham-spencer", name: "Velvet by Graham & Spencer", products: 800 },
  { slug: "joseph", name: "Joseph", products: 757 },
  { slug: "mother", name: "Mother Denim", products: 736 },
  { slug: "club-monaco", name: "Club Monaco", products: 695 },
  { slug: "faithfull-the-brand", name: "Faithfull the Brand", products: 694 },
  { slug: "ulla-johnson", name: "Ulla Johnson", products: 505 },
  { slug: "dl1961", name: "DL1961", products: 503 },
  { slug: "dissh", name: "Dissh", products: 499 },
  { slug: "fleur-du-mal", name: "Fleur du Mal", products: 441 },
  { slug: "st-agni", name: "St. Agni", products: 432 },
  { slug: "cult-gaia", name: "Cult Gaia", products: 322 },
  { slug: "rebecca-taylor", name: "Rebecca Taylor", products: 315 },
  { slug: "sea-new-york", name: "Sea New York", products: 299 },
  { slug: "a-l-c-", name: "A.L.C.", products: 250 },
  { slug: "rixo", name: "Rixo", products: 241 },
  { slug: "re-done", name: "Re/Done", products: 235 },
  { slug: "camilla-and-marc", name: "Camilla and Marc", products: 210 },
  { slug: "nili-lotan", name: "Nili Lotan", products: 205 },
  { slug: "tanya-taylor", name: "Tanya Taylor", products: 202 },
  { slug: "sir-the-label", name: "Sir the Label", products: 195 },
  { slug: "nanushka", name: "Nanushka", products: 172 },
  { slug: "frame", name: "Frame", products: 131 },
  { slug: "anine-bing", name: "Anine Bing", products: 113 },
  { slug: "derek-lam", name: "Derek Lam 10 Crosby", products: 113 },
  { slug: "rodebjer", name: "Rodebjer", products: 112 },
  { slug: "maria-mcmanus", name: "Maria McManus", products: 98 },
  { slug: "khaite", name: "Khaite", products: 96 },
  { slug: "rachel-comey", name: "Rachel Comey", products: 86 },
  { slug: "stine-goya", name: "Stine Goya", products: 45 },
  { slug: "mara-hoffman", name: "Mara Hoffman", products: 42 },
  { slug: "esse-studios", name: "Esse Studios", products: 32 },
  { slug: "sandro", name: "Sandro", products: 26 },
  { slug: "agolde", name: "AGOLDE", products: 22 },
  { slug: "reformation", name: "Reformation", products: 13 },
  { slug: "veda", name: "Veda", products: 11 },
  { slug: "the-kooples", name: "The Kooples", products: 9 },
  { slug: "toteme", name: "Totême", products: 2 },
];

const totalProducts = BRANDS_WITH_PRODUCTS.reduce((sum, b) => sum + b.products, 0);

export default function DesignersPage() {
  return (
    <div className="py-6 md:py-12 flex flex-col gap-8 md:gap-12 max-w-6xl mx-auto px-4">
      <header className="flex flex-col items-center text-center gap-4 md:gap-6 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-serif" style={{ fontFamily: "Playfair Display, serif" }} data-testid="text-directory-title">The Directory</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {totalProducts.toLocaleString()}+ verified products across {BRANDS_WITH_PRODUCTS.length} brands, every item checked for natural fiber composition.
        </p>
      </header>

      <DesignerSearchClient />

      <section className="flex flex-col gap-6 md:gap-8" data-testid="section-brands-with-products">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl md:text-2xl font-serif" style={{ fontFamily: "Playfair Display, serif" }}>Brands You Can Shop</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {BRANDS_WITH_PRODUCTS.map(brand => {
            const score = getCuratedScore(brand.name);
            const tier = getQualityTier(score);
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
                  {score != null && (
                    <span className={`px-1.5 py-0.5 text-[7px] md:text-[8px] uppercase tracking-[0.1em] font-medium flex-shrink-0 ${getTierColor(tier.tier)}`}>
                      {tier.shortLabel}
                    </span>
                  )}
                </div>
                {profile && (
                  <div className="flex flex-wrap gap-1">
                    {profile.materialStrengths.slice(0, 3).map(mat => (
                      <span key={mat} className="text-[7px] md:text-[8px] uppercase tracking-wider text-muted-foreground bg-secondary/60 px-1.5 py-0.5">{mat}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-muted-foreground">{brand.products.toLocaleString()} products</span>
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
    </div>
  );
}
