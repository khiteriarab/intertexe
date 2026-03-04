import { Link } from "wouter";
import { ArrowRight, Search, ShoppingBag, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchProductCount } from "@/lib/supabase";
import { useSEO } from "@/hooks/use-seo";

const FABRIC_HUB = [
  {
    fabric: "Cotton",
    slug: "cotton",
    tagline: "Find cotton instead of blends",
    subcategories: [
      { slug: "cotton-dresses", label: "Cotton Dresses" },
      { slug: "cotton-shirts", label: "Cotton Shirts" },
      { slug: "cotton-tops", label: "Cotton Tops" },
      { slug: "cotton-pants", label: "Cotton Pants" },
      { slug: "cotton-knitwear", label: "Cotton Knitwear" },
    ],
  },
  {
    fabric: "Linen",
    slug: "linen",
    tagline: "Find linen instead of viscose",
    subcategories: [
      { slug: "linen-dresses", label: "Linen Dresses" },
      { slug: "linen-tops", label: "Linen Tops" },
      { slug: "linen-shirts", label: "Linen Shirts" },
      { slug: "linen-pants", label: "Linen Pants" },
      { slug: "linen-sets", label: "Linen Sets" },
    ],
  },
  {
    fabric: "Silk",
    slug: "silk",
    tagline: "Find silk instead of polyester",
    subcategories: [
      { slug: "silk-dresses", label: "Silk Dresses" },
      { slug: "silk-tops", label: "Silk Tops" },
      { slug: "silk-blouses", label: "Silk Blouses" },
      { slug: "silk-skirts", label: "Silk Skirts" },
      { slug: "silk-dresses-evening", label: "Silk Evening Dresses" },
    ],
  },
  {
    fabric: "Wool",
    slug: "wool",
    tagline: "Find real wool instead of acrylic",
    subcategories: [
      { slug: "wool-sweaters", label: "Wool Sweaters" },
      { slug: "wool-coats", label: "Wool Coats" },
      { slug: "wool-pants", label: "Wool Trousers" },
    ],
  },
  {
    fabric: "Cashmere",
    slug: "cashmere",
    tagline: "Find genuine cashmere, not blends",
    subcategories: [
      { slug: "cashmere-sweaters", label: "Cashmere Sweaters" },
      { slug: "cashmere-knits", label: "Cashmere Cardigans" },
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
    <div className="flex flex-col gap-0" data-testid="page-fabric-hub">

      <section className="bg-foreground text-background -mx-4 md:-mx-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto py-14 md:py-20 flex flex-col gap-5 md:gap-6">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-background/50">The Fabric Hub</p>
          <h1 className="text-3xl md:text-5xl font-serif leading-tight" data-testid="text-hub-headline">
            Shop by Natural Fabric
          </h1>
          <p className="text-[14px] md:text-lg text-background/70 font-light leading-relaxed max-w-xl">
            The easiest way to shop luxury fashion made from natural fabrics.
            {productCount > 0 && ` ${productCount.toLocaleString()} verified products across 40+ brands.`}
          </p>
          <div className="flex flex-col gap-2 mt-2 max-w-md">
            <div className="flex items-center gap-3 text-background/60 text-sm">
              <span className="text-emerald-400">+</span> Find silk instead of polyester
            </div>
            <div className="flex items-center gap-3 text-background/60 text-sm">
              <span className="text-emerald-400">+</span> Find linen instead of viscose
            </div>
            <div className="flex items-center gap-3 text-background/60 text-sm">
              <span className="text-emerald-400">+</span> Find cotton instead of blends
            </div>
            <div className="flex items-center gap-3 text-background/60 text-sm">
              <span className="text-emerald-400">+</span> Compare luxury brands in one place
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto w-full px-4 py-10 md:py-16">
        <div className="flex flex-col gap-10 md:gap-14">
          {FABRIC_HUB.map((group) => (
              <div key={group.slug} className="flex flex-col gap-4 md:gap-5" data-testid={`hub-section-${group.slug}`}>
                <div className="flex items-end justify-between border-b border-border/40 pb-3">
                  <div className="flex flex-col gap-1">
                    <Link href={`/materials/${group.slug}`} className="group flex items-center gap-2">
                      <h2 className="text-2xl md:text-3xl font-serif group-hover:text-muted-foreground transition-colors">{group.fabric}</h2>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <p className="text-xs md:text-sm text-muted-foreground">{group.tagline}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
                  {group.subcategories.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/materials/${sub.slug}`}
                      className="group flex items-center justify-between px-4 py-3.5 bg-[#FAFAF8] border border-border/30 hover:border-foreground/30 transition-colors active:scale-[0.98]"
                      data-testid={`link-sub-${sub.slug}`}
                    >
                      <span className="text-[12px] md:text-sm">{sub.label}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </Link>
                  ))}
                  <Link
                    href={`/materials/${group.slug}`}
                    className="group flex items-center justify-between px-4 py-3.5 border border-dashed border-border/40 hover:border-foreground/30 transition-colors active:scale-[0.98]"
                    data-testid={`link-all-${group.slug}-products`}
                  >
                    <span className="text-[12px] md:text-sm text-muted-foreground group-hover:text-foreground transition-colors">All {group.fabric}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </Link>
                </div>
              </div>
          ))}
        </div>
      </section>

      <section className="bg-foreground text-background -mx-4 md:-mx-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto py-10 md:py-14 flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-background/50">More Tools</p>
            <h2 className="text-xl md:text-2xl font-serif">Not sure what fabric to look for?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <Link
              href="/scanner"
              className="group flex items-center gap-4 px-5 py-4 border border-background/20 hover:border-background/50 transition-colors"
              data-testid="link-hub-scanner"
            >
              <Search className="w-5 h-5 text-background/60 flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Scan a Product</span>
                <span className="text-[11px] text-background/50">Paste any URL to check its fabric</span>
              </div>
            </Link>
            <Link
              href="/quiz"
              className="group flex items-center gap-4 px-5 py-4 border border-background/20 hover:border-background/50 transition-colors"
              data-testid="link-hub-quiz"
            >
              <Sparkles className="w-5 h-5 text-background/60 flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Take the Quiz</span>
                <span className="text-[11px] text-background/50">Find your fabric persona</span>
              </div>
            </Link>
            <Link
              href="/designers"
              className="group flex items-center gap-4 px-5 py-4 border border-background/20 hover:border-background/50 transition-colors"
              data-testid="link-hub-directory"
            >
              <ShoppingBag className="w-5 h-5 text-background/60 flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Brand Directory</span>
                <span className="text-[11px] text-background/50">Browse 40+ vetted brands</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto w-full px-4 py-10 md:py-14 text-center flex flex-col items-center gap-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Every Composition Verified</p>
        <h2 className="text-xl md:text-2xl font-serif max-w-lg">
          We read every label so you don't have to. Every product on INTERTEXE has its fabric composition verified.
        </h2>
        <Link
          href="/shop"
          className="mt-2 bg-foreground text-background px-8 py-3.5 uppercase tracking-[0.15em] text-xs font-medium hover:bg-foreground/90 transition-colors active:scale-95"
          data-testid="button-shop-all"
        >
          Shop All Products
        </Link>
      </section>
    </div>
  );
}
