"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, X, User, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQualityTier, getTierColor } from "../../lib/quality-tiers";
import { MERCH_NAV } from "../../lib/merch-nav";
import { BrandWordmark } from "./BrandWordmark";
import { CountrySelector } from "./CountrySelector";
import { MobileBottomDock } from "./MobileBottomDock";
import { MobileNavMenu } from "./MobileNavMenu";
import { DesignersMenuPanel } from "./DesignersMenuPanel";

type DesignerSearchHit = {
  id?: string;
  slug: string;
  name: string;
  naturalFiberPercent?: number | null;
};

async function searchDesigners(query: string): Promise<DesignerSearchHit[]> {
  const res = await fetch(`/api/designers?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.designers ?? []);
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [designersOpen, setDesignersOpen] = useState(false);
  const designersTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setHasMounted(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("intertexe_auth_token") : null;
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((user) => setIsAuthenticated(!!user))
      .catch(() => setIsAuthenticated(false));
  }, []);

  const { data: results = [] } = useQuery<DesignerSearchHit[]>({
    queryKey: ["designerSearch", searchQuery],
    queryFn: () => searchDesigners(searchQuery),
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
  }, [pathname]);

  const navLinks = [
    ...MERCH_NAV.map((item) => ({ name: item.name, href: item.href, isDesigners: item.name === "Designers" })),
    { name: "Rewards", href: "/rewards", isDesigners: false },
    { name: "Scanner", href: "/scanner", isDesigners: false },
  ];

  const openDesignersMenu = () => {
    if (designersTimer.current) clearTimeout(designersTimer.current);
    setDesignersOpen(true);
  };

  const closeDesignersMenu = () => {
    designersTimer.current = setTimeout(() => setDesignersOpen(false), 120);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center">
          <div className="hidden md:block relative mr-6 flex-shrink-0">
            <CountrySelector />
          </div>

          <MobileNavMenu />

          <BrandWordmark asLink size="md" className="text-foreground flex-shrink-0 z-10 md:ml-0" />

          <nav className="hidden md:flex items-center justify-center gap-8 flex-1 mx-8">
            {navLinks.map((link) =>
              link.isDesigners ? (
                <div
                  key={link.name}
                  className="relative"
                  onMouseEnter={openDesignersMenu}
                  onMouseLeave={closeDesignersMenu}
                >
                  <Link
                    href={link.href}
                    className={`text-sm tracking-wide uppercase transition-colors hover:text-foreground/70 whitespace-nowrap ${
                      pathname === link.href || pathname.startsWith("/designers")
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                    data-testid="link-nav-designers"
                  >
                    {link.name}
                  </Link>
                  {designersOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 z-[60]">
                      <div className="bg-background border border-border/40 shadow-xl px-6 py-6 max-h-[min(80vh,640px)] overflow-y-auto w-[min(92vw,380px)]">
                        <DesignersMenuPanel onNavigate={() => setDesignersOpen(false)} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
              <Link key={link.name} href={link.href}
                className={`text-sm tracking-wide uppercase transition-colors hover:text-foreground/70 whitespace-nowrap ${
                  pathname === link.href ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
                data-testid={`link-nav-${link.name.toLowerCase().replace(' ', '-')}`}
              >
                {link.name}
              </Link>
              )
            )}
          </nav>

          <div className="flex items-center space-x-4 ml-auto flex-shrink-0">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-foreground hover:text-foreground/70 transition-colors"
              data-testid="button-search"
            >
              {searchOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Search className="w-5 h-5" strokeWidth={1.5} />}
            </button>
            <Link href="/account" className="hidden md:block p-2 text-foreground hover:text-foreground/70 transition-colors" data-testid="link-account">
              {hasMounted && isAuthenticated ? (
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
                  placeholder="Search brands, products, fibers..."
                  className="w-full bg-background border border-border/60 pl-12 pr-4 py-3.5 md:py-3 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 uppercase tracking-widest"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim().length >= 2) {
                      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                      setSearchOpen(false);
                    }
                  }}
                  data-testid="input-global-search"
                />
              </div>
              {searchQuery.trim().length >= 2 && (
                <div className="max-w-xl mx-auto mt-2 text-center">
                  <Link
                    href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                    className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground underline"
                    data-testid="link-search-all-results"
                  >
                    Search all products & brands
                  </Link>
                </div>
              )}
              {searchQuery.length >= 2 && (
                <div className="max-w-xl mx-auto mt-2 max-h-[50vh] md:max-h-[300px] overflow-y-auto">
                  {results.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No designers found.</p>
                  ) : (
                    <div className="flex flex-col">
                      {results.slice(0, 8).map((designer) => (
                        <Link
                          key={designer.slug}
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

      <MobileBottomDock />
    </>
  );
}
