import type { Metadata } from "next";
import Link from "next/link";
import { getHomePageData } from "../lib/homepage-data";
import { HomePageContent } from "./components/HomeClient";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "INTERTEXE | The Luxury Fashion Search Engine for Natural Fabrics",
  description:
    "INTERTEXE is the luxury fashion search engine for natural fabrics. Shop 15,000+ verified silk, cashmere, linen, wool, and cotton clothing across 11,000+ brands. The easiest way to find quality clothing by fabric.",
  keywords: "INTERTEXE, intertexe, natural fiber fashion, shop by fabric, silk clothing, cashmere clothing, linen clothing, wool clothing, cotton clothing, luxury fashion, natural fabric clothing, sustainable fashion",
  alternates: { canonical: "https://www.intertexe.com" },
};

async function getSSRStats() {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
  const [
    { count: productCount },
    { count: brandCount },
    { data: topBrands },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).gte("natural_fiber_percent", 80).not("image_url", "is", null).neq("image_url", ""),
    supabase.from("designers").select("*", { count: "exact", head: true }),
    supabase.from("designers").select("name, slug, natural_fiber_percent").not("natural_fiber_percent", "is", null).order("natural_fiber_percent", { ascending: false }).limit(12),
  ]);
  return { productCount: productCount || 0, brandCount: brandCount || 0, topBrands: topBrands || [] };
}

export default async function HomePage() {
  const [data, stats] = await Promise.all([getHomePageData(), getSSRStats()]);

  return (
    <>
      <HomePageContent initialData={data} />

      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-serif text-center mb-6">
          INTERTEXE — The Fashion Search Engine for Natural Fabrics
        </h1>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12 text-sm md:text-base leading-relaxed">
          INTERTEXE makes it easy to shop luxury fashion by fabric. Browse {stats.productCount.toLocaleString()}+ verified clothing items across {stats.brandCount.toLocaleString()}+ brands, 
          all filtered by natural fiber content. Every product is verified to contain 80% or more natural fibers — silk, cashmere, linen, wool, and cotton.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-16">
          {[
            { name: "Silk", slug: "silk", desc: "Luxurious drape and sheen" },
            { name: "Cashmere", slug: "cashmere", desc: "Ultra-soft warmth" },
            { name: "Linen", slug: "linen", desc: "Breathable and crisp" },
            { name: "Wool", slug: "wool", desc: "Natural insulation" },
            { name: "Cotton", slug: "cotton", desc: "Everyday comfort" },
          ].map((fiber) => (
            <Link
              key={fiber.slug}
              href={`/materials/${fiber.slug}`}
              className="flex flex-col items-center p-4 md:p-6 border border-border/30 hover:border-foreground/20 transition-colors text-center"
            >
              <span className="text-sm md:text-base font-serif font-medium">{fiber.name}</span>
              <span className="text-[10px] md:text-xs text-muted-foreground mt-1">{fiber.desc}</span>
            </Link>
          ))}
        </div>

        <div className="mb-16">
          <h2 className="text-xl md:text-2xl font-serif text-center mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "Silk Dresses", href: "/materials/silk-dresses" },
              { name: "Cashmere Sweaters", href: "/materials/cashmere-sweaters" },
              { name: "Linen Pants", href: "/materials/linen-pants" },
              { name: "Cotton Shirts", href: "/materials/cotton-shirts" },
              { name: "Wool Coats", href: "/materials/wool-coats" },
              { name: "Silk Blouses", href: "/materials/silk-blouses" },
              { name: "Linen Dresses", href: "/materials/linen-dresses" },
              { name: "Cotton Dresses", href: "/materials/cotton-dresses" },
            ].map((cat) => (
              <Link key={cat.href} href={cat.href} className="text-xs md:text-sm py-3 px-4 border border-border/30 hover:border-foreground/20 transition-colors text-center">
                {cat.name}
              </Link>
            ))}
          </div>
        </div>

        {stats.topBrands.length > 0 && (
          <div className="mb-16">
            <h2 className="text-xl md:text-2xl font-serif text-center mb-2">Top Rated Natural Fiber Brands</h2>
            <p className="text-center text-muted-foreground text-xs mb-8">Brands with the highest verified natural fiber content</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.topBrands.map((brand: any) => (
                <Link
                  key={brand.slug}
                  href={`/designers/${brand.slug}`}
                  className="flex items-center justify-between py-3 px-4 border border-border/30 hover:border-foreground/20 transition-colors"
                >
                  <span className="text-xs md:text-sm">{brand.name}</span>
                  <span className="text-[10px] text-emerald-700 font-medium">{brand.natural_fiber_percent}%</span>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link href="/designers/all" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors border-b border-border/40 pb-1">
                View all {stats.brandCount.toLocaleString()}+ brands →
              </Link>
            </div>
          </div>
        )}

        <div className="mb-16">
          <h2 className="text-xl md:text-2xl font-serif text-center mb-2">How INTERTEXE Works</h2>
          <p className="text-center text-muted-foreground text-xs mb-8">Your fabric-first shopping experience</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <p className="font-serif text-base mb-2">Verified Composition</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Every product on INTERTEXE is verified to contain 80% or more natural fibers. We analyze fabric composition data so you can shop with confidence.</p>
            </div>
            <div className="text-center p-6">
              <p className="font-serif text-base mb-2">Shop by Fabric</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Filter clothing by the fabric that matters to you — silk, cashmere, linen, wool, or cotton. Find exactly what you're looking for by material.</p>
            </div>
            <div className="text-center p-6">
              <p className="font-serif text-base mb-2">Quality Rated Brands</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Every brand is scored based on their average natural fiber content. See at a glance which brands prioritize quality natural materials.</p>
            </div>
          </div>
        </div>

        <div className="text-center border-t border-border/20 pt-12">
          <h2 className="text-xl md:text-2xl font-serif mb-4">Start Shopping by Fabric</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="bg-foreground text-background px-6 py-3 text-xs uppercase tracking-wider font-medium hover:opacity-90 transition-opacity">
              Shop All Products
            </Link>
            <Link href="/materials" className="border border-foreground px-6 py-3 text-xs uppercase tracking-wider font-medium hover:bg-foreground hover:text-background transition-colors">
              Explore Fabrics
            </Link>
            <Link href="/designers" className="border border-foreground px-6 py-3 text-xs uppercase tracking-wider font-medium hover:bg-foreground hover:text-background transition-colors">
              Brand Directory
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
