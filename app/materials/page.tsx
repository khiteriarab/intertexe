import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fetchProductCount } from "../../lib/supabase-server";
import { getCachedBrandStats, getCachedPlatformStats } from "../../lib/cached-catalog";
import {
  formatBrandCountLabel,
  formatProductCountLabel,
  GENERIC_SITE_DESCRIPTION,
  resolveShoppableBrandCount,
} from "../../lib/catalog-stats-labels";
import { fabricImages } from "../../lib/fabric-images";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getCachedPlatformStats();
  const description =
    stats.productCount > 0
      ? `Shop luxury fashion by natural fabric. ${formatProductCountLabel(stats.productCount)} verified silk, linen, cotton, wool, and cashmere pieces.`
      : GENERIC_SITE_DESCRIPTION;
  return {
    title: "Shop by Fabric — Find Silk, Linen, Cotton & Wool Clothing",
    description,
    alternates: { canonical: "https://www.intertexe.com/materials" },
  };
}

const FABRICS = [
  {
    fabric: "Cotton", slug: "cotton",
    tagline: "The foundation of every wardrobe",
    description: "From crisp poplin shirts to heavyweight denim — breathable, versatile, endlessly wearable.",
    subcategories: ["Dresses", "Shirts", "T-Shirts", "Denim"],
    subcategorySlugs: ["cotton-dresses", "cotton-shirts", "cotton-t-shirts", "cotton-denim"],
  },
  {
    fabric: "Linen", slug: "linen",
    tagline: "Light, airy, effortless",
    description: "The fabric that only gets better with age. Relaxed elegance for warm days and coastal evenings.",
    subcategories: ["Dresses", "Pants", "Shirts", "Blazers"],
    subcategorySlugs: ["linen-dresses", "linen-pants", "linen-shirts", "linen-blazers"],
  },
  {
    fabric: "Silk", slug: "silk",
    tagline: "Luxurious drape, timeless",
    description: "Nothing moves like silk. The ultimate in luxury — from bias-cut dresses to fluid blouses.",
    subcategories: ["Dresses", "Blouses", "Tops", "Skirts"],
    subcategorySlugs: ["silk-dresses", "silk-blouses", "silk-tops", "silk-skirts"],
  },
  {
    fabric: "Wool", slug: "wool",
    tagline: "Warm, structured, seasonless",
    description: "From Italian tailoring to Shetland knits. The fiber that defines shape and lasting quality.",
    subcategories: ["Coats", "Sweaters", "Pants", "Blazers"],
    subcategorySlugs: ["wool-coats", "wool-sweaters", "wool-pants", "wool-blazers"],
  },
  {
    fabric: "Cashmere", slug: "cashmere",
    tagline: "The softest fiber in the world",
    description: "Harvested once a year from the undercoat of cashmere goats. The pinnacle of knitwear.",
    subcategories: ["Sweaters", "Scarves", "Cardigans"],
    subcategorySlugs: ["cashmere-sweaters", "cashmere-scarves", "cashmere-cardigans"],
  },
  {
    fabric: "Leather", slug: "leather",
    tagline: "Natural. Enduring. Exceptional.",
    description:
      "Full-grain. Suede. Lambskin. Natural leather that develops character with every wear. The antithesis of plastic fashion.",
    subcategories: ["Jackets", "Trousers", "Skirts", "Suede"],
    subcategorySlugs: ["leather-jackets", "leather-trousers", "leather-skirts", "suede"],
  },
];

export default async function MaterialsPage() {
  const [platformStats, brandStats, productCount] = await Promise.all([
    getCachedPlatformStats(),
    getCachedBrandStats(),
    fetchProductCount(),
  ]);

  const totalProducts = platformStats.productCount > 0 ? platformStats.productCount : productCount;
  const displayCount =
    totalProducts > 0 ? new Intl.NumberFormat("en-US").format(totalProducts) : "—";
  const shoppableBrandCount = resolveShoppableBrandCount(
    platformStats.brandCount,
    brandStats.filter((b) => b.count >= 2).length
  );
  const directoryBlurb =
    shoppableBrandCount > 0
      ? `Browse ${formatBrandCountLabel(shoppableBrandCount)} brands ranked by natural fiber quality. Find your next favorite.`
      : "Browse brands ranked by natural fiber quality. Find your next favorite.";

  return (
    <div className="flex flex-col" data-testid="page-fabric-hub">
      <section className="relative -mx-4 md:-mx-8 overflow-hidden bg-[#111]">
        <div className="relative h-[60vh] md:h-[70vh] min-h-[340px] max-h-[600px] md:max-h-[700px] flex flex-col">
          <div className="absolute inset-0">
            <img src="/fabric-hero.jpg" alt="Natural fabric texture" className="w-full h-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#111]/60 via-[#111]/40 to-[#111]/80" />
          </div>
          <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 md:px-12">
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.45em] text-white/35 mb-4 md:mb-5">{displayCount} Verified Products</p>
            <h1 className="text-[2.2rem] md:text-[4.5rem] lg:text-[5.5rem] font-serif text-white leading-[1] tracking-[-0.02em] mb-4 md:mb-5" data-testid="text-hub-headline">
              The Fabric Edit
            </h1>
            <div className="w-8 h-[1px] bg-white/20 mb-4 md:mb-5" />
            <p className="text-[12px] md:text-[14px] text-white/40 max-w-sm leading-[1.7] font-light">
              The world&apos;s best fashion, organized by what it&apos;s made of.
            </p>
          </div>
          <div className="relative flex justify-center gap-6 md:gap-12 pb-6 md:pb-8 px-6">
            {["Cotton", "Linen", "Silk", "Wool", "Cashmere", "Leather"].map((name) => (
              <Link key={name} href={`/materials/${name.toLowerCase()}`} className="text-[8px] md:text-[10px] uppercase tracking-[0.25em] text-white/25 hover:text-white/70 transition-colors duration-500">
                {name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="-mx-4 md:-mx-8">
        {FABRICS.map((fabric, index) => {
          const isReversed = index % 2 === 1;
          const imgSrc = fabricImages[fabric.slug as keyof typeof fabricImages];

          return (
            <div key={fabric.slug} className="grid grid-cols-1 md:grid-cols-2 gap-0" data-testid={`hub-section-${fabric.slug}`}>
              <Link href={`/materials/${fabric.slug}`} className={`group relative overflow-hidden bg-white block ${isReversed ? "md:order-2" : ""}`}>
                <div className="relative w-full h-[280px] md:h-[420px] overflow-hidden">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={`${fabric.fabric} clothing`}
                      className="absolute inset-0 w-full h-full object-cover object-[center_12%] scale-[1.08] group-hover:scale-[1.1] transition-transform duration-1000"
                      loading={index < 2 ? "eager" : "lazy"}
                      decoding="async"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-[#E8E4DE] to-[#D5CFC4]" />
                  )}
                </div>
              </Link>

              <div className={`flex flex-col justify-center px-6 py-10 md:px-14 md:py-16 lg:px-20 bg-[#F7F6F3] ${isReversed ? "md:order-1" : ""}`}>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3 md:mb-4">{fabric.tagline}</p>
                <h2 className="text-3xl md:text-5xl font-serif mb-4 md:mb-6 leading-[1.1]">{fabric.fabric}</h2>
                <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed mb-8 md:mb-10 max-w-md">{fabric.description}</p>
                <div className="flex flex-wrap gap-2 mb-8 md:mb-10">
                  {fabric.subcategories.map((sub, i) => (
                    <Link key={sub} href={`/materials/${fabric.subcategorySlugs[i]}`} className="px-4 py-2 border border-border/50 text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:border-foreground hover:text-foreground transition-colors" data-testid={`link-sub-${fabric.subcategorySlugs[i]}`}>
                      {sub}
                    </Link>
                  ))}
                </div>
                <Link href={`/materials/${fabric.slug}`} className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium hover:gap-3 transition-all group/link w-fit" data-testid={`link-shop-${fabric.slug}`}>
                  Shop {fabric.fabric} <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      <section className="-mx-4 md:-mx-8 bg-[#111] text-white">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <Link href="/scanner" className="group flex flex-col gap-3 p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10 hover:bg-white/5 transition-colors" data-testid="link-hub-scanner">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">01</span>
            <span className="text-lg md:text-xl font-serif">Scan Any Product</span>
            <span className="text-[13px] text-white/50 leading-relaxed">Point your camera at any label. Know exactly what it is made of.</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 flex items-center gap-1.5 mt-2 group-hover:gap-2.5 transition-all">Try Scanner <ArrowRight className="w-3 h-3" /></span>
          </Link>
          <Link href="/quiz" className="group flex flex-col gap-3 p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10 hover:bg-white/5 transition-colors" data-testid="link-hub-quiz">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">02</span>
            <span className="text-lg md:text-xl font-serif">Find Your Fabric Persona</span>
            <span className="text-[13px] text-white/50 leading-relaxed">Take our 1-minute quiz and discover which natural fibers match your lifestyle.</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 flex items-center gap-1.5 mt-2 group-hover:gap-2.5 transition-all">Take Quiz <ArrowRight className="w-3 h-3" /></span>
          </Link>
          <Link href="/designers" className="group flex flex-col gap-3 p-8 md:p-12 hover:bg-white/5 transition-colors" data-testid="link-hub-directory">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">03</span>
            <span className="text-lg md:text-xl font-serif">Brand Directory</span>
            <span className="text-[13px] text-white/50 leading-relaxed">{directoryBlurb}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 flex items-center gap-1.5 mt-2 group-hover:gap-2.5 transition-all">Explore Brands <ArrowRight className="w-3 h-3" /></span>
          </Link>
        </div>
      </section>

      <section className="py-16 md:py-24 text-center flex flex-col items-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Every Label Checked</p>
        <h2 className="text-2xl md:text-4xl font-serif mb-4 leading-tight max-w-lg">We read every label so you don&apos;t have to.</h2>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-8">Our team verifies every composition — fiber by fiber, product by product. No guesswork, no greenwashing.</p>
        <Link href="/shop" className="bg-foreground text-background px-10 py-3.5 uppercase tracking-[0.15em] text-[11px] font-medium hover:bg-foreground/90 transition-colors active:scale-[0.97] inline-block" data-testid="button-shop-all">
          Shop All Products
        </Link>
      </section>
    </div>
  );
}
