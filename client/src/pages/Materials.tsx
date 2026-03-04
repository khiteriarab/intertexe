import { Link } from "wouter";
import { ArrowRight, Search, ShoppingBag, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchProductCount, fetchProductsByFiber } from "@/lib/supabase";
import { useSEO } from "@/hooks/use-seo";

const FABRIC_HUB = [
  {
    fabric: "Cotton",
    slug: "cotton",
    tagline: "The foundation of every wardrobe",
    description: "From crisp shirts to soft jersey, cotton is the most versatile natural fiber. We verify every composition so you can skip the synthetic blends.",
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
    description: "Pure linen breathes like nothing else. Browse verified linen pieces from brands that use real flax — not viscose marketed as linen.",
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
    description: "Real silk — not polyester satin. Every piece verified for actual silk content, from blouses to evening dresses.",
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
    description: "Genuine wool and merino — not acrylic imposters. Coats, sweaters, and tailoring that use real wool from trusted mills.",
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
    description: "Pure cashmere, not 5% cashmere blends. Every piece verified for genuine cashmere content from the world's finest brands.",
    subcategories: [
      { slug: "cashmere-sweaters", label: "Sweaters" },
      { slug: "cashmere-knits", label: "Cardigans" },
    ],
  },
];

function FabricSection({ group, products, index }: { group: typeof FABRIC_HUB[0]; products: any[]; index: number }) {
  const isReversed = index % 2 === 1;
  const previewProducts = products.slice(0, 4);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-0 min-h-[480px] md:min-h-[560px]`} data-testid={`hub-section-${group.slug}`}>
      <div className={`${isReversed ? "md:order-2" : ""} relative overflow-hidden bg-[#f5f5f3]`}>
        {previewProducts.length > 0 ? (
          <div className="grid grid-cols-2 h-full">
            {previewProducts.map((p: any, i: number) => (
              <div key={p.id} className="relative overflow-hidden">
                <img
                  src={p.image_url || p.imageUrl}
                  alt={p.name || group.fabric}
                  className="absolute inset-0 w-full h-full object-cover hover:scale-[1.04] transition-transform duration-700"
                  loading={index < 2 ? "eager" : "lazy"}
                />
                {i === 0 && (
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full min-h-[300px] flex items-center justify-center">
            <span className="text-6xl font-serif text-foreground/10">{group.fabric}</span>
          </div>
        )}
      </div>

      <div className={`${isReversed ? "md:order-1" : ""} flex flex-col justify-center px-6 md:px-12 lg:px-16 py-12 md:py-16`}>
        <div className="flex flex-col gap-6 max-w-md">
          <div className="flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">{group.tagline}</p>
            <Link href={`/materials/${group.slug}`} className="group">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif group-hover:text-muted-foreground transition-colors leading-[1.1]" data-testid={`text-fabric-${group.slug}`}>
                {group.fabric}
              </h2>
            </Link>
          </div>

          <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed">
            {group.description}
          </p>

          <div className="flex flex-wrap gap-x-1 gap-y-0">
            {group.subcategories.map((sub, i) => (
              <span key={sub.slug} className="inline-flex items-center">
                <Link
                  href={`/materials/${sub.slug}`}
                  className="text-[13px] md:text-sm text-foreground hover:text-muted-foreground transition-colors underline underline-offset-4 decoration-border/60 hover:decoration-foreground/40"
                  data-testid={`link-sub-${sub.slug}`}
                >
                  {sub.label}
                </Link>
                {i < group.subcategories.length - 1 && (
                  <span className="text-border/60 mx-2 text-xs">·</span>
                )}
              </span>
            ))}
          </div>

          <Link
            href={`/materials/${group.slug}`}
            className="group mt-2 inline-flex items-center gap-2 text-[11px] md:text-xs uppercase tracking-[0.2em] font-medium hover:text-muted-foreground transition-colors w-fit"
            data-testid={`link-all-${group.slug}-products`}
          >
            Shop All {group.fabric}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

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

  const { data: cottonProducts = [] } = useQuery({
    queryKey: ["hub-cotton"],
    queryFn: () => fetchProductsByFiber("cotton"),
    staleTime: 10 * 60 * 1000,
    select: (d: any[]) => d.filter((p: any) => p.image_url || p.imageUrl).slice(0, 4),
  });

  const { data: linenProducts = [] } = useQuery({
    queryKey: ["hub-linen"],
    queryFn: () => fetchProductsByFiber("linen"),
    staleTime: 10 * 60 * 1000,
    select: (d: any[]) => d.filter((p: any) => p.image_url || p.imageUrl).slice(0, 4),
  });

  const { data: silkProducts = [] } = useQuery({
    queryKey: ["hub-silk"],
    queryFn: () => fetchProductsByFiber("silk"),
    staleTime: 10 * 60 * 1000,
    select: (d: any[]) => d.filter((p: any) => p.image_url || p.imageUrl).slice(0, 4),
  });

  const { data: woolProducts = [] } = useQuery({
    queryKey: ["hub-wool"],
    queryFn: () => fetchProductsByFiber("wool"),
    staleTime: 10 * 60 * 1000,
    select: (d: any[]) => d.filter((p: any) => p.image_url || p.imageUrl).slice(0, 4),
  });

  const { data: cashmereProducts = [] } = useQuery({
    queryKey: ["hub-cashmere"],
    queryFn: () => fetchProductsByFiber("cashmere"),
    staleTime: 10 * 60 * 1000,
    select: (d: any[]) => d.filter((p: any) => p.image_url || p.imageUrl).slice(0, 4),
  });

  const fiberProducts: Record<string, any[]> = {
    cotton: cottonProducts,
    linen: linenProducts,
    silk: silkProducts,
    wool: woolProducts,
    cashmere: cashmereProducts,
  };

  return (
    <div className="flex flex-col gap-0" data-testid="page-fabric-hub">

      <section className="-mx-4 md:-mx-8 bg-foreground text-background">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-20 md:py-28 lg:py-36 flex flex-col gap-6">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif leading-[1.05] max-w-2xl" data-testid="text-hub-headline">
            Shop by<br />Natural Fabric
          </h1>
          <p className="text-[15px] md:text-lg text-background/60 font-light leading-relaxed max-w-lg">
            The easiest way to find luxury fashion made from natural fabrics.
            {productCount > 0 && (
              <span className="block mt-3 text-[13px] md:text-sm text-background/40 uppercase tracking-[0.15em]">
                {productCount.toLocaleString()} verified products · 11,000+ brands
              </span>
            )}
          </p>
        </div>
      </section>

      <section className="-mx-4 md:-mx-8">
        <div className="flex flex-col">
          {FABRIC_HUB.map((group, index) => (
            <FabricSection
              key={group.slug}
              group={group}
              products={fiberProducts[group.slug] || []}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className="-mx-4 md:-mx-8 bg-foreground text-background">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-background/10">
            <Link
              href="/scanner"
              className="group flex flex-col gap-3 p-8 md:p-10 bg-foreground hover:bg-foreground/95 transition-colors"
              data-testid="link-hub-scanner"
            >
              <Search className="w-5 h-5 text-background/40" />
              <span className="text-base md:text-lg font-serif">Scan a Product</span>
              <span className="text-[13px] text-background/50 leading-relaxed">Paste any product URL to instantly check its fabric composition and natural fiber content.</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-background/40 mt-auto pt-4 group-hover:text-background/70 transition-colors flex items-center gap-1.5">
                Try it <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
            <Link
              href="/quiz"
              className="group flex flex-col gap-3 p-8 md:p-10 bg-foreground hover:bg-foreground/95 transition-colors"
              data-testid="link-hub-quiz"
            >
              <Sparkles className="w-5 h-5 text-background/40" />
              <span className="text-base md:text-lg font-serif">Find Your Persona</span>
              <span className="text-[13px] text-background/50 leading-relaxed">Take our 2-minute quiz to discover your fabric persona and get personalized brand recommendations.</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-background/40 mt-auto pt-4 group-hover:text-background/70 transition-colors flex items-center gap-1.5">
                Take the quiz <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
            <Link
              href="/designers"
              className="group flex flex-col gap-3 p-8 md:p-10 bg-foreground hover:bg-foreground/95 transition-colors"
              data-testid="link-hub-directory"
            >
              <ShoppingBag className="w-5 h-5 text-background/40" />
              <span className="text-base md:text-lg font-serif">Brand Directory</span>
              <span className="text-[13px] text-background/50 leading-relaxed">Browse 11,000+ brands ranked by natural fiber quality. Find the best brands for silk, linen, wool and more.</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-background/40 mt-auto pt-4 group-hover:text-background/70 transition-colors flex items-center gap-1.5">
                Browse brands <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="-mx-4 md:-mx-8 px-6 md:px-12 lg:px-16 py-16 md:py-24 text-center flex flex-col items-center gap-5">
        <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Every Composition Verified</p>
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif max-w-xl leading-snug">
          We read every label so you don't have to.
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">
          Every product on INTERTEXE has its fabric composition verified. No guesswork, no marketing language — just real material data.
        </p>
        <Link
          href="/shop"
          className="mt-4 bg-foreground text-background px-10 py-4 uppercase tracking-[0.2em] text-[11px] md:text-xs font-medium hover:bg-foreground/90 transition-colors active:scale-[0.97]"
          data-testid="button-shop-all"
        >
          Shop All Products
        </Link>
      </section>
    </div>
  );
}
