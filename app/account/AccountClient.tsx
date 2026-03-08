'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Eye, EyeOff, LogOut, Leaf, ChevronRight, Sparkles } from "lucide-react";

const TOKEN_KEY = "intertexe_auth_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(body.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

interface UserData {
  id?: number;
  name?: string;
  email?: string;
  username?: string;
  fabricPersona?: string;
}

const FABRIC_PERSONAS: Record<string, { name: string; tagline: string; description: string; coreValue: string; buysFor: string }> = {
  "silk-connoisseur": { name: "Silk Connoisseur", tagline: "Luxury is in the details", description: "You appreciate the finest natural fibers and gravitate toward pieces that feel as good as they look.", coreValue: "Quality & Elegance", buysFor: "Investment pieces" },
  "cotton-purist": { name: "Cotton Purist", tagline: "Comfort meets consciousness", description: "You value clean, honest materials and believe the best garments start with the best cotton.", coreValue: "Authenticity", buysFor: "Everyday essentials" },
  "wool-devotee": { name: "Wool Devotee", tagline: "Warmth with purpose", description: "You're drawn to the timeless appeal of wool and its natural performance properties.", coreValue: "Heritage & Durability", buysFor: "Seasonal staples" },
  "linen-lover": { name: "Linen Lover", tagline: "Effortless and natural", description: "You embrace the beauty of imperfection and love materials that get better with age.", coreValue: "Sustainability", buysFor: "Relaxed luxury" },
  "cashmere-collector": { name: "Cashmere Collector", tagline: "The ultimate softness", description: "You seek out the rarest, softest fibers and build a wardrobe of treasured pieces.", coreValue: "Indulgence", buysFor: "Special occasions" },
};

export default function AccountClient() {
  const [user, setUser] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        clearToken();
        setUser(null);
      } else {
        const data = await handleResponse(res);
        setUser(data);
      }
    } catch {
      clearToken();
      setUser(null);
    }
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: form.email, password: form.password }),
        });
        const data = await handleResponse(res);
        if (data.token) setToken(data.token);
      } else {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.email,
            email: form.email,
            password: form.password,
            name: form.name || undefined,
          }),
        });
        const data = await handleResponse(res);
        if (data.token) setToken(data.token);
      }
      await fetchMe();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = getToken();
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    clearToken();
    setUser(null);
  };

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

  if (user) {
    const persona = user.fabricPersona ? FABRIC_PERSONAS[user.fabricPersona] : null;

    return (
      <div className="py-6 md:py-12 flex flex-col gap-6 md:gap-12 max-w-2xl mx-auto px-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-3xl font-serif" data-testid="text-account-title">Account</h1>
          <p className="text-muted-foreground text-sm" data-testid="text-welcome-name">Welcome, {user.name || user.email}</p>
        </div>

        <section className="flex flex-col gap-6 md:gap-8">
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
              <span className="text-sm text-right max-w-[60%] truncate" data-testid="text-user-email">{user.email}</span>
            </div>
            {user.name && (
              <div className="flex justify-between items-center py-4 border-b border-border/20">
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Name</span>
                <span className="text-sm" data-testid="text-user-name">{user.name}</span>
              </div>
            )}
            {user.fabricPersona && (
              <div className="flex justify-between items-center py-4 border-b border-border/20">
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Persona Type</span>
                <span className="text-sm" data-testid="text-persona-type">{persona?.name || user.fabricPersona}</span>
              </div>
            )}
          </div>

          <Link href="/quiz"
            className="bg-foreground text-background py-4 px-6 flex items-center justify-center gap-3 hover:bg-foreground/90 transition-colors active:scale-[0.98]"
            data-testid="button-retake-quiz">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs uppercase tracking-[0.15em]">{persona ? "Retake the Quiz" : "Take the Quiz"}</span>
          </Link>

          <button onClick={handleLogout}
            className="flex items-center justify-center gap-2.5 py-3.5 text-muted-foreground border border-border/40 text-[10px] uppercase tracking-[0.15em] hover:border-foreground hover:text-foreground transition-colors active:scale-[0.98]"
            data-testid="button-logout">
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </section>
      </div>
    );
  }

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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground p-1.5 active:scale-90 transition-transform"
                data-testid="button-toggle-password">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600" data-testid="text-auth-error">{error}</p>
          )}

          <button type="submit" disabled={submitting}
            className="mt-2 bg-foreground text-background py-4 uppercase tracking-[0.2em] text-xs font-medium hover:bg-foreground/90 transition-all disabled:opacity-50 active:scale-[0.98]"
            data-testid="button-submit-auth">
            {submitting ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
          className="w-full border border-border/60 py-4 uppercase tracking-[0.2em] text-xs font-medium text-foreground hover:border-foreground transition-colors active:scale-[0.98]"
          data-testid="button-toggle-auth-mode">
          {mode === "login" ? "Create an Account" : "Sign In Instead"}
        </button>
      </div>
    </div>
  );
}
