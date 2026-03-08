import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Leaf, Droplets, Shield, Sparkles, CheckCircle2, XCircle, AlertTriangle, DollarSign, ShoppingBag, ExternalLink, Heart, Filter, ChevronDown } from "lucide-react";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners, fetchProductsByFiberAndCategory } from "@/lib/supabase";
import { MATERIALS } from "@/lib/data";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { filterToCuratedBrands } from "@/lib/curated-brands";
import { BrandImage } from "@/components/BrandImage";
import { useSEO } from "@/hooks/use-seo";
import { trackAffiliateRedirect } from "@/lib/analytics";

const FIBER_QUERIES: Record<string, string[]> = {
  cotton: ["cotton"],
  silk: ["silk"],
  linen: ["linen", "flax"],
  wool: ["wool", "merino"],
  cashmere: ["cashmere"],
  denim: ["cotton", "denim"],
  alpaca: ["alpaca"],
  "tencel-modal": ["tencel", "lyocell", "modal"],
  "viscose-rayon": ["viscose", "rayon"],
};

const FABRIC_PAGES = [
  { slug: "silk", label: "Silk", emoji: "✦" },
  { slug: "cotton", label: "Cotton", emoji: "✦" },
  { slug: "linen", label: "Linen", emoji: "✦" },
  { slug: "wool", label: "Wool", emoji: "✦" },
  { slug: "cashmere", label: "Cashmere", emoji: "✦" },
];

const CATEGORY_FILTERS = [
  { key: "all", label: "All" },
  { key: "dresses", label: "Dresses", keywords: ["dress", "gown", "midi", "maxi"] },
  { key: "tops", label: "Tops", keywords: ["top", "blouse", "shirt", "tee", "camisole", "tank", "bodysuit"] },
  { key: "knitwear", label: "Knitwear", keywords: ["sweater", "knit", "cardigan", "pullover", "jumper"] },
  { key: "bottoms", label: "Pants & Skirts", keywords: ["pant", "trouser", "skirt", "jean", "short", "wide leg"] },
  { key: "outerwear", label: "Outerwear", keywords: ["jacket", "coat", "blazer", "trench"] },
];

const SEO_CONTENT: Record<string, { title: string; h1: string; intro: string; metaDesc: string }> = {
  silk: {
    title: "Best Silk Clothing 2026 — Verified Silk Dresses, Tops & More",
    h1: "Shop Verified Silk Clothing",
    intro: "Every silk piece verified by INTERTEXE. Real silk composition percentages, no guesswork. Browse silk dresses, silk tops, silk blouses, and more from the best brands — all checked for natural fiber content.",
    metaDesc: "Shop the best silk dresses, silk tops, silk blouses and silk clothing in 2026. Every product verified for real silk content. Compare silk compositions across 11,000+ luxury and contemporary brands.",
  },
  cotton: {
    title: "Best Cotton Clothing 2026 — Verified Cotton Tops, Dresses & More",
    h1: "Shop Verified Cotton Clothing",
    intro: "Premium cotton pieces from brands that prioritize material quality. Every cotton composition verified — 100% cotton, organic cotton, and high-cotton blends from brands that don't cut corners.",
    metaDesc: "Shop the best cotton clothing in 2026. Verified cotton dresses, cotton tops, cotton shirts and more. Compare cotton compositions across 11,000+ brands. No synthetic surprises.",
  },
  linen: {
    title: "Best Linen Clothing 2026 — Verified Linen Dresses, Tops & More",
    h1: "Shop Verified Linen Clothing",
    intro: "The best linen pieces for 2026, verified for actual linen content. Pure linen dresses, linen tops, linen pants, and linen blends from brands known for quality natural fibers.",
    metaDesc: "Shop the best linen dresses, linen tops, linen pants and linen clothing in 2026. Every product verified for real linen/flax content across 11,000+ curated brands.",
  },
  wool: {
    title: "Best Wool Clothing 2026 — Verified Wool Sweaters, Coats & More",
    h1: "Shop Verified Wool Clothing",
    intro: "Premium wool and merino pieces from brands that use real wool — not synthetic imitations. Wool sweaters, wool coats, wool trousers, all verified for natural fiber content.",
    metaDesc: "Shop the best wool sweaters, wool coats, merino wool clothing in 2026. Every product verified for real wool content. Compare compositions across 11,000+ brands.",
  },
  cashmere: {
    title: "Best Cashmere Clothing 2026 — Verified Cashmere Sweaters & More",
    h1: "Shop Verified Cashmere Clothing",
    intro: "Luxury cashmere from brands that use genuine cashmere — not 5% cashmere blends marketed as 'cashmere.' Every piece verified for actual cashmere content. Cashmere sweaters, cashmere scarves, and more.",
    metaDesc: "Shop the best cashmere sweaters, cashmere knits, and cashmere clothing in 2026. Verified for real cashmere content. Compare compositions across luxury and contemporary brands.",
  },
};

function FabricProductCard({ product, index }: { product: any; index: number }) {
  const { toggle, isFavorited } = useProductFavorites();
  const productId = String(product.id);
  const saved = isFavorited(productId);
  const brandName = product.brand_name || product.brandName;
  const imageUrl = product.image_url || product.imageUrl;
  const naturalPercent = product.natural_fiber_percent || product.naturalFiberPercent;

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackAffiliateRedirect(brandName, product.url)}
      className="group bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col"
      data-testid={`card-fabric-product-${index}`}
    >
      <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={`${product.name} by ${brandName}`} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="w-8 h-8 opacity-30" />
          </div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId, brandName, product.price); }}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors z-10"
          data-testid={`button-heart-fabric-${index}`}
        >
          <Heart className={`w-4 h-4 transition-colors ${saved ? "fill-red-500 text-red-500" : "text-foreground/60 hover:text-foreground"}`} />
        </button>
        {naturalPercent && (
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm ${naturalPercent >= 90 ? "bg-emerald-900/90 text-emerald-100" : naturalPercent >= 70 ? "bg-emerald-800/80 text-emerald-100" : "bg-amber-800/80 text-amber-100"}`}>
              {naturalPercent}% natural
            </span>
          </div>
        )}
      </div>
      <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{brandName}</span>
        <h3 className="text-xs md:text-sm leading-snug font-medium line-clamp-2">{product.name}</h3>
        <p className="text-[10px] text-muted-foreground line-clamp-1">{product.composition}</p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-sm font-medium">{product.price}</span>
          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </a>
  );
}

export default function MaterialDetail() {
  const params = useParams<{ slug: string }>();
  const material = MATERIALS.find(m => m.slug === params.slug);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const fiberQueries = params.slug ? FIBER_QUERIES[params.slug] || [] : [];
  const seo = params.slug ? SEO_CONTENT[params.slug] : null;

  useSEO({
    title: seo?.title || (material ? `${material.name} Clothing — Verified Products | INTERTEXE` : undefined),
    description: seo?.metaDesc || (material ? `Shop verified ${material.name.toLowerCase()} clothing. Every product checked for real ${material.name.toLowerCase()} content.` : undefined),
    path: params.slug ? `/materials/${params.slug}` : undefined,
  });

  const { data: designers = [], isLoading } = useQuery({
    queryKey: ["designers-material", params.slug],
    queryFn: () => fetchDesigners(undefined, 200),
    staleTime: 10 * 60 * 1000,
  });

  const { data: fabricProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["fabric-products", params.slug],
    queryFn: async () => {
      const allProducts: any[] = [];
      for (const fiber of fiberQueries) {
        const results = await fetchProductsByFiberAndCategory(fiber);
        allProducts.push(...results);
      }
      const seen = new Set<string>();
      return allProducts.filter((p) => {
        const id = p.product_id || p.productId;
        if (seen.has(id)) return false;
        if (!(p.image_url || p.imageUrl)) return false;
        seen.add(id);
        return true;
      });
    },
    enabled: fiberQueries.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!material || fabricProducts.length === 0) return;
    const itemListJsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: seo?.h1 || `${material.name} Clothing`,
      description: seo?.metaDesc || `Verified ${material.name.toLowerCase()} clothing from top brands.`,
      url: `https://www.intertexe.com/materials/${params.slug}`,
      numberOfItems: fabricProducts.length,
      itemListElement: fabricProducts.slice(0, 50).map((product: any, index: number) => ({
        "@type": "ListItem",
        position: index + 1,
        name: product.name,
        url: product.url,
      })),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-jsonld", "itemlist");
    script.textContent = JSON.stringify(itemListJsonLd);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [material, fabricProducts, params.slug, seo]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return fabricProducts;
    const filter = CATEGORY_FILTERS.find(f => f.key === activeCategory);
    if (!filter || !filter.keywords) return fabricProducts;
    return fabricProducts.filter((p: any) => {
      const name = (p.name || "").toLowerCase();
      return filter.keywords!.some(kw => name.includes(kw));
    });
  }, [fabricProducts, activeCategory]);

  const displayProducts = showAll ? filteredProducts : filteredProducts.slice(0, 24);
  const brandCount = new Set(filteredProducts.map((p: any) => p.brand_slug || p.brandSlug)).size;

  if (!material) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-6">
        <h1 className="text-3xl font-serif">Material Not Found</h1>
        <Link href="/materials" className="text-xs uppercase tracking-widest border-b border-foreground pb-1">
          Back to Materials
        </Link>
      </div>
    );
  }

  const enrichedDesigners = (designers as any[]).map((d: any) => {
    if (d.naturalFiberPercent != null) return d;
    const score = getCuratedScore(d.name);
    return score != null ? { ...d, naturalFiberPercent: score } : d;
  });

  const scoredRelated = enrichedDesigners
    .filter((d: any) => {
      if (d.naturalFiberPercent == null) return false;
      if (material.category === 'synthetic') return true;
      return d.naturalFiberPercent > 70;
    })
    .sort((a: any, b: any) => (b.naturalFiberPercent || 0) - (a.naturalFiberPercent || 0));

  const relatedDesigners = scoredRelated.length > 0
    ? scoredRelated.slice(0, 8)
    : filterToCuratedBrands(enrichedDesigners as any[]).slice(0, 8);

  const otherFabrics = FABRIC_PAGES.filter(f => f.slug !== params.slug);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.intertexe.com/" },
      { "@type": "ListItem", position: 2, name: "Materials", item: "https://www.intertexe.com/materials" },
      { "@type": "ListItem", position: 3, name: material.name },
    ],
  };

  return (
    <div className="flex flex-col gap-0" data-testid={`page-material-${material.slug}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <section className="pt-8 md:pt-14 pb-6 md:pb-8 max-w-5xl mx-auto w-full px-4">
        <Link href="/materials" className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors active:scale-95 self-start py-1 mb-6" data-testid="link-back-materials">
          <ArrowLeft className="w-3.5 h-3.5" /> All Materials
        </Link>
        <h1 className="text-3xl md:text-5xl font-serif leading-tight mb-3" data-testid="text-material-name">
          {seo?.h1 || `Shop ${material.name}`}
        </h1>
        <p className="text-[13px] md:text-base text-muted-foreground leading-relaxed max-w-2xl">
          {seo?.intro || material.description}
        </p>
      </section>

      <section className="bg-[#FAFAF8] border-y border-border/30">
        <div className="max-w-5xl mx-auto w-full px-4 py-4 md:py-5 flex items-center gap-3 overflow-x-auto no-scrollbar">
          {CATEGORY_FILTERS.map(cat => {
            const count = cat.key === "all" ? fabricProducts.length : fabricProducts.filter((p: any) => {
              const name = (p.name || "").toLowerCase();
              return cat.keywords!.some(kw => name.includes(kw));
            }).length;
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); setShowAll(false); }}
                className={`flex-shrink-0 px-4 py-2 text-[11px] uppercase tracking-[0.12em] font-medium transition-colors ${activeCategory === cat.key ? "bg-[#111] text-white" : "bg-white border border-neutral-200 text-foreground/70 hover:border-neutral-400"}`}
                data-testid={`filter-${cat.key}`}
              >
                {cat.label} {count > 0 && <span className="ml-1 text-[9px] opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full px-4 py-8 md:py-10" data-testid="section-shop-fabric">
        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-secondary/50 animate-pulse flex flex-col">
                <div className="aspect-[3/4]" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 bg-secondary/80 w-1/3" />
                  <div className="h-4 bg-secondary/60 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">No {material.name.toLowerCase()} {activeCategory !== "all" ? CATEGORY_FILTERS.find(f => f.key === activeCategory)?.label.toLowerCase() : "products"} found.</p>
            <button onClick={() => setActiveCategory("all")} className="mt-3 text-[11px] uppercase tracking-[0.12em] underline underline-offset-4 text-muted-foreground hover:text-foreground">
              View all {material.name.toLowerCase()}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[12px] text-muted-foreground">
                {filteredProducts.length} verified {material.name.toLowerCase()} {activeCategory !== "all" ? CATEGORY_FILTERS.find(f => f.key === activeCategory)?.label.toLowerCase() : "pieces"} from {brandCount} brands
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {displayProducts.map((product: any, index: number) => (
                <FabricProductCard key={product.product_id || product.productId || index} product={product} index={index} />
              ))}
            </div>
            {!showAll && filteredProducts.length > 24 && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setShowAll(true)}
                  className="px-8 py-3 border border-foreground text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-foreground hover:text-background transition-colors"
                  data-testid="button-show-all"
                >
                  Show all {filteredProducts.length} {material.name.toLowerCase()} pieces
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="bg-foreground text-background" data-testid="section-buying-rules">
        <div className="max-w-5xl mx-auto w-full px-4 py-10 md:py-14 flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-background/50">The INTERTEXE Buying Guide</p>
            <h2 className="text-2xl md:text-3xl font-serif">How to Buy {material.name} — What to Look For</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="flex flex-col gap-3" data-testid="section-look-for">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-background/70" />
                <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Look For</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {material.buyingRules.lookFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-background/80">
                    <span className="w-1 h-1 bg-background/40 rounded-full mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3" data-testid="section-avoid">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-background/70" />
                <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Avoid</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {material.buyingRules.avoid.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-background/80">
                    <span className="w-1 h-1 bg-background/40 rounded-full mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-4 border-t border-background/10" data-testid="section-red-flags">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-background/70" />
              <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Red Flags</h3>
            </div>
            <ul className="flex flex-col gap-2">
              {material.buyingRules.redFlags.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-background/80">
                  <span className="w-1 h-1 bg-background/40 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2 pt-4 border-t border-background/10" data-testid="section-price-guidance">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-background/70" />
              <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Price Guidance</h3>
            </div>
            <p className="text-sm text-background/80 leading-relaxed">{material.buyingRules.priceGuidance}</p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full px-4 py-10 md:py-14 flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">INTERTEXE Approved</p>
          <h2 className="text-2xl md:text-3xl font-serif">Best Brands for {material.name}</h2>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="aspect-[3/4] bg-secondary" />)}
          </div>
        ) : relatedDesigners.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border/60 bg-secondary/20">
            <p className="text-muted-foreground text-sm">No designers found for this material yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-6">
            {relatedDesigners.map((designer: any) => {
              const dTier = getQualityTier(designer.naturalFiberPercent);
              return (
                <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-2.5 active:scale-[0.98] transition-transform" data-testid={`card-designer-${designer.slug}`}>
                  <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                    <BrandImage name={designer.name} className="absolute inset-0 w-full h-full" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 md:p-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                      <span className={`px-2 py-0.5 text-[8px] md:text-[9px] uppercase tracking-[0.1em] font-medium ${getTierColor(dTier.tier)}`}>
                        {dTier.shortLabel}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-serif group-hover:text-muted-foreground transition-colors leading-tight">{designer.name}</h3>
                    {designer.naturalFiberPercent != null && (
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                        {designer.naturalFiberPercent}% Natural
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-y border-border/40">
        <div className="max-w-5xl mx-auto w-full px-4 py-8 md:py-12 flex flex-col gap-6 md:gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-foreground/60" />
                <h3 className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">About {material.name}</h3>
              </div>
              <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{material.origin}</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-foreground/60" />
                <h3 className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Key Characteristics</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {material.characteristics.map(c => (
                  <span key={c} className="px-3 py-2 border border-border/60 text-xs uppercase tracking-widest">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-foreground/60" />
                <h3 className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Care Instructions</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {material.careInstructions.map((inst, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <span className="w-1 h-1 bg-foreground/40 rounded-full mt-2 flex-shrink-0" />
                    {inst}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-foreground/60" />
                <h3 className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Sustainability</h3>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{material.sustainability}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#FAFAF8]">
        <div className="max-w-5xl mx-auto w-full px-4 py-8 md:py-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Shop by Fabric</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {otherFabrics.map(f => (
              <Link
                key={f.slug}
                href={`/materials/${f.slug}`}
                className="group flex items-center justify-between p-4 md:p-5 bg-white border border-neutral-200 hover:border-neutral-400 transition-colors"
                data-testid={`link-fabric-${f.slug}`}
              >
                <span className="text-sm font-serif">{f.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full px-4 py-8 md:py-10">
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/scanner" className="border border-foreground px-6 py-3 uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors active:scale-95 text-center flex items-center justify-center gap-2" data-testid="link-scanner">
            <Sparkles className="w-3.5 h-3.5" /> Scan a Product
          </Link>
          <Link href="/quiz" className="bg-foreground text-background px-6 py-3 uppercase tracking-widest text-xs hover:bg-foreground/90 transition-colors active:scale-95 text-center" data-testid="link-take-quiz-material">
            Find My Designers
          </Link>
          <Link href="/shop" className="border border-border/40 px-6 py-3 uppercase tracking-widest text-xs hover:border-foreground transition-colors active:scale-95 text-center" data-testid="link-shop-all">
            Shop All Products
          </Link>
        </div>
      </section>
    </div>
  );
}
