import { useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Heart, ShoppingBag, Sparkles, ArrowRight, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { FABRIC_PERSONAS, type FabricPersona } from "@shared/personas";
import { getQualityTier, getTierColor, type QualityTier } from "@/lib/quality-tiers";
import { BrandImage } from "@/components/BrandImage";
import { guessDomain } from "@/lib/brand-images";

type ShopFilter = "for-you" | "favorites" | "exceptional" | "excellent";

function getShopUrl(designer: any): string {
  const website = designer.website || (guessDomain(designer.name) ? `https://${guessDomain(designer.name)}` : null);
  if (!website) return `/designers/${designer.slug}`;
  const url = website.startsWith("http") ? website : `https://${website}`;
  return `/leaving?url=${encodeURIComponent(url)}&brand=${encodeURIComponent(designer.name)}`;
}

function ShopCard({ designer, showShopButton = true }: { designer: any; showShopButton?: boolean }) {
  const tier = getQualityTier(designer.naturalFiberPercent);

  return (
    <div className="group flex flex-col border border-border/60 hover:border-foreground/40 transition-all" data-testid={`shop-card-${designer.slug}`}>
      <Link href={`/designers/${designer.slug}`} className="block">
        <BrandImage name={designer.name} className="aspect-[4/3] w-full" />
      </Link>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/designers/${designer.slug}`} className="flex-1 min-w-0">
            <h3 className="font-serif text-base md:text-lg truncate">{designer.name}</h3>
          </Link>
          <span className={`px-2 py-0.5 text-[8px] uppercase tracking-wider flex-shrink-0 ${getTierColor(tier.tier)}`}>
            {tier.shortLabel}
          </span>
        </div>
        {designer.naturalFiberPercent != null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-secondary overflow-hidden">
              <div className="h-full bg-foreground/70 transition-all" style={{ width: `${designer.naturalFiberPercent}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{designer.naturalFiberPercent}% natural</span>
          </div>
        )}
        {showShopButton && (
          <a
            href={getShopUrl(designer)}
            className="mt-1 flex items-center justify-center gap-2 bg-foreground text-background py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-colors active:scale-[0.98]"
            data-testid={`button-shop-${designer.slug}`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Shop {designer.name.length > 15 ? designer.name.slice(0, 15) + "…" : designer.name}
          </a>
        )}
      </div>
    </div>
  );
}

function PersonaBanner({ persona }: { persona: FabricPersona }) {
  return (
    <div className="border border-border bg-secondary/20 p-5 md:p-8 flex flex-col gap-3" data-testid="banner-persona">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-foreground/60" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your Fabric Persona</span>
      </div>
      <h2 className="font-serif text-2xl md:text-3xl">{persona.name}</h2>
      <p className="text-sm text-foreground/70 italic">{persona.tagline}</p>
      <p className="text-sm text-foreground/70 leading-relaxed max-w-2xl">{persona.description}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {persona.recommendedMaterials.map(m => (
          <span key={m} className="text-[10px] uppercase tracking-[0.15em] border border-border/60 px-2.5 py-1">{m}</span>
        ))}
      </div>
    </div>
  );
}

export default function Shop() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [filter, setFilter] = useState<ShopFilter>("for-you");

  const { data: allDesigners = [], isLoading: designersLoading } = useQuery({
    queryKey: ["designers-shop"],
    queryFn: () => fetchDesigners(undefined, 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: api.getFavorites,
    enabled: isAuthenticated,
  });

  const { data: quizResults = [] } = useQuery({
    queryKey: ["quizResults"],
    queryFn: api.getQuizResults,
    enabled: isAuthenticated,
  });

  const persona = user?.fabricPersona
    ? FABRIC_PERSONAS.find(p => p.id === user.fabricPersona) || null
    : null;

  const latestQuiz = (quizResults as any[]).length > 0 ? (quizResults as any[])[(quizResults as any[]).length - 1] : null;

  const scoredDesigners = (allDesigners as any[]).filter((d: any) => d.naturalFiberPercent != null);
  const exceptionalDesigners = scoredDesigners.filter((d: any) => d.naturalFiberPercent >= 90).sort((a: any, b: any) => b.naturalFiberPercent - a.naturalFiberPercent);
  const excellentDesigners = scoredDesigners.filter((d: any) => d.naturalFiberPercent >= 70 && d.naturalFiberPercent < 90).sort((a: any, b: any) => b.naturalFiberPercent - a.naturalFiberPercent);

  const favoriteDesigners = (favorites as any[])
    .map((fav: any) => {
      const designer = (allDesigners as any[]).find((d: any) => d.id === fav.designerId);
      return designer || fav.designer;
    })
    .filter(Boolean);

  const getPersonalizedPicks = (): any[] => {
    if (!persona && !latestQuiz) {
      return [...exceptionalDesigners.slice(0, 8), ...excellentDesigners.slice(0, 8)];
    }

    const quizMaterials = latestQuiz?.materials?.map((m: string) => m.toLowerCase()) || [];
    const personaMaterials = persona?.recommendedMaterials.map(m => m.toLowerCase()) || [];
    const allPreferredMaterials = [...new Set([...quizMaterials, ...personaMaterials])];

    const qualityDesigners = [...exceptionalDesigners, ...excellentDesigners];

    if (allPreferredMaterials.length === 0) {
      return qualityDesigners.slice(0, 16);
    }

    const scored = qualityDesigners.map((d: any) => {
      let score = d.naturalFiberPercent || 0;
      const desc = (d.description || "").toLowerCase();
      const name = (d.name || "").toLowerCase();
      for (const mat of allPreferredMaterials) {
        if (desc.includes(mat) || name.includes(mat)) {
          score += 20;
        }
      }
      if (favoriteDesigners.some((fav: any) => fav?.id === d.id)) {
        score += 10;
      }
      return { ...d, _score: score };
    });

    scored.sort((a: any, b: any) => b._score - a._score);
    return scored.slice(0, 24);
  };

  const personalizedPicks = getPersonalizedPicks();

  const getFilteredDesigners = (): any[] => {
    switch (filter) {
      case "for-you":
        return personalizedPicks;
      case "favorites":
        return favoriteDesigners;
      case "exceptional":
        return exceptionalDesigners.slice(0, 24);
      case "excellent":
        return excellentDesigners.slice(0, 24);
      default:
        return personalizedPicks;
    }
  };

  const filteredDesigners = getFilteredDesigners();
  const isLoading = authLoading || designersLoading;

  const filterTabs: { key: ShopFilter; label: string; count?: number }[] = [
    { key: "for-you", label: isAuthenticated && persona ? "For You" : "Top Picks" },
    ...(isAuthenticated ? [{ key: "favorites" as ShopFilter, label: "Saved", count: favoriteDesigners.length }] : []),
    { key: "exceptional", label: "Exceptional", count: exceptionalDesigners.length },
    { key: "excellent", label: "Excellent", count: excellentDesigners.length },
  ];

  return (
    <div className="py-6 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col gap-3 md:gap-5">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-foreground/60" />
          <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
            {isAuthenticated && persona ? "Curated for You" : "Shop the Standard"}
          </span>
        </div>
        <h1 className="text-3xl md:text-6xl font-serif" data-testid="text-shop-title">
          {isAuthenticated && persona ? "Your Edit" : "Shop"}
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm md:text-base leading-relaxed">
          {isAuthenticated && persona
            ? `Designers selected for ${persona.name}. Every brand here meets the INTERTEXE standard — just pick what you love and shop.`
            : "Every designer here has been vetted for material quality. Browse by tier, find your favorites, and shop directly from the brands you trust."
          }
        </p>
      </header>

      {isAuthenticated && persona && (
        <PersonaBanner persona={persona} />
      )}

      {!isAuthenticated && (
        <div className="border border-dashed border-border/60 p-5 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-secondary/10">
          <div className="flex flex-col gap-2">
            <h3 className="font-serif text-lg md:text-xl">Get personalized picks</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Take the 2-minute quiz to discover your fabric persona. We'll curate a shopping page tailored to your material preferences.
            </p>
          </div>
          <Link href="/quiz" className="flex items-center gap-2 bg-foreground text-background px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-colors active:scale-[0.98] flex-shrink-0" data-testid="link-shop-quiz">
            <Sparkles className="w-3.5 h-3.5" />
            Take the Quiz
          </Link>
        </div>
      )}

      {isAuthenticated && !persona && (
        <div className="border border-dashed border-border/60 p-5 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-secondary/10">
          <div className="flex flex-col gap-2">
            <h3 className="font-serif text-lg md:text-xl">Personalize your shop</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Take the quiz to unlock picks matched to your material standards and fabric persona.
            </p>
          </div>
          <Link href="/quiz" className="flex items-center gap-2 bg-foreground text-background px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-colors active:scale-[0.98] flex-shrink-0" data-testid="link-shop-quiz">
            <Sparkles className="w-3.5 h-3.5" />
            Take the Quiz
          </Link>
        </div>
      )}

      <div className="flex gap-2 md:gap-3 border-b border-border/40 pb-0 overflow-x-auto no-scrollbar">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 md:px-5 py-2.5 md:py-3 text-[10px] md:text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 ${
              filter === tab.key
                ? "border-foreground text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-shop-${tab.key}`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[9px] opacity-50">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-[4/3] bg-secondary" />
              <div className="p-4 flex flex-col gap-3">
                <div className="h-5 bg-secondary w-3/4" />
                <div className="h-10 bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDesigners.length === 0 ? (
        <div className="py-16 md:py-24 text-center flex flex-col items-center gap-4">
          {filter === "favorites" ? (
            <>
              <Heart className="w-10 h-10 text-muted-foreground/20" />
              <p className="text-muted-foreground">You haven't saved any designers yet.</p>
              <Link href="/designers" className="text-xs uppercase tracking-[0.15em] border-b border-foreground pb-1" data-testid="link-browse-directory">
                Browse the Directory
              </Link>
            </>
          ) : (
            <>
              <ShoppingBag className="w-10 h-10 text-muted-foreground/20" />
              <p className="text-muted-foreground">No designers match this filter.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
          {filteredDesigners.map((designer: any) => (
            <ShopCard key={designer.id || designer.slug} designer={designer} />
          ))}
        </div>
      )}

      {filteredDesigners.length > 0 && (filter === "for-you" || filter === "exceptional" || filter === "excellent") && (
        <div className="text-center pt-4">
          <Link
            href="/designers"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors border-b border-border/40 hover:border-foreground pb-1"
            data-testid="link-view-all-directory"
          >
            View Full Directory
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
