import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, ShoppingBag, ExternalLink, Heart, CheckCircle2, XCircle, AlertTriangle, Leaf } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import { fetchProductsByFiberAndCategory, fetchProductCount } from "@/lib/supabase";
import { useSEO } from "@/hooks/use-seo";
import { trackAffiliateRedirect } from "@/lib/analytics";

interface FabricCategoryConfig {
  slug: string;
  path: string;
  fiber: string;
  fiberQueries: string[];
  seoTitle: string;
  h1: string;
  metaDescription: string;
  intro: string;
  buyingGuide: {
    lookFor: string[];
    avoid: string[];
    redFlags: string[];
  };
  relatedCategories: { path: string; label: string }[];
}

const FABRIC_CATEGORIES: Record<string, FabricCategoryConfig> = {
  "linen-clothing": {
    slug: "linen-clothing",
    path: "/linen-clothing",
    fiber: "Linen",
    fiberQueries: ["linen", "flax"],
    seoTitle: "Linen Clothing for Women | INTERTEXE",
    h1: "Linen Clothing",
    metaDescription: "Shop verified linen clothing for women. Every product checked for real linen content — dresses, tops, pants, and more from brands that use genuine linen, not synthetic imitations. Browse 17,000+ verified pieces.",
    intro: "Linen is the ultimate warm-weather fabric — breathable, naturally cooling, and it only gets softer with every wash. But most brands cut it with polyester. We verified every label to find the ones that don't.",
    buyingGuide: {
      lookFor: [
        "100% linen or linen-dominant blends (70%+ linen)",
        "European flax — Belgian, French, or Irish linen is the gold standard",
        "Pre-washed or garment-dyed linen for minimal shrinkage",
        "Heavier weight (170–250 GSM) for structure and opacity",
      ],
      avoid: [
        "Linen/polyester blends — defeats the purpose of linen's breathability",
        "\"Linen look\" or \"linen style\" fabrics — always synthetic",
        "Over-processed linen that feels papery or stiff",
      ],
      redFlags: [
        "Linen that doesn't wrinkle at all — it's treated with chemicals or blended",
        "Very low prices — real linen is labor-intensive to produce",
        "\"Ramie\" sold as linen — similar but inferior fiber",
      ],
    },
    relatedCategories: [
      { path: "/materials/linen-dresses", label: "Linen Dresses" },
      { path: "/materials/linen-tops", label: "Linen Tops" },
      { path: "/materials/linen-pants", label: "Linen Pants" },
      { path: "/materials/linen-shirts", label: "Linen Shirts" },
      { path: "/materials/linen-sets", label: "Linen Sets" },
    ],
  },
  "silk-clothing": {
    slug: "silk-clothing",
    path: "/silk-clothing",
    fiber: "Silk",
    fiberQueries: ["silk"],
    seoTitle: "Silk Clothing for Women | INTERTEXE",
    h1: "Silk Clothing",
    metaDescription: "Shop verified silk clothing for women. Real silk dresses, silk tops, silk blouses, and silk skirts — every product checked for genuine silk content. No polyester satin masquerading as luxury.",
    intro: "Real silk has a distinct, cool-to-the-touch feel that no synthetic can replicate. It's naturally temperature-regulating, hypoallergenic, and has a luminous drape that polyester satin will never match. We verified every composition.",
    buyingGuide: {
      lookFor: [
        "100% mulberry silk — the highest quality silk fiber",
        "Momme weight listed (19mm+ for clothing, 22mm+ for heavier drapes)",
        "Silk charmeuse for dressy drape, crepe de chine for everyday",
        "Grade 6A silk for the finest hand-feel",
      ],
      avoid: [
        "\"Silky\" or \"silk-feel\" fabrics — this means polyester",
        "\"Satin\" without specifying silk — usually polyester satin",
        "Art silk (artificial silk) — it's viscose",
      ],
      redFlags: [
        "Unusually low prices for silk garments — under $80 for a silk top",
        "Shiny but plasticky hand-feel — real silk has a subtle luster",
        "\"Satin\" listed as fiber content — satin is a weave, not a fiber",
      ],
    },
    relatedCategories: [
      { path: "/materials/silk-dresses", label: "Silk Dresses" },
      { path: "/materials/silk-tops", label: "Silk Tops" },
      { path: "/materials/silk-blouses", label: "Silk Blouses" },
      { path: "/materials/silk-skirts", label: "Silk Skirts" },
      { path: "/materials/silk-dresses-evening", label: "Silk Evening Dresses" },
    ],
  },
  "cotton-clothing": {
    slug: "cotton-clothing",
    path: "/cotton-clothing",
    fiber: "Cotton",
    fiberQueries: ["cotton"],
    seoTitle: "Cotton Clothing for Women | INTERTEXE",
    h1: "Cotton Clothing",
    metaDescription: "Shop verified cotton clothing for women. Cotton dresses, cotton tops, cotton shirts, and more — every product checked for real cotton content. Egyptian, Pima, Supima, and organic cotton from trusted brands.",
    intro: "Cotton is the most versatile natural fiber in fashion — from crisp shirting to soft jersey to raw denim. But quality varies wildly. We verified every label to find the pieces made with real cotton, without the synthetic shortcuts.",
    buyingGuide: {
      lookFor: [
        "100% cotton or cotton-dominant blends (80%+ cotton)",
        "Egyptian, Pima, or Supima cotton for extra-long staple softness",
        "GOTS-certified organic cotton — no synthetic pesticides",
        "Brushed or combed cotton for superior softness",
      ],
      avoid: [
        "Cotton/polyester blends marketed as \"easy care\"",
        "Anything under 60% cotton content",
        "Unbranded generic cotton with no origin stated",
      ],
      redFlags: [
        "\"Cotton-feel\" or \"cotton-touch\" — means it's synthetic",
        "\"Polycotton\" — typically 65% polyester",
        "No fabric composition listed on the product label",
      ],
    },
    relatedCategories: [
      { path: "/materials/cotton-dresses", label: "Cotton Dresses" },
      { path: "/materials/cotton-tops", label: "Cotton Tops" },
      { path: "/materials/cotton-shirts", label: "Cotton Shirts" },
      { path: "/materials/cotton-pants", label: "Cotton Pants" },
      { path: "/materials/cotton-knitwear", label: "Cotton Knitwear" },
    ],
  },
  "wool-clothing": {
    slug: "wool-clothing",
    path: "/wool-clothing",
    fiber: "Wool",
    fiberQueries: ["wool", "merino"],
    seoTitle: "Wool Clothing for Women | INTERTEXE",
    h1: "Wool Clothing",
    metaDescription: "Shop verified wool clothing for women. Wool sweaters, wool coats, merino wool pieces — every product checked for real wool content. No acrylic blends marketed as luxury wool.",
    intro: "Wool is nature's performance fiber — temperature-regulating, moisture-wicking, odor-resistant, and wrinkle-resistant. But cheap acrylic blends dominate the market. We verified every label to find the real thing.",
    buyingGuide: {
      lookFor: [
        "100% virgin wool or merino wool",
        "Super 100s+ for suiting (higher number = finer fiber)",
        "RWS (Responsible Wool Standard) certification",
        "Italian or British milled wool for tailoring",
      ],
      avoid: [
        "Wool/acrylic blends — acrylic pills and traps heat",
        "\"Wool blend\" without specifying percentages",
        "Boiled wool mixed with synthetics",
      ],
      redFlags: [
        "\"Wool-feel\" or \"wool-touch\" — it's acrylic",
        "Wool suits under $300 — likely low super count or blended",
        "Itchiness means coarse fiber (over 25 microns)",
      ],
    },
    relatedCategories: [
      { path: "/materials/wool-sweaters", label: "Wool Sweaters" },
      { path: "/materials/wool-coats", label: "Wool Coats" },
      { path: "/materials/wool-pants", label: "Wool Trousers" },
    ],
  },
  "cashmere-clothing": {
    slug: "cashmere-clothing",
    path: "/cashmere-clothing",
    fiber: "Cashmere",
    fiberQueries: ["cashmere"],
    seoTitle: "Cashmere Clothing for Women | INTERTEXE",
    h1: "Cashmere Clothing",
    metaDescription: "Shop verified cashmere clothing for women. Cashmere sweaters, cashmere cardigans, and cashmere knits — every product checked for genuine cashmere content. No 5% cashmere blends marketed as luxury.",
    intro: "Cashmere is the pinnacle of luxury knitwear — three times more insulating than sheep wool, yet incredibly lightweight. But the market is flooded with blends that use as little as 5% cashmere. We checked every label.",
    buyingGuide: {
      lookFor: [
        "100% cashmere with 2-ply minimum for durability",
        "Grade A cashmere (14–15.5 microns) from Mongolia",
        "Dense, tight knit with no see-through spots",
        "Inner Mongolian or Scottish cashmere for the finest quality",
      ],
      avoid: [
        "Cashmere blended with nylon or acrylic",
        "\"Cashmere-feel\" products — they're synthetic",
        "Single-ply cashmere — pills faster and wears thin",
      ],
      redFlags: [
        "Cashmere sweater under $100 — almost certainly low-grade or blended",
        "Scratchy hand-feel means coarse fibers (Grade C)",
        "\"Pashmina\" scarves under $80 — likely viscose",
      ],
    },
    relatedCategories: [
      { path: "/materials/cashmere-sweaters", label: "Cashmere Sweaters" },
      { path: "/materials/cashmere-knits", label: "Cashmere Cardigans" },
    ],
  },
};

const ALL_FIBER_PAGES = [
  { path: "/linen-clothing", label: "Linen", fiber: "Linen" },
  { path: "/silk-clothing", label: "Silk", fiber: "Silk" },
  { path: "/cotton-clothing", label: "Cotton", fiber: "Cotton" },
  { path: "/wool-clothing", label: "Wool", fiber: "Wool" },
  { path: "/cashmere-clothing", label: "Cashmere", fiber: "Cashmere" },
];

function ProductCard({ product, index }: { product: any; index: number }) {
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
      data-testid={`card-category-product-${index}`}
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
          data-testid={`button-heart-category-${index}`}
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

export function FabricCategoryPage({ categorySlug }: { categorySlug: string }) {
  const config = FABRIC_CATEGORIES[categorySlug];
  const [showAll, setShowAll] = useState(false);

  useSEO({
    title: config?.seoTitle,
    description: config?.metaDescription,
    path: config?.path,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["fabric-category", categorySlug],
    queryFn: async () => {
      if (!config) return [];
      const allProducts: any[] = [];
      for (const fiber of config.fiberQueries) {
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
    enabled: !!config,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!config || products.length === 0) return;
    const itemListJsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: config.h1,
      description: config.metaDescription,
      url: `https://www.intertexe.com${config.path}`,
      numberOfItems: products.length,
      itemListElement: products.slice(0, 50).map((product: any, index: number) => ({
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
  }, [config, products]);

  if (!config) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-6">
        <h1 className="text-3xl font-serif">Page Not Found</h1>
        <Link href="/natural-fabrics" className="text-xs uppercase tracking-widest border-b border-foreground pb-1">
          Browse Natural Fabrics
        </Link>
      </div>
    );
  }

  const displayProducts = showAll ? products : products.slice(0, 24);
  const brandCount = new Set(products.map((p: any) => p.brand_slug || p.brandSlug)).size;
  const otherFibers = ALL_FIBER_PAGES.filter(f => f.path !== config.path);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.intertexe.com/" },
      { "@type": "ListItem", position: 2, name: "Natural Fabrics", item: "https://www.intertexe.com/natural-fabrics" },
      { "@type": "ListItem", position: 3, name: `${config.fiber} Clothing` },
    ],
  };

  return (
    <div className="flex flex-col" data-testid={`page-${categorySlug}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <section className="pt-8 md:pt-14 pb-6 md:pb-8 max-w-5xl mx-auto w-full px-4">
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground mb-6">
          <Link href="/natural-fabrics" className="hover:text-foreground transition-colors" data-testid="link-natural-fabrics">Natural Fabrics</Link>
          <span>/</span>
          <span className="text-foreground">{config.fiber}</span>
        </nav>
        <h1 className="text-3xl md:text-5xl font-serif leading-tight mb-3" data-testid="text-category-title">
          {config.h1}
        </h1>
        <p className="text-[13px] md:text-base text-muted-foreground leading-relaxed max-w-2xl">
          {config.intro}
        </p>
      </section>

      <section className="max-w-5xl mx-auto w-full px-4 py-8 md:py-10" data-testid="section-products">
        {isLoading ? (
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
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">No {config.fiber.toLowerCase()} products found yet.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[12px] text-muted-foreground">
                {products.length} verified {config.fiber.toLowerCase()} pieces from {brandCount} brands
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {displayProducts.map((product: any, index: number) => (
                <ProductCard key={product.product_id || product.productId || index} product={product} index={index} />
              ))}
            </div>
            {!showAll && products.length > 24 && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setShowAll(true)}
                  className="px-8 py-3 border border-foreground text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-foreground hover:text-background transition-colors"
                  data-testid="button-show-all"
                >
                  Show all {products.length} {config.fiber.toLowerCase()} pieces
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="bg-foreground text-background" data-testid="section-buying-guide">
        <div className="max-w-5xl mx-auto w-full px-4 py-10 md:py-14 flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-background/50">The INTERTEXE Buying Guide</p>
            <h2 className="text-2xl md:text-3xl font-serif">How to Buy {config.fiber} — What to Look For</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-background/70" />
                <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Look For</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {config.buyingGuide.lookFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-background/80">
                    <span className="w-1 h-1 bg-background/40 rounded-full mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-background/70" />
                <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Avoid</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {config.buyingGuide.avoid.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-background/80">
                    <span className="w-1 h-1 bg-background/40 rounded-full mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-4 border-t border-background/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-background/70" />
              <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Red Flags</h3>
            </div>
            <ul className="flex flex-col gap-2">
              {config.buyingGuide.redFlags.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-background/80">
                  <span className="w-1 h-1 bg-background/40 rounded-full mt-2 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full px-4 py-10 md:py-14" data-testid="section-subcategories">
        <div className="flex flex-col gap-2 mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Shop by Category</p>
          <h2 className="text-2xl md:text-3xl font-serif">Browse {config.fiber} by Type</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {config.relatedCategories.map((cat) => (
            <Link
              key={cat.path}
              href={cat.path}
              className="group flex items-center justify-between p-5 md:p-6 border border-border/40 hover:border-foreground/30 hover:bg-[#FAFAF8] transition-all"
              data-testid={`link-subcategory-${cat.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span className="text-sm md:text-base font-medium">{cat.label}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border/30 bg-[#FAFAF8]">
        <div className="max-w-5xl mx-auto w-full px-4 py-8 md:py-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Explore More Fabrics</p>
          <div className="flex flex-wrap gap-3">
            {otherFibers.map((f) => (
              <Link
                key={f.path}
                href={f.path}
                className="px-5 py-2.5 border border-border/60 text-xs uppercase tracking-[0.15em] font-medium hover:bg-foreground hover:text-background hover:border-foreground transition-colors"
                data-testid={`link-fiber-${f.label.toLowerCase()}`}
              >
                {f.label} Clothing
              </Link>
            ))}
            <Link
              href="/natural-fabrics"
              className="px-5 py-2.5 bg-foreground text-background text-xs uppercase tracking-[0.15em] font-medium hover:bg-foreground/90 transition-colors"
              data-testid="link-all-natural"
            >
              All Natural Fabrics
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export function NaturalFabricsPage() {
  useSEO({
    title: "Natural Fabric Clothing — Linen, Silk, Cotton, Wool & Cashmere | INTERTEXE",
    description: "Shop clothing made from natural fabrics. Linen, silk, cotton, wool, and cashmere — every composition verified. Find real natural fiber clothing from 11,000+ brands. No synthetic surprises.",
    path: "/natural-fabrics",
  });

  const { data: productCount = 0 } = useQuery({
    queryKey: ["product-count"],
    queryFn: fetchProductCount,
    staleTime: 10 * 60 * 1000,
  });

  const fabricCards = [
    {
      fiber: "Linen",
      path: "/linen-clothing",
      tagline: "Breathable, naturally cooling, gets softer with every wash.",
      stats: "Dresses, tops, pants, shirts, sets",
    },
    {
      fiber: "Silk",
      path: "/silk-clothing",
      tagline: "Luminous drape, temperature-regulating, naturally hypoallergenic.",
      stats: "Dresses, tops, blouses, skirts, evening",
    },
    {
      fiber: "Cotton",
      path: "/cotton-clothing",
      tagline: "The world's most versatile natural fiber. Egyptian, Pima, organic.",
      stats: "Dresses, tops, shirts, pants, knitwear",
    },
    {
      fiber: "Wool",
      path: "/wool-clothing",
      tagline: "Nature's performance fiber. Temperature-regulating, odor-resistant.",
      stats: "Sweaters, coats, trousers",
    },
    {
      fiber: "Cashmere",
      path: "/cashmere-clothing",
      tagline: "The pinnacle of luxury knitwear. Three times warmer than wool.",
      stats: "Sweaters, cardigans, knits",
    },
  ];

  return (
    <div className="flex flex-col" data-testid="page-natural-fabrics">
      <section className="pt-8 md:pt-14 pb-6 md:pb-8 max-w-5xl mx-auto w-full px-4">
        <h1 className="text-3xl md:text-5xl font-serif leading-tight mb-3" data-testid="text-natural-fabrics-title">
          Natural Fabric Clothing
        </h1>
        <p className="text-[13px] md:text-base text-muted-foreground leading-relaxed max-w-2xl">
          Every composition verified. Find clothing made from real natural fibers — linen, silk, cotton, wool, and cashmere — from brands that don't cut corners with synthetics.
        </p>
        {productCount > 0 && (
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-3">
            {productCount.toLocaleString()} verified products across 11,000+ brands
          </p>
        )}
      </section>

      <section className="max-w-5xl mx-auto w-full px-4 py-8 md:py-10" data-testid="section-fabric-grid">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {fabricCards.map((card) => (
            <Link
              key={card.path}
              href={card.path}
              className="group border border-border/40 hover:border-foreground/30 transition-all p-6 md:p-8 flex flex-col gap-3"
              data-testid={`card-fabric-${card.fiber.toLowerCase()}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-serif">{card.fiber} Clothing</h2>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.tagline}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 mt-auto pt-2 border-t border-border/20">
                {card.stats}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-foreground text-background" data-testid="section-why-natural">
        <div className="max-w-5xl mx-auto w-full px-4 py-10 md:py-14 flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-background/50">The INTERTEXE Standard</p>
            <h2 className="text-2xl md:text-3xl font-serif">Why Natural Fabrics Matter</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-background/70" />
                <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Biodegradable</h3>
              </div>
              <p className="text-sm text-background/70 leading-relaxed">
                Natural fibers like cotton, linen, silk, and wool decompose naturally. Polyester takes 200+ years to break down and sheds microplastics with every wash.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-background/70" />
                <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Better for Skin</h3>
              </div>
              <p className="text-sm text-background/70 leading-relaxed">
                Natural fabrics are breathable, moisture-wicking, and hypoallergenic. Synthetics trap heat, cause irritation, and harbor odor-causing bacteria.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-background/70" />
                <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Longer Lasting</h3>
              </div>
              <p className="text-sm text-background/70 leading-relaxed">
                Quality natural fiber garments last years, not seasons. Linen gets softer, leather develops patina, and wool resists wrinkles — they improve with age.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full px-4 py-10 md:py-14">
        <div className="flex flex-col gap-2 mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Explore More</p>
          <h2 className="text-2xl md:text-3xl font-serif">More Ways to Shop</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border/30">
          <Link
            href="/materials"
            className="group flex items-start gap-4 p-6 md:p-8 border-b md:border-b-0 md:border-r border-border/30 hover:bg-[#f5f5f3] transition-colors"
            data-testid="link-all-materials"
          >
            <ShoppingBag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] md:text-sm font-medium">All Materials</span>
              <span className="text-[12px] text-muted-foreground leading-relaxed">Browse all fabric types including denim, alpaca, viscose, and more.</span>
            </div>
          </Link>
          <Link
            href="/designers"
            className="group flex items-start gap-4 p-6 md:p-8 border-b md:border-b-0 md:border-r border-border/30 hover:bg-[#f5f5f3] transition-colors"
            data-testid="link-designers"
          >
            <Leaf className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] md:text-sm font-medium">Brand Directory</span>
              <span className="text-[12px] text-muted-foreground leading-relaxed">11,000+ brands ranked by natural fiber quality.</span>
            </div>
          </Link>
          <Link
            href="/scanner"
            className="group flex items-start gap-4 p-6 md:p-8 hover:bg-[#f5f5f3] transition-colors"
            data-testid="link-scanner"
          >
            <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] md:text-sm font-medium">Scan a Product</span>
              <span className="text-[12px] text-muted-foreground leading-relaxed">Paste any URL to check fabric composition instantly.</span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
