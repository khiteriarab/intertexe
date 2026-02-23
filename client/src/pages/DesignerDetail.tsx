import { useParams, Link } from "wouter";
import { Heart, ChevronLeft, ExternalLink, CheckCircle2, AlertTriangle, Info, Sparkles, ShoppingBag, MapPin, Calendar, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fetchDesignerBySlug, fetchProductsByBrand } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import { getQualityTier, getTierColor, getTierAccent } from "@/lib/quality-tiers";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { getBrandProfile, getTierLabel, type BrandProfile } from "@/lib/brand-profiles";
import { BrandImage } from "@/components/BrandImage";

function SimilarBrandCard({ brand, index }: { brand: any; index: number }) {
  const brandTier = getQualityTier(brand.naturalFiberPercent);

  const card = (
    <div className="bg-secondary/30 border border-border/20 hover:border-border/50 transition-all flex flex-col group" data-testid={`card-similar-${index}`}>
      <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
        <BrandImage name={brand.name} className="absolute inset-0 w-full h-full" />
        {brand.naturalFiberPercent != null && (
          <div className="absolute top-2 left-2 z-10">
            <span className={`px-2 py-0.5 text-[8px] md:text-[9px] uppercase tracking-[0.1em] font-medium ${getTierColor(brandTier.tier)}`}>
              {brandTier.shortLabel}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
        <h3 className="font-serif text-sm md:text-base leading-snug">{brand.name}</h3>
        {brand.reason && (
          <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed line-clamp-2">{brand.reason}</p>
        )}
        {brand.naturalFiberPercent != null && (
          <div className="flex items-center gap-1.5 mt-auto pt-2">
            <div className="w-12 h-1 bg-secondary relative overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-foreground/60" style={{ width: `${brand.naturalFiberPercent}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{brand.naturalFiberPercent}%</span>
          </div>
        )}
      </div>
    </div>
  );

  return brand.slug ? (
    <Link href={`/designers/${brand.slug}`} className="contents">
      {card}
    </Link>
  ) : (
    <div>{card}</div>
  );
}

function BrandProfileSection({ profile }: { profile: BrandProfile }) {
  return (
    <div className="flex flex-col gap-5 py-5 md:py-6 border-y border-border/40" data-testid="section-brand-profile">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.15em] font-medium bg-foreground/5 border border-border/30" data-testid="badge-brand-tier">
          {getTierLabel(profile.tier)}
        </span>
        {profile.priceRange && (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.1em] text-muted-foreground border border-border/20" data-testid="text-price-range">
            <Tag className="w-3 h-3" />
            {profile.priceRange}
          </span>
        )}
        {profile.headquarters && (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.1em] text-muted-foreground border border-border/20" data-testid="text-headquarters">
            <MapPin className="w-3 h-3" />
            {profile.headquarters}
          </span>
        )}
        {profile.foundedYear && (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.1em] text-muted-foreground border border-border/20" data-testid="text-founded">
            <Calendar className="w-3 h-3" />
            Est. {profile.foundedYear}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Material Strengths</span>
        <div className="flex flex-wrap gap-2" data-testid="section-material-strengths">
          {profile.materialStrengths.map((mat) => (
            <span
              key={mat}
              className="px-3 py-1.5 text-[10px] md:text-xs uppercase tracking-[0.1em] font-medium bg-foreground text-background"
              data-testid={`tag-material-${mat.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {mat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

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

  const profile = slug ? getBrandProfile(slug) : null;

  useSEO({
    title: designer ? `${designer.name} Quality Review 2026 — Natural Fiber Score` : undefined,
    description: designer
      ? profile?.intro || designer.description || `Explore ${designer.name}'s commitment to natural fibers and material quality on INTERTEXE.`
      : undefined,
  });

  const { data: favStatus } = useQuery({
    queryKey: ["favoriteCheck", designer?.id],
    queryFn: () => api.checkFavorite(designer!.id),
    enabled: !!designer?.id,
  });

  const { data: products } = useQuery({
    queryKey: ["products", slug],
    queryFn: () => fetchProductsByBrand(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  });

  const { data: similarBrands, isLoading: similarLoading } = useQuery({
    queryKey: ["similar", slug],
    queryFn: async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`/api/designers/${slug}/similar`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error("API unavailable");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
        throw new Error("Empty response");
      } catch {
        const { getSimilarBrands } = await import("@/lib/brand-profiles");
        return getSimilarBrands(slug!, 6);
      }
    },
    enabled: !!designer,
    staleTime: 1000 * 60 * 30,
    retry: 0,
  });

  const isSaved = favStatus?.favorited || false;

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await api.removeFavorite(designer!.id);
      } else {
        await api.addFavorite(designer!.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favoriteCheck", designer?.id] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast({
        title: isSaved ? "Removed from wishlist" : "Saved to wishlist",
        description: `${designer!.name} has been ${isSaved ? "removed from" : "added to"} your favorites.`,
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

  const enrichedDesigner = designer.naturalFiberPercent == null
    ? { ...designer, naturalFiberPercent: getCuratedScore(designer.name) }
    : designer;
  const tier = getQualityTier(enrichedDesigner.naturalFiberPercent);

  const aboutText = profile?.intro
    || designer.description
    || `${designer.name} is a fashion brand in our directory. Material composition details are being compiled by our editorial team.`;

  return (
    <div className="py-8 md:py-12 flex flex-col gap-10 md:gap-12 max-w-4xl mx-auto w-full">
      <Link href="/designers" className="flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground w-fit transition-colors active:scale-95" data-testid="link-back">
          <ChevronLeft className="w-4 h-4" /> Back to Directory
      </Link>

      <header className="flex flex-col md:flex-row gap-6 md:gap-16 items-start">
        <div className="w-full aspect-[4/3] relative overflow-hidden flex-shrink-0 md:hidden -mx-4">
          <BrandImage name={designer.name} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
            <h1 className="text-2xl font-serif text-white leading-tight drop-shadow-lg" data-testid="text-designer-name-mobile">{designer.name}</h1>
            <span className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-medium w-fit ${getTierColor(tier.tier)}`}>
              {tier.verdict}
            </span>
          </div>
        </div>

        <div className="w-full md:w-1/3 aspect-[3/4] relative overflow-hidden flex-shrink-0 hidden md:block">
          <BrandImage name={designer.name} className="absolute inset-0 w-full h-full" />
          <div className="absolute top-4 left-4 z-10">
            <span className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-medium ${getTierColor(tier.tier)}`}>
              {tier.verdict}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 md:gap-6 flex-1 w-full">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start w-full gap-3">
              <h1 className="hidden md:block text-5xl font-serif leading-tight" data-testid="text-designer-name">{designer.name}</h1>
              <button
                onClick={() => toggleFav.mutate()}
                className="p-3 bg-secondary hover:bg-secondary/80 transition-colors flex-shrink-0 active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center"
                data-testid={`button-save-${designer.slug}`}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-foreground text-foreground' : 'text-foreground'}`} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`hidden md:inline-block px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-medium ${getTierColor(tier.tier)}`}>
                {tier.verdict}
              </span>
              {profile && (
                <span className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border border-foreground/20 text-foreground/70">
                  {getTierLabel(profile.tier)}
                </span>
              )}
              <span className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border ${
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
            {enrichedDesigner.naturalFiberPercent != null ? (
              <>
                <div className="flex items-baseline gap-2 md:gap-3">
                  <span className="text-4xl md:text-6xl font-serif">{enrichedDesigner.naturalFiberPercent}%</span>
                  <span className="text-sm text-muted-foreground font-serif italic">Natural Fibers</span>
                </div>
                <div className="w-full h-1.5 md:h-2 bg-secondary mt-1 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-foreground transition-all duration-700"
                    style={{ width: `${enrichedDesigner.naturalFiberPercent}%` }}
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

          {profile && <BrandProfileSection profile={profile} />}

          <div className="flex flex-col gap-3">
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">About {designer.name}</span>
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed font-light">
              {aboutText}
            </p>
          </div>

          {designer.website ? (
            <Link
              href={`/leaving?url=${encodeURIComponent(designer.website)}&brand=${encodeURIComponent(designer.name)}`}
              className="flex items-center justify-center gap-3 w-full bg-foreground text-background px-8 py-[14px] md:py-4 uppercase tracking-widest text-xs hover:bg-foreground/90 transition-colors active:scale-[0.98] mt-2"
              data-testid={`link-shop-${designer.slug}`}
            >
              Shop {designer.name} <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div className="flex items-center justify-center gap-3 w-full border border-border/40 text-muted-foreground px-8 py-[14px] md:py-4 uppercase tracking-widest text-xs mt-2 cursor-default" data-testid={`link-shop-${designer.slug}-pending`}>
              Website coming soon
            </div>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-5" data-testid="section-browse-collection">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-4 h-4 text-foreground/60" />
          <h2 className="text-xs uppercase tracking-[0.2em] font-medium">
            {products && products.filter((p: any) => p.image_url || p.imageUrl).length > 0 ? `${products.filter((p: any) => p.image_url || p.imageUrl).length} Verified Pieces` : `Browse ${designer.name}`}
          </h2>
        </div>

        {products && products.filter((p: any) => p.image_url || p.imageUrl).length > 0 ? (
          <>
            <p className="text-sm text-foreground/70 leading-relaxed">
              Every item below has been verified by INTERTEXE — only pieces with ≥50% natural fiber composition make this list.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {products.filter((p: any) => p.image_url || p.imageUrl).map((product: any) => (
                <a
                  key={product.product_id || product.productId}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col"
                  data-testid={`card-product-${product.product_id || product.productId}`}
                >
                  <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                    {(product.image_url || product.imageUrl) ? (
                      <img
                        src={product.image_url || product.imageUrl}
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
                        {product.natural_fiber_percent || product.naturalFiberPercent}% natural
                      </span>
                    </div>
                  </div>
                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    <h3 className="text-xs md:text-sm leading-snug line-clamp-2 font-medium">{product.name}</h3>
                    <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1">{product.composition}</p>
                    {(product.price) && (
                      <p className="text-xs font-medium mt-auto pt-1">{product.price}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground/70 leading-relaxed">
              {profile
                ? `We're currently verifying ${designer.name}'s product compositions. ${profile.materialStrengths ? `Based on our analysis, look for pieces in ${profile.materialStrengths.slice(0, 3).join(', ').toLowerCase()} for the best natural fiber content.` : ''}`
                : `Product verification for ${designer.name} is in progress. Check back soon for verified pieces with natural fiber compositions.`}
            </p>
            {designer.website && (
              <Link
                href={`/leaving?url=${encodeURIComponent(designer.website)}&brand=${encodeURIComponent(designer.name)}`}
                className="flex items-center justify-center gap-3 w-full border border-foreground/20 hover:border-foreground/40 text-foreground px-8 py-3.5 uppercase tracking-widest text-[10px] md:text-xs transition-colors active:scale-[0.98]"
                data-testid={`link-browse-${designer.slug}`}
              >
                Browse on {designer.name.split(' ').length > 3 ? 'their site' : `${designer.name}.com`} <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-6" data-testid="section-similar-brands">
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-foreground/60" />
          <h2 className="text-xs uppercase tracking-[0.2em] font-medium">If You Love {designer.name}, You'll Love</h2>
        </div>

        {similarLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-secondary animate-pulse flex flex-col">
                <div className="aspect-[4/3]" />
                <div className="p-4 flex flex-col gap-2">
                  <div className="h-4 bg-secondary/80 w-2/3" />
                  <div className="h-3 bg-secondary/60 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : similarBrands && similarBrands.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {similarBrands.map((brand: any, i: number) => (
              <SimilarBrandCard key={i} brand={brand} index={i} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic" data-testid="text-similar-loading">Curating recommendations...</p>
        )}
      </section>
    </div>
  );
}
