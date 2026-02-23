import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ShoppingBag, ExternalLink, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { fetchProductsByFiber } from "@/lib/supabase";
import { useState } from "react";

interface PageConfig {
  slug: string;
  title: string;
  fiber: string;
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
    title: "The Best Linen Dresses Worth Buying",
    fiber: "Linen",
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
  "silk-dresses": {
    slug: "silk-dresses",
    title: "The Best Silk Dresses Worth Buying",
    fiber: "Silk",
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
  "cotton-dresses": {
    slug: "cotton-dresses",
    title: "The Best Cotton & Denim Dresses Worth Buying",
    fiber: "Cotton",
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
};

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
  const productId = product.product_id || product.productId;

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
        <Link
          href={`/designers/${brandSlug}`}
          className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {brandName}
        </Link>
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
        const results = await fetchProductsByFiber(fiber);
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

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-16">
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
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {products.map((product: any, index: number) => (
                <ProductCard key={product.product_id || product.productId || index} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">No verified {config.fiber.toLowerCase()} pieces yet. Check back soon.</p>
            </div>
          )}
        </section>

        <section className="py-8 border-t border-border/20">
          <EmailCapture fiber={config.fiber} />
        </section>

        <section className="py-8 border-t border-border/20">
          <h2 className="text-xs uppercase tracking-[0.2em] font-medium mb-4">More Curated Collections</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(PAGE_CONFIGS)
              .filter(([key]) => key !== pageSlug)
              .map(([key, cfg]) => (
                <Link
                  key={key}
                  href={`/${key}`}
                  className="flex items-center gap-2 px-4 py-3 border border-border/30 hover:border-foreground/30 transition-colors text-sm"
                  data-testid={`link-collection-${key}`}
                >
                  {cfg.heroTitle}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
