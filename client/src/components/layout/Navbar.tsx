import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Heart, User, Menu, Home, Grid, List, X, Sparkles, UserCheck, MessageCircle, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDesigners } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();

  const { data: results = [] } = useQuery({
    queryKey: ["designerSearch", searchQuery],
    queryFn: () => fetchDesigners(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, [location]);

  const navLinks = [
    { name: "The Edit", href: "/just-in" },
    { name: "Directory", href: "/designers" },
    { name: "Buying Guide", href: "/materials" },
    { name: "Quiz", href: "/quiz" },
    { name: "Chat", href: "/chat" },
  ];

  const mobileNavLinks = [
    { name: "Home", href: "/", icon: Home },
    { name: "The Edit", href: "/just-in", icon: Award },
    { name: "Directory", href: "/designers", icon: Grid },
    { name: "Quiz", href: "/quiz", icon: List },
    { name: "Account", href: "/account", icon: isAuthenticated ? UserCheck : User },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center leading-none" data-testid="link-home-logo">
            <span className="font-serif text-xl md:text-2xl tracking-[0.25em] uppercase text-foreground">
              <span className="font-light">INTER</span><span className="font-bold">TEXE</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href}
                className={`text-sm tracking-wide uppercase transition-colors hover:text-foreground/70 ${
                  location === link.href ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
                data-testid={`link-nav-${link.name.toLowerCase().replace(' ', '-')}`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-foreground hover:text-foreground/70 transition-colors"
              data-testid="button-search"
            >
              {searchOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Search className="w-5 h-5" strokeWidth={1.5} />}
            </button>
            <Link href="/account" className="hidden md:block p-2 text-foreground hover:text-foreground/70 transition-colors" data-testid="link-account">
              {isAuthenticated ? (
                <UserCheck className="w-5 h-5" strokeWidth={1.5} />
              ) : (
                <User className="w-5 h-5" strokeWidth={1.5} />
              )}
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-border/40 bg-background">
            <div className="container mx-auto px-4 md:px-8 py-3 md:py-4">
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search designers..."
                  className="w-full bg-background border border-border/60 pl-12 pr-4 py-3.5 md:py-3 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 uppercase tracking-widest"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-global-search"
                />
              </div>
              {searchQuery.length >= 2 && (
                <div className="max-w-xl mx-auto mt-2 max-h-[50vh] md:max-h-[300px] overflow-y-auto">
                  {(results as any[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No designers found.</p>
                  ) : (
                    <div className="flex flex-col">
                      {(results as any[]).slice(0, 8).map((designer: any) => (
                        <Link
                          key={designer.id}
                          href={`/designers/${designer.slug}`}
                          className="flex items-center justify-between py-3.5 md:py-3 px-4 hover:bg-secondary/50 active:bg-secondary/70 transition-colors border-b border-border/20 last:border-0"
                          data-testid={`search-result-${designer.slug}`}
                        >
                          <span className="font-serif text-base">{designer.name}</span>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            {designer.naturalFiberPercent != null && <span className="text-[10px] md:text-xs text-muted-foreground">{designer.naturalFiberPercent}%</span>}
                            <span className={`px-1.5 py-0.5 text-[8px] uppercase tracking-wider ${getTierColor(getQualityTier(designer.naturalFiberPercent).tier)}`}>
                              {getQualityTier(designer.naturalFiberPercent).shortLabel}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/30 pb-safe">
        <div className="flex justify-around items-center h-14 px-1">
          {mobileNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href || (link.href !== '/' && location.startsWith(link.href));
            return (
              <Link key={link.name} href={link.href}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors active:scale-95 ${
                  isActive ? "text-foreground" : "text-muted-foreground/70"
                }`}
                data-testid={`link-mobile-nav-${link.name.toLowerCase()}`}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[9px] tracking-wider uppercase font-medium">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
