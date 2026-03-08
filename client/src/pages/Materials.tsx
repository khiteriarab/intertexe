import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchProductCount, fetchProductsByFiber } from "@/lib/supabase";
import { useSEO } from "@/hooks/use-seo";
import editorialImg3 from "@/assets/images/fashion_editorial_3.jpg";

const FABRICS = [
  {
    fabric: "Cotton",
    slug: "cotton",
    tagline: "The foundation of every wardrobe",
    description: "From crisp poplin shirts to heavyweight denim — breathable, versatile, endlessly wearable.",
    subcategories: ["Dresses", "Shirts", "T-Shirts", "Denim"],
    subcategorySlugs: ["cotton-dresses", "cotton-shirts", "cotton-t-shirts", "cotton-denim"],
  },
  {
    fabric: "Linen",
    slug: "linen",
    tagline: "Light, airy, effortless",
    description: "The fabric that only gets better with age. Relaxed elegance for warm days and coastal evenings.",
    subcategories: ["Dresses", "Pants", "Shirts", "Blazers"],
    subcategorySlugs: ["linen-dresses", "linen-pants", "linen-shirts", "linen-blazers"],
  },
  {
    fabric: "Silk",
    slug: "silk",
    tagline: "Luxurious drape, timeless",
    description: "Nothing moves like silk. The ultimate in luxury — from bias-cut dresses to fluid blouses.",
    subcategories: ["Dresses", "Blouses", "Tops", "Skirts"],
    subcategorySlugs: ["silk-dresses", "silk-blouses", "silk-tops", "silk-skirts"],
  },
  {
    fabric: "Wool",
    slug: "wool",
    tagline: "Warm, structured, seasonless",
    description: "From Italian tailoring to Shetland knits. The fiber that defines shape and lasting quality.",
    subcategories: ["Coats", "Sweaters", "Pants", "Blazers"],
    subcategorySlugs: ["wool-coats", "wool-sweaters", "wool-pants", "wool-blazers"],
  },
  {
    fabric: "Cashmere",
    slug: "cashmere",
    tagline: "The softest fiber in the world",
    description: "Harvested once a year from the undercoat of cashmere goats. The pinnacle of knitwear.",
    subcategories: ["Sweaters", "Scarves", "Cardigans"],
    subcategorySlugs: ["cashmere-sweaters", "cashmere-scarves", "cashmere-cardigans"],
  },
];

const CURATED_IMAGES: Record<string, string> = {
  cotton: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1319334/PRESPA/1319334.1.PRESPA?_s=RAABAB0",
  linen: "https://us.sandro-paris.com/dw/image/v2/BCMW_PRD/on/demandware.static/-/Sites-master-catalog/default/dwd3c61fa4/images/hi-res/Sandro_SFPRO04783-4111_F_1.jpg?sw=800",
  silk: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1319612/PLUTO_DOT/1319612.1.PLUTO_DOT?_s=RAABAB0",
  wool: "https://cdn.shopify.com/s/files/1/1519/7996/files/MARGO-DRESS_BLACK_18121533-200_GHOST_jpg.jpg?v=1757970225",
  cashmere: "https://cdn.shopify.com/s/files/1/0150/1528/files/AB_JACKSON_CARDIGAN_-_MEDIUM_HEATHER_GREY_A-09-10222-MHG1_0040.jpg?v=1753111950",
};

function FabricSection({ fabric, image, index }: { fabric: typeof FABRICS[0]; image: string | null; index: number }) {
  const isReversed = index % 2 === 1;
  const imgSrc = image || CURATED_IMAGES[fabric.slug];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-0 ${index > 0 ? "" : ""}`} data-testid={`hub-section-${fabric.slug}`}>
      <Link
        href={`/materials/${fabric.slug}`}
        className={`group relative overflow-hidden bg-[#EDECE8] block ${isReversed ? "md:order-2" : ""}`}
      >
        <div className="aspect-[3/4] md:aspect-auto md:h-full md:min-h-[520px] relative">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={`${fabric.fabric} clothing`}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-1000"
              loading={index < 2 ? "eager" : "lazy"}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-[#E8E4DE] to-[#D5CFC4]" />
          )}
        </div>
      </Link>

      <div className={`flex flex-col justify-center px-6 py-10 md:px-14 md:py-16 lg:px-20 ${isReversed ? "md:order-1" : ""}`}>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3 md:mb-4">
          {fabric.tagline}
        </p>
        <h2 className="text-3xl md:text-5xl font-serif mb-4 md:mb-6 leading-[1.1]">
          {fabric.fabric}
        </h2>
        <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed mb-8 md:mb-10 max-w-md">
          {fabric.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-8 md:mb-10">
          {fabric.subcategories.map((sub, i) => (
            <Link
              key={sub}
              href={`/materials/${fabric.subcategorySlugs[i]}`}
              className="px-4 py-2 border border-border/50 text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
              data-testid={`link-sub-${fabric.subcategorySlugs[i]}`}
            >
              {sub}
            </Link>
          ))}
        </div>

        <Link
          href={`/materials/${fabric.slug}`}
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium hover:gap-3 transition-all group/link w-fit"
          data-testid={`link-shop-${fabric.slug}`}
        >
          Shop {fabric.fabric} <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
        </Link>
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

  const { data: cottonImg = null } = useQuery({
    queryKey: ["hub-img-cotton"],
    queryFn: () => fetchProductsByFiber("cotton"),
    staleTime: 30 * 60 * 1000,
    select: (d: any[]) => {
      const p = d.find((p: any) => p.image_url || p.imageUrl);
      return p ? (p.image_url || p.imageUrl) : null;
    },
  });
  const { data: linenImg = null } = useQuery({
    queryKey: ["hub-img-linen"],
    queryFn: () => fetchProductsByFiber("linen"),
    staleTime: 30 * 60 * 1000,
    select: (d: any[]) => {
      const p = d.find((p: any) => p.image_url || p.imageUrl);
      return p ? (p.image_url || p.imageUrl) : null;
    },
  });
  const { data: silkImg = null } = useQuery({
    queryKey: ["hub-img-silk"],
    queryFn: () => fetchProductsByFiber("silk"),
    staleTime: 30 * 60 * 1000,
    select: (d: any[]) => {
      const p = d.find((p: any) => p.image_url || p.imageUrl);
      return p ? (p.image_url || p.imageUrl) : null;
    },
  });
  const { data: woolImg = null } = useQuery({
    queryKey: ["hub-img-wool"],
    queryFn: () => fetchProductsByFiber("wool"),
    staleTime: 30 * 60 * 1000,
    select: (d: any[]) => {
      const p = d.find((p: any) => p.image_url || p.imageUrl);
      return p ? (p.image_url || p.imageUrl) : null;
    },
  });
  const { data: cashmereImg = null } = useQuery({
    queryKey: ["hub-img-cashmere"],
    queryFn: () => fetchProductsByFiber("cashmere"),
    staleTime: 30 * 60 * 1000,
    select: (d: any[]) => {
      const p = d.find((p: any) => p.image_url || p.imageUrl);
      return p ? (p.image_url || p.imageUrl) : null;
    },
  });

  const images: Record<string, string | null> = {
    cotton: cottonImg,
    linen: linenImg,
    silk: silkImg,
    wool: woolImg,
    cashmere: cashmereImg,
  };

  return (
    <div className="flex flex-col" data-testid="page-fabric-hub">

      <section className="relative -mx-4 md:-mx-8 overflow-hidden">
        <div className="relative h-[50vh] md:h-[65vh] min-h-[380px]">
          <img
            src={editorialImg3}
            alt="Natural fabric fashion"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-5 md:px-10 pb-10 md:pb-14">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-white/60 mb-3">
              {productCount > 0 ? `${productCount.toLocaleString()} Verified Products` : "17,553 Verified Products"}
            </p>
            <h1 className="text-3xl md:text-6xl font-serif text-white mb-3 md:mb-4 leading-[1.1]" data-testid="text-hub-headline">
              Shop by Fabric
            </h1>
            <p className="text-sm md:text-lg text-white/70 max-w-lg leading-relaxed font-light">
              The world's best fashion, organized by what it's made of. Every composition verified.
            </p>
          </div>
        </div>
      </section>

      <section className="-mx-4 md:-mx-8">
        {FABRICS.map((fabric, index) => (
          <FabricSection
            key={fabric.slug}
            fabric={fabric}
            image={images[fabric.slug]}
            index={index}
          />
        ))}
      </section>

      <section className="-mx-4 md:-mx-8 bg-[#111] text-white">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <Link
            href="/scanner"
            className="group flex flex-col gap-3 p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10 hover:bg-white/5 transition-colors"
            data-testid="link-hub-scanner"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">01</span>
            <span className="text-lg md:text-xl font-serif">Scan Any Product</span>
            <span className="text-[13px] text-white/50 leading-relaxed">Paste any URL to instantly check fabric composition and natural fiber percentage.</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 flex items-center gap-1.5 mt-2 group-hover:gap-2.5 transition-all">
              Try Scanner <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
          <Link
            href="/quiz"
            className="group flex flex-col gap-3 p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/10 hover:bg-white/5 transition-colors"
            data-testid="link-hub-quiz"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">02</span>
            <span className="text-lg md:text-xl font-serif">Find Your Fabric Persona</span>
            <span className="text-[13px] text-white/50 leading-relaxed">Take our 2-minute quiz and discover which natural fibers match your lifestyle.</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 flex items-center gap-1.5 mt-2 group-hover:gap-2.5 transition-all">
              Take Quiz <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
          <Link
            href="/designers"
            className="group flex flex-col gap-3 p-8 md:p-12 hover:bg-white/5 transition-colors"
            data-testid="link-hub-directory"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">03</span>
            <span className="text-lg md:text-xl font-serif">Brand Directory</span>
            <span className="text-[13px] text-white/50 leading-relaxed">Browse 11,000+ brands ranked by natural fiber quality. Find your next favourite.</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 flex items-center gap-1.5 mt-2 group-hover:gap-2.5 transition-all">
              Explore Brands <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </section>

      <section className="py-16 md:py-24 text-center flex flex-col items-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Every Label Checked</p>
        <h2 className="text-2xl md:text-4xl font-serif mb-4 leading-tight max-w-lg">
          We read every label so you don't have to.
        </h2>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
          Our team verifies every composition — fiber by fiber, product by product. No guesswork, no greenwashing.
        </p>
        <Link
          href="/shop"
          className="bg-foreground text-background px-10 py-3.5 uppercase tracking-[0.15em] text-[11px] font-medium hover:bg-foreground/90 transition-colors active:scale-[0.97] inline-block"
          data-testid="button-shop-all"
        >
          Shop All Products
        </Link>
      </section>
    </div>
  );
}
