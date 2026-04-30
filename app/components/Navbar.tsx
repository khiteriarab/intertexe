"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, X, Home, Layers, Scan, ShoppingBag, User, UserCheck, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQualityTier, getTierColor } from "../../lib/quality-tiers";

type MarketFilter = "all" | "us-ca" | "eu-uk-me";

const LOCATION_OPTIONS: { country: string; flag: string; currency: string; market: MarketFilter; featured?: boolean }[] = [
  { country: "United States", flag: "🇺🇸", currency: "$USD", market: "us-ca", featured: true },
  { country: "Canada", flag: "🇨🇦", currency: "$USD", market: "us-ca", featured: true },
  { country: "United Kingdom", flag: "🇬🇧", currency: "£GBP", market: "eu-uk-me", featured: true },
  { country: "Spain", flag: "🇪🇸", currency: "€EUR", market: "eu-uk-me", featured: true },
  { country: "France", flag: "🇫🇷", currency: "€EUR", market: "eu-uk-me" },
  { country: "Italy", flag: "🇮🇹", currency: "€EUR", market: "eu-uk-me" },
  { country: "Germany", flag: "🇩🇪", currency: "€EUR", market: "eu-uk-me" },
  { country: "Netherlands", flag: "🇳🇱", currency: "€EUR", market: "eu-uk-me" },
  { country: "Ireland", flag: "🇮🇪", currency: "€EUR", market: "eu-uk-me" },
  { country: "Portugal", flag: "🇵🇹", currency: "€EUR", market: "eu-uk-me" },
  { country: "United Arab Emirates", flag: "🇦🇪", currency: "£GBP", market: "eu-uk-me" },
  { country: "Saudi Arabia", flag: "🇸🇦", currency: "£GBP", market: "eu-uk-me" },
  { country: "Kuwait", flag: "🇰🇼", currency: "£GBP", market: "eu-uk-me" },
  { country: "Qatar", flag: "🇶🇦", currency: "£GBP", market: "eu-uk-me" },
  { country: "All Destinations", flag: "🌐", currency: "ALL", market: "all" },
];

function getLocationForMarket(market: MarketFilter) {
  return LOCATION_OPTIONS.find((option) => option.market === market && option.featured)
    || LOCATION_OPTIONS.find((option) => option.market === market)
    || LOCATION_OPTIONS[LOCATION_OPTIONS.length - 1];
}

async function searchDesigners(query: string) {
  const res = await fetch(`/api/designers?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export function Navbar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(LOCATION_OPTIONS[0]);

  useEffect(() => {
    setHasMounted(true);
    try {
      const savedMarket = localStorage.getItem("intertexe_shop_market") as MarketFilter | null;
      const savedCountry = localStorage.getItem("intertexe_shop_country");
      const savedLocation = LOCATION_OPTIONS.find((option) => option.country === savedCountry)
        || LOCATION_OPTIONS.find((option) => option.market === savedMarket && option.featured)
        || LOCATION_OPTIONS[0];
      setSelectedLocation(savedLocation);
    } catch {}
    const token = typeof window !== "undefined" ? localStorage.getItem("intertexe_auth_token") : null;
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((user) => setIsAuthenticated(!!user))
      .catch(() => setIsAuthenticated(false));
  }, []);

  const { data: results = [] } = useQuery({
    queryKey: ["designerSearch", searchQuery],
    queryFn: () => searchDesigners(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const filteredLocations = LOCATION_OPTIONS.filter((option) =>
    option.country.toLowerCase().includes(locationQuery.trim().toLowerCase())
    || option.currency.toLowerCase().includes(locationQuery.trim().toLowerCase())
  );

  const selectLocation = (location: typeof LOCATION_OPTIONS[number]) => {
    setSelectedLocation(location);
    setLocationOpen(false);
    setLocationQuery("");
    try {
      localStorage.setItem("intertexe_shop_market", location.market);
      localStorage.setItem("intertexe_shop_country", location.country);
      localStorage.setItem("intertexe_shop_location_prompt_seen", "1");
    } catch {}
    if (pathname === "/shop") {
      const params = new URLSearchParams(window.location.search);
      if (location.market === "all") params.delete("market");
      else params.set("market", location.market);
      const query = params.toString();
      window.location.href = query ? `/shop?${query}` : "/shop";
    }
  };

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
    { name: "Fabrics", href: "/materials" },
    { name: "Shop", href: "/shop" },
    { name: "Sale", href: "/sale" },
    { name: "Directory", href: "/designers" },
    { name: "Scanner", href: "/scanner" },
    { name: "Quiz", href: "/quiz" },
    { name: "Chat", href: "/chat" },
  ];

  const mobileNavLinks = [
    { name: "Home", href: "/", icon: Home },
    { name: "Fabrics", href: "/materials", icon: Layers },
    { name: "Scan", href: "/scanner", icon: Scan },
    { name: "Shop", href: "/shop", icon: ShoppingBag },
    { name: "Account", href: "/account", icon: (hasMounted && isAuthenticated) ? UserCheck : User },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        {locationOpen && (
          <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/55 px-4 py-8 md:py-16" data-testid="modal-global-location">
            <div className="w-full max-w-3xl bg-background shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/40 px-5 md:px-8 py-5">
                <h2 className="text-lg md:text-2xl font-semibold uppercase tracking-[0.08em]">Change location</h2>
                <button
                  onClick={() => { setLocationOpen(false); setLocationQuery(""); }}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close location selector"
                  data-testid="button-close-global-location"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-5 md:px-8 py-5">
                <div className="relative mb-5">
                  <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    placeholder="Search location"
                    className="w-full border-0 border-b border-border/40 bg-transparent py-3 pl-8 pr-3 text-base focus:outline-none focus:border-foreground placeholder:text-muted-foreground/40"
                    autoFocus
                    data-testid="input-global-location-search"
                  />
                </div>
                <div className="max-h-[55vh] overflow-y-auto pr-2">
                  {filteredLocations.map((location, index) => (
                    <button
                      key={location.country}
                      onClick={() => selectLocation(location)}
                      className={`w-full flex items-center justify-between gap-4 py-3.5 text-left hover:bg-[#f5f5f3] transition-colors ${index === 3 && !locationQuery ? "border-t border-border/40 mt-2 pt-5" : ""}`}
                      data-testid={`global-location-${location.country.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl" aria-hidden="true">{location.flag}</span>
                        <span className="text-base md:text-lg truncate">{location.country}</span>
                      </span>
                      <span className="text-sm md:text-base text-muted-foreground flex-shrink-0">{location.currency}</span>
                    </button>
                  ))}
                  {filteredLocations.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted-foreground">No locations match your search.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center">
          <div className="relative mr-3 md:mr-6 flex-shrink-0">
            <button
              type="button"
              onClick={() => setLocationOpen(true)}
              className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm text-foreground hover:text-foreground/70 transition-colors"
              data-testid="button-global-location"
            >
              <span className="text-lg leading-none">{selectedLocation.flag}</span>
              <span className="hidden sm:inline whitespace-nowrap">{selectedLocation.country}</span>
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          <Link href="/" className="flex items-center leading-none flex-shrink-0 z-10" data-testid="link-home-logo">
            <span className="font-serif text-xl md:text-2xl tracking-[0.25em] uppercase text-foreground">
              <span className="font-light">INTER</span><span className="font-bold">TEXE</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center justify-center gap-8 flex-1 mx-8">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href}
                className={`text-sm tracking-wide uppercase transition-colors hover:text-foreground/70 whitespace-nowrap ${
                  pathname === link.href ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
                data-testid={`link-nav-${link.name.toLowerCase().replace(' ', '-')}`}
              >
                {link.name}
              </Link>
            ))}
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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/30" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex justify-around items-center h-[56px] px-1">
          {mobileNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link key={link.name} href={link.href}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors active:scale-95 min-w-[48px] min-h-[48px] ${
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
