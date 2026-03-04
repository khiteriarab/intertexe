import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchProductCount } from "@/lib/supabase";
import { useSEO } from "@/hooks/use-seo";

const FABRIC_HUB = [
  {
    fabric: "Cotton",
    slug: "cotton",
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
    subcategories: [
      { slug: "wool-sweaters", label: "Sweaters" },
      { slug: "wool-coats", label: "Coats" },
      { slug: "wool-pants", label: "Trousers" },
    ],
  },
  {
    fabric: "Cashmere",
    slug: "cashmere",
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

      <div className="flex items-center justify-between py-5 md:py-6 border-b border-border/40">
        <h1 className="text-sm md:text-base font-serif" data-testid="text-hub-headline">Shop by Fabric</h1>
        {productCount > 0 && (
          <span className="text-[10px] md:text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            {productCount.toLocaleString()} verified products
          </span>
        )}
      </div>

      <section className="-mx-4 md:-mx-8">
        {FABRIC_HUB.map((group) => (
          <div
            key={group.slug}
            className="border-b border-border/40"
            data-testid={`hub-section-${group.slug}`}
          >
            <Link
              href={`/materials/${group.slug}`}
              className="group flex items-center justify-between px-4 md:px-8 py-8 md:py-12 hover:bg-[#f5f5f3] transition-colors duration-300"
            >
              <h2
                className="text-[28px] md:text-[48px] lg:text-[56px] font-serif leading-[1] tracking-[-0.01em]"
                data-testid={`text-fabric-${group.slug}`}
              >
                {group.fabric}
              </h2>
              <div className="w-10 h-10 md:w-12 md:h-12 border border-border/50 group-hover:border-foreground group-hover:bg-foreground group-hover:text-background flex items-center justify-center transition-all duration-300 flex-shrink-0">
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </Link>

            <div className="px-4 md:px-8 pb-6 md:pb-10 flex flex-wrap gap-x-5 md:gap-x-8 gap-y-1">
              {group.subcategories.map((sub) => (
                <Link
                  key={sub.slug}
                  href={`/materials/${sub.slug}`}
                  className="text-[13px] md:text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 border-b border-transparent hover:border-foreground/30"
                  data-testid={`link-sub-${sub.slug}`}
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="-mx-4 md:-mx-8 bg-foreground text-background mt-0">
        <div className="grid grid-cols-3 divide-x divide-background/10">
          <Link href="/scanner" className="group flex flex-col items-center gap-2 py-8 md:py-12 px-3 text-center hover:bg-background/5 transition-colors" data-testid="link-hub-scanner">
            <span className="text-[11px] md:text-sm font-serif">Scan</span>
            <span className="text-[9px] md:text-[10px] text-background/40 uppercase tracking-[0.1em] hidden md:block">Check any URL</span>
          </Link>
          <Link href="/quiz" className="group flex flex-col items-center gap-2 py-8 md:py-12 px-3 text-center hover:bg-background/5 transition-colors" data-testid="link-hub-quiz">
            <span className="text-[11px] md:text-sm font-serif">Quiz</span>
            <span className="text-[9px] md:text-[10px] text-background/40 uppercase tracking-[0.1em] hidden md:block">Find your persona</span>
          </Link>
          <Link href="/designers" className="group flex flex-col items-center gap-2 py-8 md:py-12 px-3 text-center hover:bg-background/5 transition-colors" data-testid="link-hub-directory">
            <span className="text-[11px] md:text-sm font-serif">Directory</span>
            <span className="text-[9px] md:text-[10px] text-background/40 uppercase tracking-[0.1em] hidden md:block">11,000+ brands</span>
          </Link>
        </div>
      </section>

    </div>
  );
}
