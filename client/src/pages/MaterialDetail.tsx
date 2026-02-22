import { Link, useParams } from "wouter";
import { ArrowLeft, Leaf, Droplets, Shield, Sparkles, CheckCircle2, XCircle, AlertTriangle, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners } from "@/lib/supabase";
import { MATERIALS } from "@/lib/data";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";

export default function MaterialDetail() {
  const params = useParams<{ slug: string }>();
  const material = MATERIALS.find(m => m.slug === params.slug);

  const { data: designers = [], isLoading } = useQuery({
    queryKey: ["designers-material", params.slug],
    queryFn: () => fetchDesigners(undefined, 200),
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

  const relatedDesigners = designers
    .filter((d: any) => {
      if (d.naturalFiberPercent == null) return false;
      if (material.category === 'synthetic') return true;
      return d.naturalFiberPercent > 70;
    })
    .slice(0, 8);

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
