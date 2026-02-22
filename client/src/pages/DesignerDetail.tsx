import { useParams, Link } from "wouter";
import { Heart, ChevronLeft, ExternalLink, CheckCircle2, AlertTriangle, Info, Sparkles, Star, ThumbsUp, Trash2, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fetchDesignerBySlug } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import { getQualityTier, getTierColor, getTierAccent } from "@/lib/quality-tiers";
import { getBrandScreenshotUrl } from "@/lib/brand-images";
import { BrandImage } from "@/components/BrandImage";
import { useState } from "react";

function SimilarBrandCard({ brand, index }: { brand: any; index: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const brandTier = getQualityTier(brand.naturalFiberPercent);
  const screenshotUrl = getBrandScreenshotUrl(brand.name, 400);

  const card = (
    <div className="bg-secondary/30 border border-border/20 hover:border-border/50 transition-all flex flex-col group" data-testid={`card-similar-${index}`}>
      <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
        {screenshotUrl && !imgFailed ? (
          <img
            src={screenshotUrl}
            alt={`${brand.name} website`}
            className="absolute inset-0 w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-3xl md:text-4xl text-muted-foreground/15 group-hover:text-muted-foreground/25 transition-colors">
              {brand.name.charAt(0)}
            </span>
          </div>
        )}
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

function StarRating({ value, onChange, size = "md" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex gap-0.5" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className={`${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          disabled={!onChange}
          data-testid={`star-${star}`}
        >
          <Star className={`${sz} ${star <= value ? 'fill-foreground text-foreground' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewSection({ designerSlug, designerName }: { designerSlug: string; designerName: string }) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [fabricQuality, setFabricQuality] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [productName, setProductName] = useState("");

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["reviews", designerSlug],
    queryFn: () => api.getReviews(designerSlug),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.submitReview({
      designerSlug,
      rating,
      fabricQuality: fabricQuality || undefined,
      title: title || undefined,
      body: body || undefined,
      productName: productName || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", designerSlug] });
      setShowForm(false);
      setRating(0);
      setFabricQuality(0);
      setTitle("");
      setBody("");
      setProductName("");
      toast({ title: "Review submitted", description: "Thank you for sharing your experience." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => api.deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", designerSlug] });
      toast({ title: "Review deleted" });
    },
  });

  const helpfulMutation = useMutation({
    mutationFn: (reviewId: string) => api.voteHelpful(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", designerSlug] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message });
    },
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const avgFabric = reviews.filter((r: any) => r.fabricQuality).length > 0
    ? (reviews.filter((r: any) => r.fabricQuality).reduce((sum: number, r: any) => sum + r.fabricQuality, 0) / reviews.filter((r: any) => r.fabricQuality).length).toFixed(1)
    : null;

  const userAlreadyReviewed = reviews.some((r: any) => r.userId === (user as any)?.id);

  return (
    <section className="flex flex-col gap-6" data-testid="section-reviews">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-foreground/60" />
          <h2 className="text-xs uppercase tracking-[0.2em] font-medium">Community Reviews</h2>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(Number(avgRating))} size="sm" />
            <span className="text-sm font-medium">{avgRating}</span>
            <span className="text-xs text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {avgRating && (
        <div className="grid grid-cols-3 gap-3 p-5 bg-secondary/30 border border-border/20">
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl md:text-3xl font-serif">{avgRating}</span>
            <StarRating value={Math.round(Number(avgRating))} size="sm" />
            <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Overall</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-l border-border/30 pl-3">
            {avgFabric ? (
              <>
                <span className="text-2xl md:text-3xl font-serif">{avgFabric}</span>
                <StarRating value={Math.round(Number(avgFabric))} size="sm" />
              </>
            ) : (
              <span className="text-2xl md:text-3xl font-serif text-muted-foreground/40">--</span>
            )}
            <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Fabric</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-l border-border/30 pl-3">
            <span className="text-2xl md:text-3xl font-serif">{reviews.length}</span>
            <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Reviews</span>
          </div>
        </div>
      )}

      {isAuthenticated && !userAlreadyReviewed && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border border-border/40 py-3 text-xs uppercase tracking-widest hover:bg-secondary/50 transition-colors active:scale-[0.99]"
          data-testid="button-write-review"
        >
          Write a Review
        </button>
      )}

      {!isAuthenticated && (
        <div className="text-center py-4 border border-border/20 bg-secondary/20">
          <p className="text-xs text-muted-foreground">
            <Link href="/account" className="underline">Sign in</Link> to leave a review
          </p>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (rating > 0) submitMutation.mutate(); }}
          className="flex flex-col gap-5 p-5 md:p-6 bg-secondary/20 border border-border/30"
          data-testid="form-review"
        >
          <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Your Review of {designerName}</h3>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Overall Rating *</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Fabric Quality Rating</label>
            <StarRating value={fabricQuality} onChange={setFabricQuality} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Product Name (optional)</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Wool Blend Overcoat"
              className="px-3 py-2.5 bg-background border border-border/40 text-sm focus:outline-none focus:border-foreground/50"
              data-testid="input-product-name"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              className="px-3 py-2.5 bg-background border border-border/40 text-sm focus:outline-none focus:border-foreground/50"
              data-testid="input-review-title"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Your Review</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share details about fabric quality, craftsmanship, value for price..."
              rows={4}
              className="px-3 py-2.5 bg-background border border-border/40 text-sm focus:outline-none focus:border-foreground/50 resize-none"
              data-testid="input-review-body"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={rating === 0 || submitMutation.isPending}
              className="flex-1 bg-foreground text-background py-3 text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-foreground/90 transition-colors active:scale-[0.98]"
              data-testid="button-submit-review"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Review"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-3 border border-border/40 text-xs uppercase tracking-widest hover:bg-secondary/50 transition-colors"
              data-testid="button-cancel-review"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {reviewsLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-secondary/30 animate-pulse p-5 h-32" />
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="flex flex-col gap-4">
          {reviews.map((review: any) => (
            <div key={review.id} className="flex flex-col gap-3 p-5 border border-border/20 bg-secondary/10" data-testid={`review-${review.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <StarRating value={review.rating} size="sm" />
                    {review.fabricQuality && (
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground border-l border-border/30 pl-2.5">
                        Fabric: {review.fabricQuality}/5
                      </span>
                    )}
                  </div>
                  {review.title && <h4 className="text-sm font-medium">{review.title}</h4>}
                </div>
                {(user as any)?.id === review.userId && (
                  <button
                    onClick={() => deleteMutation.mutate(review.id)}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`button-delete-review-${review.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {review.productName && (
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Product: {review.productName}
                </span>
              )}

              {review.body && (
                <p className="text-sm text-foreground/80 leading-relaxed">{review.body}</p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/10">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">{review.userName}</span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                {isAuthenticated && (user as any)?.id !== review.userId && (
                  <button
                    onClick={() => helpfulMutation.mutate(review.id)}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`button-helpful-${review.id}`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    Helpful {review.helpfulCount > 0 && `(${review.helpfulCount})`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border border-border/10 bg-secondary/10">
          <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your experience with {designerName}.</p>
        </div>
      )}
    </section>
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

  useSEO({
    title: designer ? `${designer.name} — Material Quality & Natural Fiber Score` : undefined,
    description: designer
      ? designer.description || `Explore ${designer.name}'s commitment to natural fibers and material quality on INTERTEXE.`
      : undefined,
  });

  const { data: favStatus } = useQuery({
    queryKey: ["favoriteCheck", designer?.id],
    queryFn: () => api.checkFavorite(designer!.id),
    enabled: !!designer?.id,
  });

  const { data: similarBrands, isLoading: similarLoading } = useQuery({
    queryKey: ["similar", slug],
    queryFn: async () => {
      const res = await fetch(`/api/designers/${slug}/similar`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!designer,
    staleTime: 1000 * 60 * 30,
    retry: 1,
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

  const tier = getQualityTier(designer.naturalFiberPercent);

  return (
    <div className="py-8 md:py-12 flex flex-col gap-10 md:gap-12 max-w-4xl mx-auto w-full">
      <Link href="/designers" className="flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground w-fit transition-colors active:scale-95" data-testid="link-back">
          <ChevronLeft className="w-4 h-4" /> Back to Directory
      </Link>

      <header className="flex flex-col md:flex-row gap-6 md:gap-16 items-start">
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
              Visit {designer.name} <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div className="flex items-center justify-center gap-3 w-full border border-border/40 text-muted-foreground px-8 py-4 uppercase tracking-widest text-[10px] md:text-xs mt-2 cursor-default" data-testid={`link-shop-${designer.slug}-pending`}>
              Website coming soon
            </div>
          )}
        </div>
      </header>

      <ReviewSection designerSlug={designer.slug} designerName={designer.name} />

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
