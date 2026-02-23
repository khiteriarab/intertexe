import { Link, useParams } from "wouter";
import { ArrowLeft, Leaf, Droplets, Shield, Sparkles, CheckCircle2, XCircle, AlertTriangle, DollarSign, ShoppingBag, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners, fetchProductsByFiberAndCategory } from "@/lib/supabase";
import { MATERIALS } from "@/lib/data";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";
import { filterToCuratedBrands } from "@/lib/curated-brands";

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

function FabricProductCard({ product, index }: { product: any; index: number }) {
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
      data-testid={`card-fabric-product-${index}`}
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

  const fiberQueries = params.slug ? FIBER_QUERIES[params.slug] || [] : [];

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

  const scoredRelated = designers
    .filter((d: any) => {
      if (d.naturalFiberPercent == null) return false;
      if (material.category === 'synthetic') return true;
      return d.naturalFiberPercent > 70;
    });

  const relatedDesigners = scoredRelated.length > 0
    ? scoredRelated.slice(0, 8)
    : filterToCuratedBrands(designers as any[]).slice(0, 8);

  const categoryLabel = material.category === 'plant' ? 'Plant-Based' : material.category === 'animal' ? 'Animal-Based' : 'Semi-Synthetic';

  return (
    <div className="py-6 md:py-12 flex flex-col gap-10 md:gap-14 max-w-4xl mx-auto" data-testid={`page-material-${material.slug}`}>
      <Link href="/materials" className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors active:scale-95 self-start py-1" data-testid="link-back-materials">
        <ArrowLeft className="w-4 h-4" /> All Materials
      </Link>

      <header className="flex flex-col gap-4 md:gap-6">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground bg-secondary px-3 py-1.5">{categoryLabel}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-serif" data-testid="text-material-name">{material.name}</h1>
        <p className="text-base md:text-lg text-foreground/80 font-light leading-relaxed max-w-2xl">
          {material.description}
        </p>
      </header>

      <section className="bg-foreground text-background -mx-4 md:mx-0 px-4 md:px-0" data-testid="section-buying-rules">
        <div className="py-8 md:py-12 md:px-8 flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-background/50" data-testid="text-buying-rules-label">The INTERTEXE Buying Rules</p>
            <h2 className="text-2xl md:text-3xl font-serif" data-testid="text-buying-rules-title">What You Need to Know Before Buying {material.name}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="flex flex-col gap-3" data-testid="section-look-for">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-background/70" />
                <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Look For</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {material.buyingRules.lookFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-background/80" data-testid={`text-look-for-${i}`}>
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
                  <li key={i} className="flex items-start gap-2.5 text-sm text-background/80" data-testid={`text-avoid-${i}`}>
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
                <li key={i} className="flex items-start gap-2.5 text-sm text-background/80" data-testid={`text-red-flag-${i}`}>
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
            <p className="text-sm text-background/80 leading-relaxed" data-testid="text-price-guidance">{material.buyingRules.priceGuidance}</p>
          </div>
        </div>
      </section>

      <section className="border-y border-border/40 py-8 md:py-12 flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-foreground/60" />
            <h2 className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Origin & History</h2>
          </div>
          <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{material.origin}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-foreground/60" />
          <h2 className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Sustainability</h2>
        </div>
        <p className="text-sm md:text-base text-foreground/80 leading-relaxed bg-secondary/30 p-4 md:p-6 border border-border/20">
          {material.sustainability}
        </p>
      </section>

      {fabricProducts.length > 0 && (
        <section className="flex flex-col gap-6 md:gap-8 bg-secondary/30 -mx-4 md:mx-0 px-4 md:px-0" data-testid="section-shop-fabric">
          <div className="pt-8 md:pt-10 md:px-6">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-foreground/60" />
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Shop Verified Products</p>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif">Shop {material.name}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {fabricProducts.length} verified {material.name.toLowerCase()} pieces across {new Set(fabricProducts.map((p: any) => p.brand_slug || p.brandSlug)).size} brands. Every composition checked.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 md:px-6 pb-8 md:pb-10">
            {fabricProducts.slice(0, 12).map((product: any, index: number) => (
              <FabricProductCard key={product.product_id || product.productId || index} product={product} index={index} />
            ))}
          </div>
          {fabricProducts.length > 12 && (
            <div className="text-center pb-8 md:pb-10">
              <span className="text-xs text-muted-foreground">
                + {fabricProducts.length - 12} more verified {material.name.toLowerCase()} pieces
              </span>
            </div>
          )}
        </section>
      )}

      {productsLoading && fiberQueries.length > 0 && (
        <section className="flex flex-col gap-6 bg-secondary/30 -mx-4 md:mx-0 px-4 md:px-0 py-8 md:py-10">
          <div className="md:px-6">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-foreground/60" />
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Shop Verified Products</p>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif">Shop {material.name}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 md:px-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-secondary/50 animate-pulse flex flex-col">
                <div className="aspect-[3/4]" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 bg-secondary/80 w-1/3" />
                  <div className="h-4 bg-secondary/60 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">INTERTEXE Approved</p>
          <h2 className="text-2xl md:text-3xl font-serif">Designers We Recommend for {material.name}</h2>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {relatedDesigners.map((designer: any) => {
              const dTier = getQualityTier(designer.naturalFiberPercent);
              return (
                <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-3" data-testid={`card-designer-${designer.slug}`}>
                  <div className="aspect-[3/4] bg-secondary relative flex items-center justify-center">
                    <span className="font-serif text-3xl md:text-4xl text-muted-foreground/20">{designer.name.charAt(0)}</span>
                    <div className="absolute top-2 left-2">
                      <span className={`px-2 py-0.5 text-[8px] md:text-[9px] uppercase tracking-[0.1em] font-medium ${getTierColor(dTier.tier)}`}>
                        {dTier.shortLabel}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-serif group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
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

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Link href="/materials" className="border border-foreground px-6 py-3 uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors active:scale-95 text-center" data-testid="link-all-materials">
          All Materials
        </Link>
        <Link href="/quiz" className="bg-foreground text-background px-6 py-3 uppercase tracking-widest text-xs hover:bg-foreground/90 transition-colors active:scale-95 text-center" data-testid="link-take-quiz-material">
          Find My Designers
        </Link>
      </div>
    </div>
  );
}
