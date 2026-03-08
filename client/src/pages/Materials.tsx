import { Link } from "wouter";
import { ArrowRight, Search, Sparkles, ShoppingBag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchProductCount, fetchProductsByFiber } from "@/lib/supabase";
import { useSEO } from "@/hooks/use-seo";

const FABRICS = [
  { fabric: "Cotton", slug: "cotton", description: "Breathable, versatile, everyday" },
  { fabric: "Linen", slug: "linen", description: "Light, airy, effortless" },
  { fabric: "Silk", slug: "silk", description: "Luxurious drape, timeless" },
  { fabric: "Wool", slug: "wool", description: "Warm, structured, seasonless" },
  { fabric: "Cashmere", slug: "cashmere", description: "The softest fiber" },
];

function FabricCard({ fabric, image, large }: { fabric: typeof FABRICS[0]; image: string | null; large?: boolean }) {
  return (
    <Link
      href={`/materials/${fabric.slug}`}
      className={`group relative overflow-hidden bg-[#EDECE8] block ${large ? "md:col-span-1 md:row-span-2" : ""}`}
      data-testid={`hub-section-${fabric.slug}`}
    >
      <div className={`${large ? "aspect-[3/4]" : "aspect-[4/5]"} relative`}>
        {image ? (
          <img
            src={image}
            alt={fabric.fabric}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#E8E4DE] to-[#D5CFC4]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
          <h2 className="text-white text-xl md:text-2xl font-serif mb-0.5">{fabric.fabric}</h2>
          <p className="text-white/50 text-[11px] mb-2">{fabric.description}</p>
          <span className="text-white/70 text-[10px] md:text-[11px] uppercase tracking-[0.15em] flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
            Shop {fabric.fabric} <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
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

      <div className="pt-2 pb-6 md:pt-4 md:pb-8">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-xl md:text-2xl font-serif" data-testid="text-hub-headline">Shop by Fabric</h1>
          {productCount > 0 && (
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {productCount.toLocaleString()} products
            </span>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground">Find silk, linen, cotton, wool and cashmere — every composition verified.</p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="col-span-2 md:col-span-1 md:row-span-2">
          <FabricCard fabric={FABRICS[0]} image={images.cotton} large />
        </div>
        <FabricCard fabric={FABRICS[1]} image={images.linen} />
        <FabricCard fabric={FABRICS[2]} image={images.silk} />
        <FabricCard fabric={FABRICS[3]} image={images.wool} />
        <FabricCard fabric={FABRICS[4]} image={images.cashmere} />
      </section>

      <section className="mt-12 md:mt-16 border-t border-border/30 pt-10 md:pt-14">
        <div className="text-center mb-8 md:mb-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Every Composition Verified</p>
          <h2 className="text-xl md:text-2xl font-serif">We read every label so you don't have to.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border/30">
          <Link
            href="/scanner"
            className="group flex items-start gap-4 p-6 md:p-8 border-b md:border-b-0 md:border-r border-border/30 hover:bg-[#f5f5f3] transition-colors"
            data-testid="link-hub-scanner"
          >
            <Search className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] md:text-sm font-medium">Scan a Product</span>
              <span className="text-[12px] text-muted-foreground leading-relaxed">Paste any product URL to instantly check its fabric composition and natural fiber percentage.</span>
            </div>
          </Link>
          <Link
            href="/quiz"
            className="group flex items-start gap-4 p-6 md:p-8 border-b md:border-b-0 md:border-r border-border/30 hover:bg-[#f5f5f3] transition-colors"
            data-testid="link-hub-quiz"
          >
            <Sparkles className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] md:text-sm font-medium">Take the Quiz</span>
              <span className="text-[12px] text-muted-foreground leading-relaxed">Discover your fabric persona in 2 minutes and get personalized brand recommendations.</span>
            </div>
          </Link>
          <Link
            href="/designers"
            className="group flex items-start gap-4 p-6 md:p-8 hover:bg-[#f5f5f3] transition-colors"
            data-testid="link-hub-directory"
          >
            <ShoppingBag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] md:text-sm font-medium">Brand Directory</span>
              <span className="text-[12px] text-muted-foreground leading-relaxed">Browse 11,000+ brands ranked by natural fiber quality. Find your next favourite brand.</span>
            </div>
          </Link>
        </div>

        <div className="text-center mt-10 md:mt-14 pb-4">
          <Link
            href="/shop"
            className="bg-foreground text-background px-10 py-3.5 uppercase tracking-[0.15em] text-[11px] font-medium hover:bg-foreground/90 transition-colors active:scale-[0.97] inline-block"
            data-testid="button-shop-all"
          >
            Shop All Products
          </Link>
        </div>
      </section>
    </div>
  );
}
