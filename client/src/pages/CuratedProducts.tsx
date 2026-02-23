import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ShoppingBag, ExternalLink, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { fetchProductsByFiberAndCategory } from "@/lib/supabase";
import { useState } from "react";

interface PageConfig {
  slug: string;
  title: string;
  fiber: string;
  category?: string;
  fiberQuery: string[];
  heroTitle: string;
  heroSubtitle: string;
  intro: string;
  buyingTips: string[];
  redFlags: string[];
}

const PAGE_CONFIGS: Record<string, PageConfig> = {
  "linen-dresses": {
    slug: "linen-dresses",
    title: "Best Linen Dresses in 2026",
    fiber: "Linen",
    category: "dresses",
    fiberQuery: ["linen", "flax"],
    heroTitle: "Linen Dresses",
    heroSubtitle: "We tested the composition of every dress. These are the ones worth your money.",
    intro: "Linen is one of the oldest and most sustainable fabrics — breathable, naturally cooling, and it only gets softer with every wash. But most brands cut it with polyester. We found the ones that don't.",
    buyingTips: [
      "Look for 100% linen or linen-viscose blends",
      "European flax (Belgian, French) is the gold standard",
      "Expect a natural, relaxed drape — stiff linen softens with wear",
      "Pre-washed or garment-dyed linen has minimal shrinkage",
    ],
    redFlags: [
      "\"Linen blend\" with no percentage listed",
      "Polyester lining in a \"linen\" dress",
      "Under $80 for a linen dress — likely mixed with synthetic",
    ],
  },
  "linen-tops": {
    slug: "linen-tops",
    title: "Best Linen Tops & Shirts in 2026",
    fiber: "Linen",
    category: "tops",
    fiberQuery: ["linen", "flax"],
    heroTitle: "Linen Tops & Shirts",
    heroSubtitle: "Breezy, breathable, and built for warm weather. Every composition verified.",
    intro: "A linen shirt is the backbone of any summer wardrobe. The problem? Most \"linen\" tops are blended with polyester to cut costs. We checked every label to find the real thing.",
    buyingTips: [
      "100% linen shirts get softer with every wash",
      "Linen-cotton blends (70/30) offer crease resistance without synthetics",
      "Camp collars and oversized fits suit linen's natural drape",
      "French or Belgian flax is the highest quality linen fiber",
    ],
    redFlags: [
      "\"Linen look\" or \"linen style\" — usually polyester",
      "Blended with more than 20% polyester",
      "Extremely stiff linen that doesn't soften — low quality fiber",
    ],
  },
  "silk-dresses": {
    slug: "silk-dresses",
    title: "Best Silk Dresses in 2026",
    fiber: "Silk",
    category: "dresses",
    fiberQuery: ["silk"],
    heroTitle: "Silk Dresses",
    heroSubtitle: "Verified 100% silk. No polyester masquerading as luxury.",
    intro: "Real silk has a distinct, cool-to-the-touch feel that no synthetic can replicate. It's naturally temperature-regulating, hypoallergenic, and has a luminous drape that polyester satin will never match. We verified every composition label.",
    buyingTips: [
      "Mulberry silk is the highest quality (smooth, lustrous)",
      "Look for momme weight — 19mm+ for dresses, 22mm+ for heavier drapes",
      "Silk charmeuse has a satin face and matte back",
      "Silk crepe de chine is matte, breathable, and less delicate",
    ],
    redFlags: [
      "\"Silky\" or \"silk-feel\" — this means polyester",
      "\"Satin\" without specifying silk — usually polyester satin",
      "Under $100 for a silk dress — almost certainly synthetic",
    ],
  },
  "silk-tops": {
    slug: "silk-tops",
    title: "Best Silk Tops & Blouses in 2026",
    fiber: "Silk",
    category: "tops",
    fiberQuery: ["silk"],
    heroTitle: "Silk Tops & Blouses",
    heroSubtitle: "The real thing. No poly-satin pretenders.",
    intro: "A silk blouse is a wardrobe investment that lasts decades — if it's actually silk. We verified every composition to find tops made from genuine silk, not the polyester satin sold at similar price points.",
    buyingTips: [
      "Silk charmeuse for a dressier drape, crepe de chine for everyday wear",
      "19+ momme weight for shirts that hold up to regular wear",
      "Silk twill is more structured — ideal for button-downs",
      "Hand wash or delicate cycle in cold water to preserve the fiber",
    ],
    redFlags: [
      "\"Silk touch\" or \"silk satin\" without stating 100% silk",
      "Shiny, plasticky appearance — real silk has a subtle, matte luster",
      "Under $80 for a silk top — very likely synthetic",
    ],
  },
  "cotton-dresses": {
    slug: "cotton-dresses",
    title: "Best Cotton & Denim Dresses in 2026",
    fiber: "Cotton",
    category: "dresses",
    fiberQuery: ["cotton", "denim"],
    heroTitle: "Cotton & Denim Dresses",
    heroSubtitle: "Breathable, durable, and honestly made. Every piece verified.",
    intro: "Cotton is the most versatile fabric in fashion — from crisp shirting to soft jersey to raw denim. But quality varies wildly. We found the pieces made with real cotton, organic where possible, without the synthetic shortcuts.",
    buyingTips: [
      "Organic cotton (GOTS certified) uses no synthetic pesticides",
      "Egyptian and Pima cotton have longer fibers = softer, more durable",
      "Raw/selvedge denim is 100% cotton with no stretch",
      "Poplin and chambray are lightweight cotton weaves ideal for dresses",
    ],
    redFlags: [
      "\"Cotton blend\" with more than 30% polyester",
      "Jersey dresses with no composition listed",
      "\"Denim\" pieces that are actually stretch poly-cotton",
    ],
  },
  "cotton-tops": {
    slug: "cotton-tops",
    title: "Best Cotton Tops & Shirts in 2026",
    fiber: "Cotton",
    category: "tops",
    fiberQuery: ["cotton", "denim"],
    heroTitle: "Cotton Tops & Shirts",
    heroSubtitle: "Classic cotton. No synthetic fillers. Every label checked.",
    intro: "Cotton shirts should be simple — but brands love cutting corners with polyester blends that pill, trap heat, and look cheap after a few washes. We verified every label to find the ones made from real, quality cotton.",
    buyingTips: [
      "100% cotton oxford cloth is the gold standard for casual shirts",
      "Supima and Pima cotton are softer and more durable than regular cotton",
      "Cotton poplin is lightweight and crisp — perfect for warm weather",
      "Look for selvedge denim shirts — 100% cotton with no stretch",
    ],
    redFlags: [
      "\"Cotton rich\" — usually 60% cotton, 40% polyester",
      "Jersey tees with no fabric composition listed",
      "Denim shirts with more than 5% elastane — loses shape quickly",
    ],
  },
  "cashmere-sweaters": {
    slug: "cashmere-sweaters",
    title: "Best Cashmere Sweaters in 2026",
    fiber: "Cashmere",
    category: "knitwear",
    fiberQuery: ["cashmere"],
    heroTitle: "Cashmere Sweaters",
    heroSubtitle: "The luxury knit. Verified compositions — no blended imitations.",
    intro: "Cashmere is the most coveted knitwear fiber in the world — lighter, warmer, and softer than wool. But the market is flooded with blends that use as little as 5% cashmere and call it \"cashmere.\" We checked every label.",
    buyingTips: [
      "Grade A cashmere uses the longest, finest fibers (under 15.5 microns)",
      "Inner Mongolian cashmere is considered the world's best",
      "2-ply construction is more durable than single-ply",
      "Pilling is normal for the first few wears — it decreases over time",
    ],
    redFlags: [
      "\"Cashmere blend\" with less than 70% cashmere",
      "Under $100 for a cashmere sweater — almost certainly recycled or blended",
      "\"Cashmere feel\" or \"cashmere touch\" — this is acrylic",
      "Extremely light weight — may indicate thin, low-grade fiber",
    ],
  },
  "wool-sweaters": {
    slug: "wool-sweaters",
    title: "Best Wool Sweaters & Knitwear in 2026",
    fiber: "Wool",
    category: "knitwear",
    fiberQuery: ["wool", "merino"],
    heroTitle: "Wool Sweaters & Knitwear",
    heroSubtitle: "Warm, breathable, and naturally odor-resistant. Every fiber verified.",
    intro: "Good wool knitwear lasts a lifetime. Merino, lambswool, and virgin wool are naturally temperature-regulating and antimicrobial. But cheap acrylic blends dominate the market. We found the pieces worth investing in.",
    buyingTips: [
      "Merino wool (under 18.5 microns) is the softest and least itchy",
      "Virgin wool means first-shearing fiber — strongest and most resilient",
      "Lambswool is softer than regular wool, from the first shearing of young sheep",
      "Wool naturally resists odors — you don't need to wash it after every wear",
    ],
    redFlags: [
      "\"Wool blend\" with more than 30% acrylic or polyester",
      "\"Warm and cozy\" fabric descriptions with no composition listed",
      "Very low price for \"100% wool\" — may be recycled/reclaimed wool",
    ],
  },
  "viscose-dresses": {
    slug: "viscose-dresses",
    title: "Best Viscose & Rayon Dresses in 2026",
    fiber: "Viscose",
    category: "dresses",
    fiberQuery: ["viscose", "rayon", "wood pulp", "lyocell", "tencel", "modal"],
    heroTitle: "Viscose & Rayon Dresses",
    heroSubtitle: "The semi-natural alternative to silk. Every composition checked.",
    intro: "Viscose (also called rayon) is made from plant cellulose — usually wood pulp. When done right, it drapes beautifully and breathes like silk at a fraction of the price. Lyocell and TENCEL are the premium versions with sustainable closed-loop production.",
    buyingTips: [
      "TENCEL/Lyocell is the gold standard — closed-loop, sustainable production",
      "EcoVero viscose uses sustainably sourced wood pulp",
      "Viscose drapes like silk but is more affordable and easier to care for",
      "Modal is even softer than regular viscose — excellent for everyday wear",
    ],
    redFlags: [
      "Viscose blended with polyester — defeats the purpose of the fabric",
      "\"Rayon\" with no specific type listed — quality varies enormously",
      "Very cheap viscose wrinkles badly and may shrink in the wash",
    ],
  },
};

export const ALL_CURATED_SLUGS = Object.keys(PAGE_CONFIGS);

function EmailCapture({ fiber }: { fiber: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-3 p-6 bg-emerald-50 border border-emerald-200">
        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
        <p className="text-sm text-emerald-900">You're in. We'll notify you when we add new verified {fiber.toLowerCase()} pieces.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 md:p-8 bg-secondary/30 border border-border/20" data-testid="form-email-capture">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-foreground/60" />
        <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Get notified</h3>
      </div>
      <p className="text-sm text-foreground/70">
        We add new verified pieces every week. Get notified when we find {fiber.toLowerCase()} items that meet our standards.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 px-4 py-3 bg-background border border-border/40 text-sm focus:outline-none focus:border-foreground/40 transition-colors"
          data-testid="input-email-capture"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-foreground text-background text-xs uppercase tracking-widest hover:bg-foreground/90 transition-colors active:scale-[0.98]"
          data-testid="button-email-submit"
        >
          Notify Me
        </button>
      </div>
    </form>
  );
}

function ProductCard({ product, index }: { product: any; index: number }) {
  const brandName = product.brand_name || product.brandName;
  const brandSlug = product.brand_slug || product.brandSlug;
  const imageUrl = product.image_url || product.imageUrl;
  const naturalPercent = product.natural_fiber_percent || product.naturalFiberPercent;

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col"
      data-testid={`card-curated-product-${index}`}
    >
      <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="w-8 h-8 opacity-30" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
            {naturalPercent}% natural
          </span>
        </div>
      </div>
      <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
        <span
          className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
        >
          {brandName}
        </span>
        <h3 className="text-xs md:text-sm leading-snug font-medium">{product.name}</h3>
        <p className="text-[10px] text-muted-foreground">{product.composition}</p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-sm font-medium">{product.price}</span>
          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </a>
  );
}

export default function CuratedProductsPage({ pageSlug }: { pageSlug: string }) {
  const config = PAGE_CONFIGS[pageSlug];

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["curated-products", pageSlug],
    queryFn: async () => {
      if (!config) return [];
      const allProducts: any[] = [];
      for (const fiber of config.fiberQuery) {
        const results = await fetchProductsByFiberAndCategory(fiber, config.category);
        allProducts.push(...results);
      }
      const seen = new Set<string>();
      return allProducts.filter((p) => {
        const id = p.product_id || p.productId;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    },
    enabled: !!config,
    staleTime: 10 * 60 * 1000,
  });

  useSEO({
    title: config?.title || "Curated Products",
    description: config?.intro?.slice(0, 160) || "Verified luxury fashion pieces that meet INTERTEXE quality standards.",
  });

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  const relatedPages = Object.entries(PAGE_CONFIGS)
    .filter(([key]) => key !== pageSlug)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-16">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="pt-6 pb-4">
          <Link href="/materials" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-materials">
            <ChevronLeft className="w-3.5 h-3.5" />
            Buying Guide
          </Link>
        </div>

        <header className="flex flex-col gap-4 pb-8 border-b border-border/20">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">INTERTEXE Verified</span>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl leading-tight" data-testid="text-page-title">
            {config.heroTitle}
          </h1>
          <p className="text-sm md:text-base text-foreground/70 max-w-2xl leading-relaxed">
            {config.heroSubtitle}
          </p>
        </header>

        <section className="py-8 border-b border-border/20">
          <p className="text-sm md:text-base text-foreground/80 leading-relaxed max-w-2xl">
            {config.intro}
          </p>
        </section>

        <section className="py-8 border-b border-border/20">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] font-medium mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                What to Look For
              </h2>
              <ul className="flex flex-col gap-2.5">
                {config.buyingTips.map((tip, i) => (
                  <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                    <span className="text-emerald-700 mt-0.5">+</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] font-medium mb-4 flex items-center gap-2">
                <span className="text-red-600 text-sm">⚑</span>
                Red Flags
              </h2>
              <ul className="flex flex-col gap-2.5">
                {config.redFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">−</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs uppercase tracking-[0.2em] font-medium">
              {isLoading ? "Loading..." : `${products.length} Verified Pieces`}
            </h2>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Every composition checked
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-secondary/30 animate-pulse flex flex-col">
                  <div className="aspect-[3/4]" />
                  <div className="p-3 flex flex-col gap-2">
                    <div className="h-3 bg-secondary/60 w-1/3" />
                    <div className="h-4 bg-secondary/50 w-2/3" />
                    <div className="h-3 bg-secondary/40 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.filter((p: any) => p.image_url || p.imageUrl).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {products.filter((p: any) => p.image_url || p.imageUrl).map((product: any, index: number) => (
                <ProductCard key={product.product_id || product.productId || index} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground mb-2">No verified {config.fiber.toLowerCase()} pieces in this category yet.</p>
              <p className="text-xs text-muted-foreground/70">We're actively adding new verified products. Sign up below to get notified.</p>
            </div>
          )}
        </section>

        <section className="py-8 border-t border-border/20">
          <EmailCapture fiber={config.fiber} />
        </section>

        <section className="py-8 border-t border-border/20">
          <h2 className="text-xs uppercase tracking-[0.2em] font-medium mb-4">More Curated Collections</h2>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3">
            {relatedPages.map(([key, cfg]) => (
              <Link
                key={key}
                href={`/materials/${key}`}
                className="flex items-center justify-between gap-2 px-4 py-3.5 md:py-3 border border-border/30 hover:border-foreground/30 active:bg-secondary/50 transition-colors text-sm"
                data-testid={`link-collection-${key}`}
              >
                <span className="text-xs md:text-sm">{cfg.heroTitle}</span>
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
