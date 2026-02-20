import { useState } from "react";
import { Link, useLocation } from "wouter";
import { User, Heart, List, LogOut, Settings, HelpCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Account() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (authLoading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-48 bg-secondary" />
          <div className="h-4 w-32 bg-secondary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForms />;
  }

  return <AccountDashboard user={user} onLogout={() => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Logged out successfully" });
        setLocation("/");
      }
    });
  }} />;
}

function AuthForms() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({ email: "", password: "", name: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      login.mutate({ username: form.email, password: form.password }, {
        onSuccess: () => { toast({ title: "Welcome back!" }); setLocation("/account"); },
        onError: (err: any) => toast({ title: "Login failed", description: err.message }),
      });
    } else {
      signup.mutate({ username: form.email, email: form.email, password: form.password, name: form.name || undefined }, {
        onSuccess: () => { toast({ title: "Account created!" }); setLocation("/account"); },
        onError: (err: any) => toast({ title: "Signup failed", description: err.message }),
      });
    }
  };

  return (
    <div className="py-10 md:py-16 flex flex-col items-center max-w-md mx-auto w-full gap-8 md:gap-10 px-1">
      <div className="text-center flex flex-col gap-3">
        <h1 className="text-3xl md:text-4xl font-serif">{mode === "login" ? "Welcome Back" : "Create Account"}</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {mode === "login" 
            ? "Sign in to access your wishlist, quiz results, and personalized recommendations."
            : "Join INTERTEXE to save designers, track materials, and discover your fiber profile."
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full border border-border/60 px-4 py-3.5 text-sm bg-background focus:outline-none focus:border-foreground transition-colors"
            required data-testid="input-email" />
        </div>

        {mode === "signup" && (
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-border/60 px-4 py-3.5 text-sm bg-background focus:outline-none focus:border-foreground transition-colors"
              data-testid="input-name" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-border/60 px-4 py-3.5 text-sm bg-background focus:outline-none focus:border-foreground transition-colors pr-12"
              required data-testid="input-password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground p-1">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={login.isPending || signup.isPending}
          className="mt-4 bg-foreground text-background py-4 uppercase tracking-widest text-xs md:text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50 active:scale-[0.98]"
          data-testid="button-submit-auth">
          {(login.isPending || signup.isPending) ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="text-foreground border-b border-foreground pb-px hover:text-muted-foreground hover:border-muted-foreground transition-colors"
          data-testid="button-toggle-auth-mode">
          {mode === "login" ? "Sign Up" : "Log In"}
        </button>
      </p>
    </div>
  );
}

function AccountDashboard({ user, onLogout }: { user: any; onLogout: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: favorites = [], isLoading: favsLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: api.getFavorites,
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

  const menuItems = [
    { icon: User, label: "My Account", href: "#" },
    { icon: Heart, label: "Wishlist", href: "#favorites" },
    { icon: List, label: "Quiz Results", href: "#quiz" },
    { icon: Settings, label: "Country / Region", href: "#" },
    { icon: HelpCircle, label: "Help & Support", href: "#" },
  ];

  return (
    <div className="py-6 md:py-12 flex flex-col md:flex-row gap-8 md:gap-12">
      <aside className="w-full md:w-64 shrink-0 flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-serif">Account</h1>
          <p className="text-muted-foreground text-sm">Welcome, {user.name || user.email}</p>
        </div>
        <nav className="flex overflow-x-auto md:overflow-visible md:flex-col gap-1 -mx-4 px-4 md:mx-0 md:px-0 pb-2 md:pb-0 scrollbar-hide">
          {menuItems.map(item => (
            <a key={item.label} href={item.href}
              className="flex items-center gap-2 md:gap-3 py-2.5 md:py-3 px-3 md:px-4 md:-mx-4 hover:bg-secondary/50 transition-colors text-[11px] md:text-sm uppercase tracking-widest whitespace-nowrap"
              data-testid={`link-account-${item.label.toLowerCase().replace(/[^a-z]/g, '')}`}>
              <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {item.label}
            </a>
          ))}
          <button onClick={onLogout}
            className="flex items-center gap-2 md:gap-3 py-2.5 md:py-3 px-3 md:px-4 md:-mx-4 hover:bg-secondary/50 transition-colors text-[11px] md:text-sm uppercase tracking-widest text-muted-foreground mt-2 md:mt-8 text-left whitespace-nowrap"
            data-testid="button-logout">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Log Out
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col gap-8 md:gap-12">
        <section id="favorites" className="flex flex-col gap-4 md:gap-6">
          <h2 className="text-xl md:text-2xl font-serif border-b border-border/40 pb-3 md:pb-4">Your Wishlist</h2>
          {favsLoading ? (
            <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {[1,2].map(i => <div key={i} className="h-28 md:h-32 bg-secondary" />)}
            </div>
          ) : (favorites as any[]).length === 0 ? (
            <div className="py-10 md:py-12 text-center bg-secondary/20 border border-dashed border-border/60">
              <p className="text-muted-foreground text-sm">You haven't saved any designers yet.</p>
              <Link href="/designers" className="mt-4 inline-block text-xs md:text-sm uppercase tracking-widest border-b border-foreground pb-1">Browse Directory</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {(favorites as any[]).map((fav: any) => (
                <Link key={fav.id} href={`/designers/${fav.designer.slug}`} className="group flex flex-col gap-3 md:gap-4 border border-border p-3 md:p-4 hover:border-foreground transition-colors active:scale-[0.98]" data-testid={`card-favorite-${fav.designer.slug}`}>
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg md:text-xl font-serif">{fav.designer.name}</h3>
                      <button className="text-foreground p-1" onClick={(e) => { e.preventDefault(); removeFav.mutate(fav.designerId); }}>
                        <Heart className="w-4 h-4 fill-foreground" />
                      </button>
                    </div>
                    {fav.designer.naturalFiberPercent != null && (
                      <div className="flex items-center gap-2 mt-auto pt-3 md:pt-4 border-t border-border/40">
                        <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Material Score</span>
                        <span className="text-sm font-medium ml-auto">{fav.designer.naturalFiberPercent}%</span>
                      </div>
                    )}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section id="quiz" className="flex flex-col gap-4 md:gap-6">
          <h2 className="text-xl md:text-2xl font-serif border-b border-border/40 pb-3 md:pb-4">Quiz History</h2>
          {(quizResults as any[]).length === 0 ? (
            <div className="py-10 md:py-12 text-center bg-secondary/20 border border-dashed border-border/60">
              <p className="text-muted-foreground text-sm">You haven't taken the quiz yet.</p>
              <Link href="/quiz" className="mt-4 inline-block text-xs md:text-sm uppercase tracking-widest border-b border-foreground pb-1">Take the Quiz</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:gap-4">
              {(quizResults as any[]).map((result: any) => (
                <div key={result.id} className="bg-foreground text-background p-4 md:p-6 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] md:text-xs uppercase tracking-widest text-background/60">
                      {new Date(result.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mt-1 md:mt-2">
                    {result.materials.map((m: string) => (
                      <span key={m} className="text-[10px] md:text-xs uppercase tracking-widest border border-background/20 px-2 py-1">{m}</span>
                    ))}
                  </div>
                  <p className="text-background/70 text-xs md:text-sm mt-1">
                    Budget: {result.priceRange} | Synthetic tolerance: {result.syntheticTolerance}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
