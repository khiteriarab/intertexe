import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchProductCount } from "@/lib/supabase";
import { useSEO } from "@/hooks/use-seo";

const FABRIC_HUB = [
  {
    fabric: "Cotton",
    slug: "cotton",
    tagline: "The foundation of every wardrobe",
    color: "#E8E4DE",
    subcategories: [
      { slug: "cotton-dresses", label: "Dresses" },
      { slug: "cotton-shirts", label: "Shirts" },
      { slug: "cotton-tops", label: "Tops" },
      { slug: "cotton-pants", label: "Pants" },
      { slug: "cotton-knitwear", label: "Knitwear" },
    ],
  },
  {
    fabric: "Linen",
    slug: "linen",
    tagline: "Effortless elegance, naturally",
    color: "#D5CFC4",
    subcategories: [
      { slug: "linen-dresses", label: "Dresses" },
      { slug: "linen-tops", label: "Tops" },
      { slug: "linen-shirts", label: "Shirts" },
      { slug: "linen-pants", label: "Pants" },
      { slug: "linen-sets", label: "Sets" },
    ],
  },
  {
    fabric: "Silk",
    slug: "silk",
    tagline: "Luxury you can feel",
    color: "#DDD5CB",
    subcategories: [
      { slug: "silk-dresses", label: "Dresses" },
      { slug: "silk-tops", label: "Tops" },
      { slug: "silk-blouses", label: "Blouses" },
      { slug: "silk-skirts", label: "Skirts" },
      { slug: "silk-dresses-evening", label: "Evening" },
    ],
  },
  {
    fabric: "Wool",
    slug: "wool",
    tagline: "Warmth with integrity",
    color: "#C8C0B5",
    subcategories: [
      { slug: "wool-sweaters", label: "Sweaters" },
      { slug: "wool-coats", label: "Coats" },
      { slug: "wool-pants", label: "Trousers" },
    ],
  },
  {
    fabric: "Cashmere",
    slug: "cashmere",
    tagline: "The ultimate in softness",
    color: "#D8D0C8",
    subcategories: [
      { slug: "cashmere-sweaters", label: "Sweaters" },
      { slug: "cashmere-knits", label: "Cardigans" },
    ],
  },
];

export default function Materials() {
  useSEO({
    title: "Shop by Fabric — Find Silk, Linen, Cotton & Wool Clothing | INTERTEXE",
    description: "The easiest way to shop luxury fashion made from natural fabrics. Find silk instead of polyester, linen instead of viscose, cotton instead of blends. 17,000+ verified products.",
    path: "/materials",
  });

  const { data: productCount = 0 } = useQuery({
    queryKey: ["product-count"],
    queryFn: fetchProductCount,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="flex flex-col" data-testid="page-fabric-hub">

      <section className="-mx-4 md:-mx-8 px-6 md:px-16 lg:px-24 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] text-muted-foreground">The Fabric Hub</p>
          <h1 className="text-[42px] md:text-[72px] lg:text-[88px] font-serif leading-[0.95] tracking-[-0.02em]" data-testid="text-hub-headline">
            Shop by<br />Natural Fabric
          </h1>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <p className="text-[15px] md:text-base text-muted-foreground font-light leading-relaxed max-w-md">
              Find silk instead of polyester. Linen instead of viscose. Cotton instead of blends. Every composition verified.
            </p>
            {productCount > 0 && (
              <p className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
                {productCount.toLocaleString()} products · 11,000+ brands
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="-mx-4 md:-mx-8">
        {FABRIC_HUB.map((group, index) => (
          <div
            key={group.slug}
            className="border-t border-border/40"
            data-testid={`hub-section-${group.slug}`}
          >
            <Link
              href={`/materials/${group.slug}`}
              className="group block px-6 md:px-16 lg:px-24"
            >
              <div className="max-w-5xl mx-auto py-10 md:py-14 flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
                <div className="flex-1 flex flex-col gap-3 md:gap-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{group.tagline}</p>
                  <h2
                    className="text-[36px] md:text-[56px] lg:text-[64px] font-serif leading-[0.95] tracking-[-0.02em] group-hover:text-muted-foreground transition-colors duration-300"
                    data-testid={`text-fabric-${group.slug}`}
                  >
                    {group.fabric}
                  </h2>
                </div>

                <div className="flex items-center gap-3 md:gap-4 self-end md:self-center">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground group-hover:text-foreground transition-colors">
                    Shop {group.fabric}
                  </span>
                  <div className="w-10 h-10 border border-border/60 group-hover:border-foreground/40 flex items-center justify-center transition-all group-hover:bg-foreground group-hover:text-background">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>

            <div className="px-6 md:px-16 lg:px-24 pb-10 md:pb-14">
              <div className="max-w-5xl mx-auto">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {group.subcategories.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/materials/${sub.slug}`}
                      className="text-[13px] md:text-sm text-muted-foreground hover:text-foreground transition-colors py-1 border-b border-transparent hover:border-foreground/30"
                      data-testid={`link-sub-${sub.slug}`}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="border-t border-border/40" />
      </section>

      <section className="-mx-4 md:-mx-8 bg-foreground text-background">
        <div className="max-w-5xl mx-auto px-6 md:px-16 lg:px-24 py-16 md:py-24 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          <Link href="/scanner" className="group flex flex-col gap-4" data-testid="link-hub-scanner">
            <span className="text-[11px] uppercase tracking-[0.3em] text-background/30">01</span>
            <span className="text-lg md:text-xl font-serif group-hover:text-background/70 transition-colors">Scan a Product</span>
            <span className="text-[13px] text-background/50 leading-relaxed">Paste any product URL to instantly check its fabric composition.</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-background/30 mt-2 group-hover:text-background/60 transition-colors flex items-center gap-2">
              Try it <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
          <Link href="/quiz" className="group flex flex-col gap-4" data-testid="link-hub-quiz">
            <span className="text-[11px] uppercase tracking-[0.3em] text-background/30">02</span>
            <span className="text-lg md:text-xl font-serif group-hover:text-background/70 transition-colors">Find Your Persona</span>
            <span className="text-[13px] text-background/50 leading-relaxed">Take a 2-minute quiz to discover your fabric persona and get personalized recommendations.</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-background/30 mt-2 group-hover:text-background/60 transition-colors flex items-center gap-2">
              Take the quiz <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
          <Link href="/designers" className="group flex flex-col gap-4" data-testid="link-hub-directory">
            <span className="text-[11px] uppercase tracking-[0.3em] text-background/30">03</span>
            <span className="text-lg md:text-xl font-serif group-hover:text-background/70 transition-colors">Brand Directory</span>
            <span className="text-[13px] text-background/50 leading-relaxed">Browse 11,000+ brands ranked by natural fiber quality across every category.</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-background/30 mt-2 group-hover:text-background/60 transition-colors flex items-center gap-2">
              Browse brands <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </section>

      <section className="-mx-4 md:-mx-8 px-6 md:px-16 lg:px-24 py-20 md:py-28 text-center flex flex-col items-center gap-6">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Every Composition Verified</p>
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-serif max-w-lg leading-[1.1]">
          We read every label so you don't have to.
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-sm leading-relaxed mt-2">
          No guesswork. No marketing language. Just real material data.
        </p>
        <Link
          href="/shop"
          className="mt-4 bg-foreground text-background px-12 py-4 uppercase tracking-[0.2em] text-[11px] font-medium hover:bg-foreground/90 transition-colors active:scale-[0.97]"
          data-testid="button-shop-all"
        >
          Shop All Products
        </Link>
      </section>
    </div>
  );
}
