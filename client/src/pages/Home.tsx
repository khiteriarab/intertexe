import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Shield, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners } from "@/lib/supabase";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";
import { BrandImage } from "@/components/BrandImage";
import heroImage from "@/assets/images/hero-fashion.jpg";
import textureImage from "@/assets/images/material-texture.jpg";

function QualityBadge({ naturalFiberPercent }: { naturalFiberPercent: number | null | undefined }) {
  const tier = getQualityTier(naturalFiberPercent);
  return (
    <span className={`px-2 py-0.5 text-[9px] md:text-[10px] uppercase tracking-[0.15em] font-medium ${getTierColor(tier.tier)}`} data-testid="badge-quality">
      {tier.verdict}
    </span>
  );
}

export default function Home() {
  const { data: designers = [], isLoading } = useQuery({
    queryKey: ["designers-home"],
    queryFn: () => fetchDesigners(undefined, 100),
    staleTime: 5 * 60 * 1000,
  });

  const scoredDesigners = (designers as any[])
    .filter((d: any) => d.naturalFiberPercent != null && d.naturalFiberPercent >= 70)
    .sort((a: any, b: any) => (b.naturalFiberPercent ?? 0) - (a.naturalFiberPercent ?? 0));

  const approvedDesigners = scoredDesigners.length > 0
    ? scoredDesigners.slice(0, 8)
    : (designers as any[]).slice(0, 8);

  const exceptionalCount = (designers as any[]).filter((d: any) => d.naturalFiberPercent != null && d.naturalFiberPercent >= 90).length;

  return (
    <div className="flex flex-col gap-0">

      <section className="relative h-[70vh] md:h-[80vh] min-h-[520px] flex items-end justify-center overflow-hidden -mx-4 md:-mx-8">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Luxury Fashion Editorial"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/5" />
        </div>

        <div className="relative z-10 text-center px-6 pb-12 md:pb-16 max-w-3xl flex flex-col items-center">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-white/60 mb-4 md:mb-6 font-medium" data-testid="text-hero-label">
            The Material Authority
          </p>
          <h1 className="text-[32px] leading-[1.15] md:text-6xl lg:text-7xl font-serif text-white mb-5 md:mb-8 md:leading-tight" data-testid="text-hero-headline">
            We've done the research.<br className="hidden md:block" /> You just shop.
          </h1>
          <p className="text-sm md:text-lg text-white/80 mb-8 md:mb-10 max-w-xl font-light tracking-wide leading-relaxed" data-testid="text-hero-subtext">
            Every designer. Every fabric. Every label — vetted and ranked so you never have to wonder what you're buying again.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link href="/quiz" className="bg-white text-black px-6 py-3.5 md:px-8 md:py-4 uppercase tracking-[0.15em] text-xs md:text-sm font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2 active:scale-[0.97]" data-testid="button-take-quiz">
              Find My Designers <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/designers" className="border border-white/80 text-white px-6 py-3.5 md:px-8 md:py-4 uppercase tracking-[0.15em] text-xs md:text-sm font-medium hover:bg-white/10 transition-colors text-center active:scale-[0.97]" data-testid="button-browse-designers">
              Browse the Directory
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 -mx-4 md:-mx-8 px-4 md:px-8 bg-foreground text-background">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-background/50 mb-3">How It Works</p>
            <h2 className="text-2xl md:text-4xl font-serif">The INTERTEXE Standard</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 border border-background/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-background/70" />
              </div>
              <h3 className="text-sm uppercase tracking-[0.2em] font-medium">We Vet Every Brand</h3>
              <p className="text-sm text-background/60 leading-relaxed max-w-xs">
                We analyze fabric composition, sourcing, and manufacturing across {(designers as any[]).length.toLocaleString()}+ designers so you can shop with certainty.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 border border-background/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-background/70" />
              </div>
              <h3 className="text-sm uppercase tracking-[0.2em] font-medium">We Rank by Quality</h3>
              <p className="text-sm text-background/60 leading-relaxed max-w-xs">
                Every brand receives a natural fiber score and quality tier — Exceptional, Excellent, or Good — so the verdict is instant.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 border border-background/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-background/70" />
              </div>
              <h3 className="text-sm uppercase tracking-[0.2em] font-medium">You Just Buy</h3>
              <p className="text-sm text-background/60 leading-relaxed max-w-xs">
                No label-reading. No guessing. If it carries our approval, the material quality is guaranteed to meet our standard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="flex justify-between items-end border-b border-border/50 pb-3 md:pb-4 mb-8 md:mb-10">
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1">INTERTEXE Approved</p>
            <h2 className="text-2xl md:text-3xl font-serif">Top-Rated Designers</h2>
          </div>
          <Link href="/designers" className="text-[10px] md:text-sm uppercase tracking-[0.15em] hover:text-muted-foreground transition-colors active:scale-95" data-testid="link-view-all-designers">
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex flex-col gap-4 animate-pulse">
                <div className="aspect-[3/4] bg-secondary" />
                <div className="h-5 bg-secondary w-3/4" />
                <div className="h-4 bg-secondary w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {approvedDesigners.map((designer: any) => {
              const tier = getQualityTier(designer.naturalFiberPercent);
              return (
                <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-3 md:gap-4 active:scale-[0.98] transition-transform" data-testid={`card-designer-${designer.id}`}>
                  <div className="aspect-[3/4] bg-secondary w-full overflow-hidden relative">
                    <BrandImage name={designer.name} className="absolute inset-0 w-full h-full" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-3 left-3">
                      <QualityBadge naturalFiberPercent={designer.naturalFiberPercent} />
                    </div>
                    {designer.naturalFiberPercent != null && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-t from-black/50 to-transparent">
                        <span className="text-white text-lg md:text-2xl font-serif">{designer.naturalFiberPercent}%</span>
                        <span className="text-white/70 text-[10px] uppercase tracking-wider ml-1.5">natural</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-serif text-base md:text-lg group-hover:text-muted-foreground transition-colors">{designer.name}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{tier.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-secondary/50 -mx-4 md:-mx-8 px-4 md:px-8 py-12 md:py-24">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          <div className="flex flex-col gap-4 md:gap-6 max-w-lg">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground">Your Buying Guide</p>
            <h2 className="text-3xl md:text-5xl font-serif leading-tight">Know Your Fabrics.<br />Buy with Certainty.</h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Our material guides tell you exactly what to look for, what to avoid, and what price to expect — for every fabric that matters.
            </p>
            <Link href="/materials" className="mt-4 bg-foreground text-background px-6 py-3.5 uppercase tracking-widest text-xs font-medium hover:bg-foreground/90 transition-colors w-fit active:scale-95" data-testid="link-explore-materials">
              Read the Buying Rules
            </Link>
          </div>
          <div className="aspect-square bg-muted relative overflow-hidden">
            <img
              src={textureImage}
              alt="Material Texture"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40">
          <div className="bg-background p-6 md:p-10 flex flex-col items-center text-center gap-2">
            <span className="text-3xl md:text-5xl font-serif">{(designers as any[]).length.toLocaleString()}+</span>
            <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Brands Analyzed</span>
          </div>
          <div className="bg-background p-6 md:p-10 flex flex-col items-center text-center gap-2">
            <span className="text-3xl md:text-5xl font-serif">{exceptionalCount}</span>
            <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Exceptional Rated</span>
          </div>
          <div className="bg-background p-6 md:p-10 flex flex-col items-center text-center gap-2">
            <span className="text-3xl md:text-5xl font-serif">10</span>
            <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Material Guides</span>
          </div>
          <div className="bg-background p-6 md:p-10 flex flex-col items-center text-center gap-2">
            <span className="text-3xl md:text-5xl font-serif">5</span>
            <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Fabric Personas</span>
          </div>
        </div>
      </section>

      <section className="text-center py-12 md:py-20 max-w-2xl mx-auto flex flex-col items-center gap-5 md:gap-8">
        <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-muted-foreground">Personalized For You</p>
        <h2 className="text-2xl md:text-5xl font-serif leading-tight">Not Sure Where to Start?</h2>
        <p className="text-muted-foreground text-sm md:text-lg max-w-lg">
          Take our 2-minute quiz. We'll match you with your fabric persona and tell you exactly which designers to shop.
        </p>
        <Link href="/quiz" className="bg-foreground text-background px-8 py-3.5 md:px-10 md:py-4 uppercase tracking-widest text-xs md:text-sm font-medium hover:bg-foreground/90 transition-colors mt-2 active:scale-95" data-testid="button-cta-quiz">
          Find My Designers
        </Link>
      </section>
    </div>
  );
}
