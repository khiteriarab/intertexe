import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { User, Heart, List, LogOut, Eye, EyeOff, ChevronRight, Sparkles, Leaf, ExternalLink, ShoppingBag, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";
import { useToast } from "@/hooks/use-toast";
import { FABRIC_PERSONAS } from "@shared/personas";
import { BrandImage } from "@/components/BrandImage";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import { fetchProductsByIds } from "@/lib/supabase";

export default function Account() {
  const { user, isLoading: authLoading, isAuthenticated, login, signup, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  if (authLoading) {
    return (
      <div className="py-20 flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-48 bg-secondary" />
          <div className="h-4 w-32 bg-secondary" />
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <AccountDashboard user={user} onLogout={() => {
      logout.mutate(undefined, {
        onSuccess: () => {
          toast({ title: "Logged out successfully" });
          setLocation("/");
        }
      });
    }} />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      login.mutate({ username: form.email, password: form.password }, {
        onSuccess: () => {
          toast({ title: "Welcome back!" });
        },
        onError: (err: any) => toast({ title: "Login failed", description: err.message, variant: "destructive" }),
      });
    } else {
      signup.mutate({ username: form.email, email: form.email, password: form.password, name: form.name || undefined }, {
        onSuccess: () => {
          toast({ title: "Welcome to INTERTEXE!" });
          setLocation("/quiz");
        },
        onError: (err: any) => toast({ title: "Signup failed", description: err.message, variant: "destructive" }),
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8 md:py-16 px-2">
      <div className="flex flex-col items-center w-full max-w-md gap-8 md:gap-10">
        <div className="text-center flex flex-col gap-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {mode === "login" ? "Sign In" : "Join Us"}
          </span>
          <h1 className="text-3xl md:text-4xl font-serif">{mode === "login" ? "Welcome Back" : "Create Account"}</h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-xs mx-auto">
            {mode === "login"
              ? "Sign in to access your wishlist and personalized recommendations."
              : "Join INTERTEXE to discover your fabric persona and save your favorite designers."
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          {mode === "signup" && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-border/60 px-4 py-4 text-sm bg-background focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/40"
                placeholder="Your name"
                data-testid="input-name" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-border/60 px-4 py-4 text-sm bg-background focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/40"
              placeholder="you@example.com"
              required data-testid="input-email" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-border/60 px-4 py-4 text-sm bg-background focus:outline-none focus:border-foreground transition-colors pr-14 placeholder:text-muted-foreground/40"
                placeholder="Your password"
                required data-testid="input-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground p-1.5 active:scale-90 transition-transform">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={login.isPending || signup.isPending}
            className="mt-2 bg-foreground text-background py-4 uppercase tracking-[0.2em] text-xs font-medium hover:bg-foreground/90 transition-all disabled:opacity-50 active:scale-[0.98]"
            data-testid="button-submit-auth">
            {(login.isPending || signup.isPending) ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="w-full border border-border/60 py-4 uppercase tracking-[0.2em] text-xs font-medium text-foreground hover:border-foreground transition-colors active:scale-[0.98]"
          data-testid="button-toggle-auth-mode">
          {mode === "login" ? "Create an Account" : "Sign In Instead"}
        </button>
      </div>
    </div>
  );
}

function AccountDashboard({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"account" | "wishlist" | "quiz">("account");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { favorites: productFavIds, toggle: toggleProductFav, count: productFavCount } = useProductFavorites();

  const { data: favorites = [], isLoading: favsLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: api.getFavorites,
  });

  const productFavIdArray = [...productFavIds];
  const { data: savedProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["saved-products", productFavIdArray.sort().join(",")],
    queryFn: () => fetchProductsByIds(productFavIdArray),
    enabled: productFavIdArray.length > 0,
    staleTime: 60_000,
  });

  const { data: quizResults = [] } = useQuery({
    queryKey: ["quizResults"],
    queryFn: api.getQuizResults,
  });

  const removeFav = useMutation({
    mutationFn: (designerId: string) => api.removeFavorite(designerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast({ title: "Removed from wishlist" });
    },
  });

  const handleTabChange = (tab: "account" | "wishlist" | "quiz") => {
    setActiveTab(tab);
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const persona = user.fabricPersona
    ? FABRIC_PERSONAS.find(p => p.id === user.fabricPersona)
    : null;

  const menuItems = [
    { id: "account" as const, icon: User, label: "Profile" },
    { id: "wishlist" as const, icon: Heart, label: "Wishlist" },
    { id: "quiz" as const, icon: List, label: "Quiz" },
  ];

  return (
    <div className="py-6 md:py-12 flex flex-col gap-6 md:gap-0 md:flex-row md:gap-12">
      <aside className="w-full md:w-64 shrink-0 flex flex-col gap-5 md:gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-3xl font-serif" data-testid="text-account-title">Account</h1>
          <p className="text-muted-foreground text-sm" data-testid="text-welcome-name">Welcome, {user.name || user.email}</p>
        </div>

        <div className="flex md:flex-col gap-1.5 md:gap-1 -mx-4 px-4 md:mx-0 md:px-0">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => handleTabChange(item.id)}
              className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-2.5 py-3 md:py-3 px-3 md:px-4 md:-mx-4 transition-all text-[10px] md:text-sm uppercase tracking-[0.15em] md:tracking-widest whitespace-nowrap text-center md:text-left ${
                activeTab === item.id
                  ? "bg-foreground text-background md:bg-secondary/80 md:text-foreground font-medium"
                  : "bg-secondary/40 md:bg-transparent hover:bg-secondary/60 md:hover:bg-secondary/50 text-foreground/70 md:text-foreground"
              }`}
              data-testid={`button-tab-${item.id}`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              {item.id === "wishlist" && ((favorites as any[]).length + productFavCount) > 0 && (
                <span className="ml-auto text-[9px] opacity-60 hidden md:inline">{(favorites as any[]).length + productFavCount}</span>
              )}
              {item.id === "quiz" && (quizResults as any[]).length > 0 && (
                <span className="ml-auto text-[9px] opacity-60 hidden md:inline">{(quizResults as any[]).length}</span>
              )}
            </button>
          ))}
        </div>

        <button onClick={onLogout}
          className="hidden md:flex items-center gap-3 py-3 px-4 -mx-4 hover:bg-secondary/50 transition-colors text-sm uppercase tracking-widest text-muted-foreground mt-4 text-left whitespace-nowrap"
          data-testid="button-logout">
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Log Out
        </button>
      </aside>

      <div ref={contentRef} className="flex-1 flex flex-col gap-8 md:gap-12 scroll-mt-20">
        {activeTab === "account" && (
          <section className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-300">
            <h2 className="text-xl md:text-2xl font-serif border-b border-border/40 pb-3 md:pb-4">Your Profile</h2>

            {persona && (
              <div className="border border-border p-5 md:p-6 flex flex-col gap-3 bg-secondary/10" data-testid="card-persona">
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4" />
                  <span className="text-[10px] md:text-xs uppercase tracking-[0.15em] text-muted-foreground">Your Fabric Persona</span>
                </div>
                <h3 className="text-xl md:text-2xl font-serif" data-testid="text-persona-name">{persona.name}</h3>
                <p className="text-sm text-foreground/70 italic">{persona.tagline}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{persona.description}</p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-x-6 sm:gap-y-2 text-xs text-muted-foreground pt-3 border-t border-border/20 mt-1">
                  <span>Core Value: {persona.coreValue}</span>
                  <span>You Buy For: {persona.buysFor}</span>
                </div>
              </div>
            )}

            {!persona && (
              <Link href="/quiz"
                className="border border-dashed border-border/60 p-5 md:p-6 flex items-center justify-between hover:border-foreground transition-colors bg-secondary/10 active:scale-[0.98]"
                data-testid="link-take-quiz-persona">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-[0.15em] font-medium">Discover Your Fabric Persona</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Take the quiz to find your material identity</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
              </Link>
            )}

            <div className="flex flex-col gap-0">
              <div className="flex justify-between items-center py-4 border-b border-border/20">
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Email</span>
                <span className="text-sm text-right max-w-[60%] truncate">{user.email}</span>
              </div>
              {user.name && (
                <div className="flex justify-between items-center py-4 border-b border-border/20">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Name</span>
                  <span className="text-sm">{user.name}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-4 border-b border-border/20">
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Saved Items</span>
                <span className="text-sm">{(favorites as any[]).length + productFavCount}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-border/20">
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Quizzes Taken</span>
                <span className="text-sm">{(quizResults as any[]).length}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4 mt-2">
              <button onClick={() => handleTabChange("wishlist")}
                className="border border-border/60 p-4 md:p-6 flex flex-col items-center gap-2.5 md:gap-3 hover:border-foreground transition-colors active:scale-[0.98] text-center"
                data-testid="button-goto-wishlist">
                <Heart className="w-5 h-5" />
                <span className="text-[10px] md:text-xs uppercase tracking-[0.15em]">Wishlist</span>
              </button>
              <button onClick={() => handleTabChange("quiz")}
                className="border border-border/60 p-4 md:p-6 flex flex-col items-center gap-2.5 md:gap-3 hover:border-foreground transition-colors active:scale-[0.98] text-center"
                data-testid="button-goto-quiz-history">
                <List className="w-5 h-5" />
                <span className="text-[10px] md:text-xs uppercase tracking-[0.15em]">Quiz History</span>
              </button>
            </div>

            <Link href="/quiz"
              className="bg-foreground text-background py-4 px-6 flex items-center justify-center gap-3 hover:bg-foreground/90 transition-colors active:scale-[0.98]"
              data-testid="button-retake-quiz">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs uppercase tracking-[0.15em]">{persona ? "Retake the Quiz" : "Take the Quiz"}</span>
            </Link>

            <button onClick={onLogout}
              className="md:hidden flex items-center justify-center gap-2.5 py-3.5 text-muted-foreground border border-border/40 text-[10px] uppercase tracking-[0.15em] hover:border-foreground hover:text-foreground transition-colors active:scale-[0.98]"
              data-testid="button-logout-mobile">
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </section>
        )}

        {activeTab === "wishlist" && (
          <section className="flex flex-col gap-5 md:gap-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 md:pb-4">
              <h2 className="text-xl md:text-2xl font-serif">Your Wishlist</h2>
              <button onClick={() => handleTabChange("account")} className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors md:hidden active:scale-95 py-1 px-2" data-testid="button-back-account">Back</button>
            </div>

            {productFavCount > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Saved Products ({productFavCount})</h3>
                {productsLoading ? (
                  <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[1,2,3].map(i => <div key={i} className="aspect-[3/4] bg-secondary" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(savedProducts as any[]).map((product: any) => {
                      const imageUrl = product.imageUrl || product.image_url;
                      const brandName = product.brandName || product.brand_name || "";
                      const fiberPercent = product.naturalFiberPercent || product.natural_fiber_percent;
                      const productId = String(product.id);
                      const shopUrl = product.url
                        ? `/leaving?url=${encodeURIComponent(product.url)}&brand=${encodeURIComponent(brandName)}`
                        : null;
                      return (
                        <div key={productId} className="group flex flex-col bg-background border border-border/40 hover:border-foreground/30 transition-all" data-testid={`card-saved-product-${productId}`}>
                          <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                            {imageUrl ? (
                              <img src={imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <ShoppingBag className="w-8 h-8 opacity-30" />
                              </div>
                            )}
                            {fiberPercent != null && fiberPercent >= 90 && (
                              <div className="absolute top-2 left-2">
                                <span className="flex items-center gap-1 bg-emerald-900/90 text-white px-2 py-0.5 text-[8px] uppercase tracking-wider backdrop-blur-sm">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  {fiberPercent}% natural
                                </span>
                              </div>
                            )}
                            <button
                              onClick={() => toggleProductFav(productId)}
                              className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
                              data-testid={`btn-unfav-${productId}`}
                              aria-label="Remove from favorites"
                            >
                              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                            </button>
                          </div>
                          <div className="flex flex-col gap-1.5 p-3 flex-1">
                            <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{brandName}</span>
                            <h3 className="text-[13px] leading-snug line-clamp-2 font-medium">{product.name}</h3>
                            {product.composition && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-auto">{product.composition}</p>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              {product.price && <span className="text-xs font-medium">{product.price}</span>}
                              {fiberPercent != null && fiberPercent < 90 && (
                                <span className="text-[9px] text-muted-foreground">{fiberPercent}% natural</span>
                              )}
                            </div>
                          </div>
                          {shopUrl && (
                            <a href={shopUrl} className="flex items-center justify-center gap-2 bg-foreground text-background py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-colors">
                              Shop Now <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {(favorites as any[]).length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Saved Designers ({(favorites as any[]).length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  {(favorites as any[]).map((fav: any) => {
                    const brandName = fav.designer?.name || "Designer";
                    const score = fav.designer?.naturalFiberPercent ?? getCuratedScore(brandName);
                    const tier = getQualityTier(score);
                    return (
                      <Link key={fav.id} href={`/designers/${fav.designer?.slug || fav.designerId}`} className="group flex flex-col border border-border hover:border-foreground transition-colors active:scale-[0.98] overflow-hidden" data-testid={`card-favorite-${fav.designer?.slug || fav.designerId}`}>
                        <BrandImage name={brandName} className="aspect-[4/3] w-full" />
                        <div className="flex flex-col gap-2 p-4">
                          <div className="flex justify-between items-start">
                            <h3 className="text-base md:text-lg font-serif">{brandName}</h3>
                            <button className="text-foreground p-1.5 -mr-1 active:scale-90 transition-transform" onClick={(e) => { e.preventDefault(); removeFav.mutate(fav.designerId); }}>
                              <Heart className="w-4 h-4 fill-foreground" />
                            </button>
                          </div>
                          <span className={`text-[9px] uppercase tracking-[0.1em] w-fit px-2 py-0.5 ${getTierColor(tier.tier)}`}>{tier.verdict}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {(favorites as any[]).length === 0 && productFavCount === 0 && (
              <div className="py-12 md:py-16 text-center bg-secondary/20 border border-dashed border-border/60 flex flex-col items-center gap-4">
                <Heart className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">You haven't saved any products or designers yet.</p>
                <Link href="/shop" className="mt-2 inline-block text-xs uppercase tracking-[0.15em] border-b border-foreground pb-1 active:scale-95 transition-transform" data-testid="link-browse-shop">Browse Shop</Link>
              </div>
            )}
          </section>
        )}

        {activeTab === "quiz" && (
          <section className="flex flex-col gap-5 md:gap-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 md:pb-4">
              <h2 className="text-xl md:text-2xl font-serif">Quiz History</h2>
              <button onClick={() => handleTabChange("account")} className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors md:hidden active:scale-95 py-1 px-2" data-testid="button-back-account-2">Back</button>
            </div>
            {(quizResults as any[]).length === 0 ? (
              <div className="py-12 md:py-16 text-center bg-secondary/20 border border-dashed border-border/60 flex flex-col items-center gap-4">
                <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">You haven't taken the quiz yet.</p>
                <Link href="/quiz" className="mt-2 inline-block text-xs uppercase tracking-[0.15em] border-b border-foreground pb-1 active:scale-95 transition-transform" data-testid="link-take-quiz">Take the Quiz</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4 md:gap-6">
                {(quizResults as any[]).map((result: any) => (
                  <div key={result.id} className="border border-border p-4 md:p-6 flex flex-col gap-4" data-testid={`card-quiz-${result.id}`}>
                    <div className="flex flex-col gap-1">
                      {result.profileType && (
                        <h3 className="text-lg md:text-xl font-serif">{result.profileType}</h3>
                      )}
                      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {new Date(result.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                    </div>

                    {result.recommendation && (
                      <p className="text-sm text-foreground/80 leading-relaxed">{result.recommendation}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {result.materials.map((m: string) => (
                        <span key={m} className="text-[10px] uppercase tracking-[0.1em] border border-border/40 px-2.5 py-1">{m}</span>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-x-6 sm:gap-y-2 text-xs text-muted-foreground pt-3 border-t border-border/20">
                      <span>Budget: {result.priceRange}</span>
                      <span>Synthetic tolerance: {result.syntheticTolerance}</span>
                      {result.favoriteBrands && result.favoriteBrands.length > 0 && (
                        <span>Brands: {result.favoriteBrands.join(", ")}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
