import { useParams, Link } from "wouter";
import { Heart, ChevronLeft, ExternalLink, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fetchDesignerBySlug } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import { getQualityTier, getTierColor, getTierAccent } from "@/lib/quality-tiers";

export default function DesignerDetail() {
  const { slug } = useParams();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: designer, isLoading } = useQuery({
    queryKey: ["designer", slug],
    queryFn: () => fetchDesignerBySlug(slug!),
    enabled: !!slug,
  });

  useSEO({
    title: designer ? `${designer.name} — Material Quality & Natural Fiber Score` : undefined,
    description: designer
      ? designer.description || `Explore ${designer.name}'s commitment to natural fibers and material quality on INTERTEXE.`
      : undefined,
  });

  const { data: favStatus } = useQuery({
    queryKey: ["favoriteCheck", designer?.id],
    queryFn: () => api.checkFavorite(designer.id),
    enabled: !!designer?.id,
  });

  const isSaved = favStatus?.favorited || false;

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await api.removeFavorite(designer.id);
      } else {
        await api.addFavorite(designer.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favoriteCheck", designer?.id] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast({
        title: isSaved ? "Removed from wishlist" : "Saved to wishlist",
        description: `${designer.name} has been ${isSaved ? "removed from" : "added to"} your favorites.`,
      });
    },
    onError: (err: any) => {
      if (!isAuthenticated) {
        toast({ title: "Sign in required", description: "Create an account to save favorites." });
      } else {
        toast({ title: "Error", description: err.message });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="py-8 md:py-12 flex flex-col gap-12 max-w-4xl mx-auto w-full animate-pulse">
        <div className="h-4 w-32 bg-secondary" />
        <div className="flex flex-col md:flex-row gap-16">
          <div className="w-full md:w-1/3 aspect-[3/4] bg-secondary" />
          <div className="flex-1 flex flex-col gap-8">
            <div className="h-12 bg-secondary w-3/4" />
            <div className="h-6 bg-secondary w-1/4" />
            <div className="h-32 bg-secondary w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!designer) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-4">
        <h1 className="text-2xl font-serif">Designer not found</h1>
        <Link href="/designers" className="border-b border-foreground pb-1 text-sm uppercase tracking-widest hover:text-muted-foreground transition-colors">
            Back to Directory
        </Link>
      </div>
    );
  }

  const tier = getQualityTier(designer.naturalFiberPercent);

  return (
    <div className="py-8 md:py-12 flex flex-col gap-10 md:gap-12 max-w-4xl mx-auto w-full">
      <Link href="/designers" className="flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground w-fit transition-colors active:scale-95" data-testid="link-back">
          <ChevronLeft className="w-4 h-4" /> Back to Directory
      </Link>

      <header className="flex flex-col md:flex-row gap-6 md:gap-16 items-start">
        <div className="w-full md:w-1/3 aspect-[3/4] bg-secondary relative overflow-hidden flex-shrink-0 hidden md:block">
          <div className="absolute inset-0 flex items-center justify-center font-serif text-6xl md:text-8xl text-muted-foreground/20">
            {designer.name.charAt(0)}
          </div>
          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-medium ${getTierColor(tier.tier)}`}>
              {tier.verdict}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 md:gap-6 flex-1 w-full">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start w-full gap-3">
              <h1 className="text-[28px] leading-[1.15] md:text-5xl font-serif md:leading-tight" data-testid="text-designer-name">{designer.name}</h1>
              <button
                onClick={() => toggleFav.mutate()}
                className="p-2.5 md:p-3 bg-secondary hover:bg-secondary/80 transition-colors flex-shrink-0 active:scale-90 mt-0.5"
                data-testid={`button-save-${designer.slug}`}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-foreground text-foreground' : 'text-foreground'}`} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-medium ${getTierColor(tier.tier)}`}>
                {tier.verdict}
              </span>
              <span className={`px-3 py-1 text-[10px] uppercase tracking-[0.15em] border ${
                designer.status === 'live' ? 'border-foreground text-foreground' : 'border-muted-foreground text-muted-foreground'
              }`}>
                {designer.status}
              </span>
            </div>
          </div>

          <div className={`flex flex-col gap-4 p-5 md:p-6 border-l-[3px] ${getTierAccent(tier.tier)} bg-secondary/30`} data-testid="section-verdict">
            <div className="flex items-center gap-2">
              {tier.tier === 'exceptional' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : tier.tier === 'excellent' ? (
                <CheckCircle2 className="w-4 h-4 text-foreground/70" />
              ) : tier.tier === 'good' ? (
                <Info className="w-4 h-4 text-foreground/60" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              )}
              <h3 className="text-xs uppercase tracking-[0.2em] font-medium">The INTERTEXE Verdict</h3>
            </div>
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{tier.description}</p>
            <p className="text-sm text-foreground/70 italic">{tier.buyingAdvice}</p>
          </div>

          <div className="flex flex-col gap-3 py-5 md:py-6 border-y border-border/40">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Natural Fiber Score</span>
            {designer.naturalFiberPercent != null ? (
              <>
                <div className="flex items-baseline gap-2 md:gap-3">
                  <span className="text-4xl md:text-6xl font-serif">{designer.naturalFiberPercent}%</span>
                  <span className="text-sm text-muted-foreground font-serif italic">Natural Fibers</span>
                </div>
                <div className="w-full h-1.5 md:h-2 bg-secondary mt-1 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-foreground transition-all duration-700"
                    style={{ width: `${designer.naturalFiberPercent}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl md:text-4xl font-serif text-muted-foreground/60">--</span>
                <span className="text-sm text-muted-foreground">Score pending review</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">About the Brand</span>
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed font-light">
              {designer.description || `${designer.name} is a fashion brand in our directory. Material composition details are being compiled by our editorial team.`}
            </p>
          </div>

          {designer.website ? (
            <Link
              href={`/leaving?url=${encodeURIComponent(designer.website)}&brand=${encodeURIComponent(designer.name)}`}
              className="flex items-center justify-center gap-3 w-full bg-foreground text-background px-8 py-4 uppercase tracking-widest text-[10px] md:text-xs hover:bg-foreground/90 transition-colors active:scale-[0.98] mt-2"
              data-testid={`link-shop-${designer.slug}`}
            >
              Shop {designer.name} <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div className="flex items-center justify-center gap-3 w-full border border-border/40 text-muted-foreground px-8 py-4 uppercase tracking-widest text-[10px] md:text-xs mt-2 cursor-default" data-testid={`link-shop-${designer.slug}-pending`}>
              Shop link coming soon
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
