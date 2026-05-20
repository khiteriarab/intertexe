"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ShoppingBag, ArrowRight, Heart, ChevronDown, Search, X, Globe2 } from "lucide-react";
import { useProductFavorites } from "../hooks/use-product-favorites";
import { getShopProducts, getShopMeta } from "./actions";
import { formatDisplayPrice } from "../../lib/format-display-price";

type FiberTab = "all" | "cashmere" | "silk" | "wool" | "cotton" | "linen";
type CategoryFilter = "all" | "knitwear" | "tops" | "dresses" | "skirts" | "bottoms" | "outerwear" | "lingerie" | "swimwear";
type SortOption = "recommended" | "new" | "price-high" | "price-low";
type MarketFilter = "all" | "us-ca" | "eu-uk-me";

const FIBER_TABS: { key: FiberTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "cashmere", label: "Cashmere" },
  { key: "silk", label: "Silk" },
  { key: "wool", label: "Wool" },
  { key: "cotton", label: "Cotton" },
  { key: "linen", label: "Linen" },
];

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "knitwear", label: "Knitwear" },
  { key: "tops", label: "Tops" },
  { key: "dresses", label: "Dresses" },
  { key: "skirts", label: "Skirts" },
  { key: "bottoms", label: "Bottoms" },
  { key: "outerwear", label: "Outerwear" },
  { key: "lingerie", label: "Lingerie" },
  { key: "swimwear", label: "Swimwear" },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "new", label: "New In" },
  { key: "price-high", label: "Price: High to Low" },
  { key: "price-low", label: "Price: Low to High" },
];

const LOCATION_OPTIONS: { country: string; code?: string; flag: string; currency: string; market: MarketFilter; featured?: boolean }[] = [
  { country: "United States", code: "US", flag: "🇺🇸", currency: "$USD", market: "us-ca", featured: true },
  { country: "Canada", code: "CA", flag: "🇨🇦", currency: "$USD", market: "us-ca", featured: true },
  { country: "United Kingdom", code: "GB", flag: "🇬🇧", currency: "£GBP", market: "eu-uk-me", featured: true },
  { country: "Spain", code: "ES", flag: "🇪🇸", currency: "€EUR", market: "eu-uk-me", featured: true },
  { country: "France", code: "FR", flag: "🇫🇷", currency: "€EUR", market: "eu-uk-me" },
  { country: "Italy", code: "IT", flag: "🇮🇹", currency: "€EUR", market: "eu-uk-me" },
  { country: "Germany", code: "DE", flag: "🇩🇪", currency: "€EUR", market: "eu-uk-me" },
  { country: "Netherlands", code: "NL", flag: "🇳🇱", currency: "€EUR", market: "eu-uk-me" },
  { country: "Ireland", code: "IE", flag: "🇮🇪", currency: "€EUR", market: "eu-uk-me" },
  { country: "Portugal", code: "PT", flag: "🇵🇹", currency: "€EUR", market: "eu-uk-me" },
  { country: "United Arab Emirates", code: "AE", flag: "🇦🇪", currency: "£GBP", market: "eu-uk-me" },
  { country: "Saudi Arabia", code: "SA", flag: "🇸🇦", currency: "£GBP", market: "eu-uk-me" },
  { country: "Kuwait", code: "KW", flag: "🇰🇼", currency: "£GBP", market: "eu-uk-me" },
  { country: "Qatar", code: "QA", flag: "🇶🇦", currency: "£GBP", market: "eu-uk-me" },
  { country: "All Destinations", flag: "🌐", currency: "ALL", market: "all" },
];

function getLocationForMarket(market: MarketFilter) {
  return LOCATION_OPTIONS.find((option) => option.market === market && option.featured)
    || LOCATION_OPTIONS.find((option) => option.market === market)
    || LOCATION_OPTIONS[LOCATION_OPTIONS.length - 1];
}

function optimizeImageUrl(url: string, width: number): string {
  if (!url) return url;
  if (url.includes("cdn.shopify.com")) {
    const separator = url.includes("?") ? "&" : "?";
    return url + separator + "width=" + width + "&format=webp";
  }
  return url;
}

function ProductCard({ product, eager }: { product: any; eager?: boolean }) {
  const { toggle, isFavorited } = useProductFavorites();
  const productId = String(product.id);
  const saved = isFavorited(productId);
  const name = product.name || "";
  const brandName = product.brandName || product.brand_name || "";
  const imageUrl = product.imageUrl || product.image_url;
  const priceShown = formatDisplayPrice({
    price: product.price,
    originalPrice: product.originalPrice,
    listingRegion: product.listingRegion ?? product.listing_region,
    productId: product.productId || product.product_id,
  });
  const composition = product.composition;

  const saveShopState = () => {
    sessionStorage.setItem("shop_return_url", window.location.pathname + window.location.search);
    sessionStorage.setItem("shop_return_product", String(product.id));
    sessionStorage.setItem("shop_visible_count", String(document.querySelectorAll('[data-testid^="product-card-"]').length));
  };

  return (
    <Link href={`/product/${product.id}`} onClick={saveShopState} className="group flex flex-col cursor-pointer relative" data-testid={`product-card-${product.id}`}>
      {imageUrl ? (
        <div className="aspect-[3/4] bg-[#f5f5f3] relative overflow-hidden">
          <img src={optimizeImageUrl(imageUrl, 400)} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading={eager ? "eager" : "lazy"} decoding={eager ? "sync" : "async"} fetchPriority={eager ? "high" : "low"} />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId, brandName, priceShown || String(product.price)); }}
            className={`absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center transition-opacity duration-200 ${saved ? "opacity-100" : "md:opacity-0 md:group-hover:opacity-100"}`}
            data-testid={`btn-favorite-${product.id}`}
            aria-label={saved ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart className={`w-4 h-4 drop-shadow-sm transition-colors ${saved ? "fill-red-500 text-red-500" : "text-white/80"}`} />
          </button>
        </div>
      ) : (
        <div className="aspect-[3/4] bg-[#f5f5f3] flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-neutral-300" />
        </div>
      )}
      <div className="flex flex-col gap-1 pt-3">
        <span className="text-[10px] md:text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{brandName}</span>
        <h3 className="text-[12px] md:text-[13px] leading-snug truncate text-foreground">{name}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {priceShown && <span className="text-[12px] md:text-[13px] font-medium">{priceShown}</span>}
        </div>
        {composition && (
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 mt-0.5 line-clamp-1">{composition}</span>
        )}
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-5 md:gap-y-12">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse flex flex-col">
          <div className="aspect-[3/4] bg-[#f0f0ee]" />
          <div className="pt-3 flex flex-col gap-2">
            <div className="h-2.5 bg-[#f0f0ee] w-1/3" />
            <div className="h-3 bg-[#f0f0ee] w-3/4" />
            <div className="h-2.5 bg-[#f0f0ee] w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ShopClient({
  initialProducts,
  initialTotal,
  totalProductCount,
  fiberCounts = {},
  initialMarket,
  detectedCountry,
}: {
  initialProducts: any[];
  initialTotal: number;
  totalProductCount: number;
  fiberCounts?: Record<string, number>;
  initialMarket?: string;
  detectedCountry?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialFiber = (searchParams.get("fiber") as FiberTab) || "all";
  const initialCategory = (searchParams.get("category") as CategoryFilter) || "all";
  const initialSort = (searchParams.get("sort") as SortOption) || "recommended";
  const detectedLocation = LOCATION_OPTIONS.find((option) => option.code === detectedCountry);
  const detectedMarket = detectedLocation?.market;
  const initialMarketFilter = ((initialMarket || searchParams.get("market") || detectedMarket || "all") as MarketFilter);
  const initialSearch = searchParams.get("q") || "";

  const [fiberTab, setFiberTab] = useState<FiberTab>(initialFiber);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(initialCategory);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [marketFilter, setMarketFilter] = useState<MarketFilter>(initialMarketFilter);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(initialMarketFilter === "all");
  const [visibleCount, setVisibleCount] = useState(40);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentLocation = detectedLocation && marketFilter === detectedLocation.market
    ? detectedLocation
    : getLocationForMarket(marketFilter);
  const filteredLocations = LOCATION_OPTIONS.filter((option) =>
    option.country.toLowerCase().includes(locationQuery.trim().toLowerCase())
    || option.currency.toLowerCase().includes(locationQuery.trim().toLowerCase())
  );

  const selectLocation = (market: MarketFilter) => {
    setMarketFilter(market);
    setVisibleCount(40);
    setShowLocationPrompt(false);
    try {
      localStorage.setItem("intertexe_shop_market", market);
      localStorage.setItem("intertexe_shop_location_prompt_seen", "1");
    } catch {}
    setShowLocationModal(false);
    setLocationQuery("");
  };

  const syncUrl = useCallback((fiber: string, category: string, sort: string, market: string, search: string) => {
    const params = new URLSearchParams();
    if (fiber !== "all") params.set("fiber", fiber);
    if (category !== "all") params.set("category", category);
    if (sort !== "recommended") params.set("sort", sort);
    if (market !== "all") params.set("market", market);
    if (search) params.set("q", search);
    const qs = params.toString();
    const newUrl = qs ? `/shop?${qs}` : "/shop";
    window.history.replaceState(null, "", newUrl);
  }, []);

  useEffect(() => {
    syncUrl(fiberTab, categoryFilter, sortBy, marketFilter, debouncedSearch);
  }, [fiberTab, categoryFilter, sortBy, marketFilter, debouncedSearch, syncUrl]);

  const [products, setProducts] = useState(initialProducts || []);
  const [resultTotal, setResultTotal] = useState(initialTotal || 0);
  const [isLoading, setIsLoading] = useState(!initialProducts?.length);

  const scrollRestored = useRef(false);

  useEffect(() => {
    try {
      const savedMarket = localStorage.getItem("intertexe_shop_market") as MarketFilter | null;
      if (savedMarket && ["all", "us-ca", "eu-uk-me"].includes(savedMarket) && savedMarket !== marketFilter) {
        setMarketFilter(savedMarket);
      }
      if (localStorage.getItem("intertexe_shop_location_prompt_seen") === "1") {
        setShowLocationPrompt(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const savedCount = sessionStorage.getItem("shop_visible_count");
    if (savedCount) {
      const count = parseInt(savedCount, 10);
      if (count > 40) setVisibleCount(count);
    }
  }, []);

  useEffect(() => {
    if (scrollRestored.current || isLoading) return;
    const productId = sessionStorage.getItem("shop_return_product");
    if (!productId) return;
    if (products.length > 0) {
      scrollRestored.current = true;
      sessionStorage.removeItem("shop_return_product");
      sessionStorage.removeItem("shop_return_url");
      sessionStorage.removeItem("shop_visible_count");
      setTimeout(() => {
        const el = document.querySelector(`[data-testid="product-card-${productId}"]`);
        if (el) {
          el.scrollIntoView({ block: "center" });
        }
      }, 100);
    }
  }, [products, isLoading]);
  const [globalCount, setGlobalCount] = useState(totalProductCount);
  const [fiberCountsState, setFiberCountsState] = useState(fiberCounts);

  useEffect(() => {
    if (!globalCount || !Object.keys(fiberCountsState).length) {
      getShopMeta()
        .then(d => {
          if (d.totalProductCount) setGlobalCount(d.totalProductCount);
          if (d.fiberCounts) setFiberCountsState(d.fiberCounts);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setVisibleCount(40);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const isDefaultState = fiberTab === "all" && categoryFilter === "all" && sortBy === "recommended" && marketFilter === "all" && !debouncedSearch && visibleCount === 40;

    if (isDefaultState && initialProducts?.length > 0) {
      setProducts(initialProducts);
      setResultTotal(initialTotal);
      setIsLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const result = await getShopProducts({
          fiber: fiberTab !== "all" ? fiberTab : undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          sort: sortBy,
          market: marketFilter !== "all" ? marketFilter : undefined,
          limit: visibleCount,
          offset: 0,
          search: debouncedSearch || undefined,
        });
        setProducts(result.products || []);
        setResultTotal(result.total || 0);
      } catch {
        setProducts([]);
        setResultTotal(0);
      }
      setIsLoading(false);
    };

    fetchProducts();
  }, [fiberTab, categoryFilter, sortBy, marketFilter, visibleCount, debouncedSearch, initialProducts, initialTotal]);

  const isSearchActive = debouncedSearch.length >= 2;
  const displayCount = fiberTab === "all" && categoryFilter === "all" && !isSearchActive
    ? (globalCount > 0 ? globalCount : 17000)
    : resultTotal;

  const currentSort = SORT_OPTIONS.find(s => s.key === sortBy)!;

  return (
    <div className="min-h-screen pb-24 md:pb-16">
      <div className="py-8 md:py-12 flex flex-col gap-0">
        <header className="mb-8 md:mb-10">
          <div className="flex flex-col gap-6 md:gap-8">
            <div>
              <h1 className="text-2xl md:text-4xl font-serif mb-2" data-testid="text-shop-title">
                {isSearchActive ? `Results for "${debouncedSearch}"` : "Shop"}
              </h1>
              <p className="text-[13px] md:text-sm text-muted-foreground">
                {displayCount > 0 ? displayCount.toLocaleString() : "17,000+"} verified products
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search "silk dress", "cashmere sweater"...'
                className="w-full bg-[#f5f5f3] border-0 pl-11 pr-10 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all placeholder:text-muted-foreground/40"
                data-testid="input-product-search"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setDebouncedSearch(""); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-clear-search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {showLocationPrompt && (
          <div className="mb-6 md:mb-8 border border-border/30 bg-[#fbfaf8] p-5 md:p-6 flex flex-col gap-4" data-testid="location-prompt">
            <p className="text-xl md:text-2xl font-serif leading-snug text-foreground/75">
              Update your location to see products and content relevant to you
            </p>
            <div className="flex items-center gap-3 text-lg md:text-xl">
              <span className="text-2xl">{currentLocation.flag}</span>
              <span className="font-serif">{currentLocation.country} ({currentLocation.currency})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className="w-full bg-[#111] text-white py-3.5 md:py-4 text-sm md:text-base tracking-[0.08em] hover:bg-neutral-800 transition-colors"
              data-testid="button-location-prompt"
            >
              Change Location
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 mb-6 md:mb-8">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {FIBER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setFiberTab(tab.key); setCategoryFilter("all"); setVisibleCount(40); }}
                className={`px-4 md:px-5 py-2 text-[10px] md:text-[11px] uppercase tracking-[0.15em] whitespace-nowrap transition-all flex-shrink-0 ${
                  fiberTab === tab.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-fiber-${tab.key}`}
              >
                {tab.label}
                {tab.key !== "all" && fiberCountsState[tab.key] ? (
                  <span className="ml-1.5 opacity-50">({fiberCountsState[tab.key]})</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat.key}
                onClick={() => { setCategoryFilter(cat.key); setVisibleCount(40); }}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] whitespace-nowrap transition-all flex-shrink-0 ${
                  categoryFilter === cat.key ? "border-b-2 border-foreground text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-category-${cat.key}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 -mx-1 px-1 pt-1">
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-foreground hover:text-muted-foreground transition-colors"
              data-testid="button-change-location"
            >
              <span className="text-base leading-none">{currentLocation.flag}</span>
              <span>{currentLocation.country}</span>
              <span className="text-muted-foreground">{currentLocation.currency}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <span className="hidden md:inline text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Shopping destination
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-y border-border/20 mb-6 md:mb-8">
          <p className="text-[11px] md:text-xs text-muted-foreground" data-testid="text-result-count">
            {isLoading ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              <><span className="text-foreground">{resultTotal.toLocaleString()}</span> results</>
            )}
          </p>

          {isSearchActive && (
            <button
              onClick={() => { setSearchQuery(""); setDebouncedSearch(""); setFiberTab("all"); setCategoryFilter("all"); setMarketFilter("all"); }}
              className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              data-testid="button-clear-all"
            >
              Clear all
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 text-[11px] md:text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="btn-sort"
            >
              Sort: {currentSort.label}
              <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border/40 shadow-xl min-w-[180px]">
                  {SORT_OPTIONS.map(option => (
                    <button
                      key={option.key}
                      onClick={() => { setSortBy(option.key); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[11px] md:text-xs transition-colors ${
                        sortBy === option.key ? "bg-[#f5f5f3] text-foreground" : "text-muted-foreground hover:bg-[#f5f5f3] hover:text-foreground"
                      }`}
                      data-testid={`sort-${option.key}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {fiberTab !== "all" && (
          <div className="flex items-center justify-end mb-4 -mt-2">
            <Link
              href={`/materials/${fiberTab}`}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`link-material-guide-${fiberTab}`}
            >
              {fiberTab} buying guide <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {showLocationModal && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/55 px-4 py-8 md:py-16" data-testid="modal-location-selector">
            <div className="w-full max-w-3xl bg-background shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/40 px-5 md:px-8 py-5">
                <h2 className="text-lg md:text-2xl font-semibold uppercase tracking-[0.08em]">Change location</h2>
                <button
                  onClick={() => { setShowLocationModal(false); setLocationQuery(""); }}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close location selector"
                  data-testid="button-close-location"
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
                    data-testid="input-location-search"
                  />
                </div>
                <div className="max-h-[55vh] overflow-y-auto pr-2">
                  {filteredLocations.map((location, index) => (
                    <button
                      key={location.country}
                      onClick={() => selectLocation(location.market)}
                      className={`w-full flex items-center justify-between gap-4 py-3.5 text-left hover:bg-[#f5f5f3] transition-colors ${index === 3 && !locationQuery ? "border-t border-border/40 mt-2 pt-5" : ""}`}
                      data-testid={`location-${location.country.toLowerCase().replace(/\s+/g, "-")}`}
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

        {isLoading && !products.length ? (
          <LoadingSkeleton />
        ) : products.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/15" />
            <p className="text-muted-foreground text-sm">No products match this combination.</p>
            <button
              onClick={() => { setFiberTab("all"); setCategoryFilter("all"); setMarketFilter("all"); }}
              className="text-[11px] uppercase tracking-[0.15em] text-foreground hover:text-muted-foreground transition-colors"
              data-testid="button-reset-filters"
            >
              View all products
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-5 md:gap-y-12">
              {products.map((product: any, i: number) => (
                <ProductCard key={product.id} product={product} eager={i < 8} />
              ))}
            </div>

            {resultTotal > visibleCount && (
              <div className="flex justify-center pt-10 md:pt-12">
                <button
                  onClick={() => setVisibleCount(prev => prev + 40)}
                  className="px-10 py-3.5 bg-foreground text-background text-[11px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-colors"
                  data-testid="btn-load-more"
                >
                  Load More ({(resultTotal - visibleCount).toLocaleString()})
                </button>
              </div>
            )}
          </>
        )}

        <div className="border-t border-border/20 pt-10 md:pt-14 mt-12 md:mt-16">
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">Explore by Fabric</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {[
              { href: "/materials/silk-dresses", label: "Silk Dresses" },
              { href: "/materials/linen-pants", label: "Linen Pants" },
              { href: "/materials/cotton-shirts", label: "Cotton Shirts" },
              { href: "/materials/cashmere-sweaters", label: "Cashmere Sweaters" },
              { href: "/materials/wool-coats", label: "Wool Coats" },
              { href: "/materials", label: "All Fabrics" },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-[#f5f5f3] transition-colors group"
                data-testid={`link-explore-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="text-[12px] md:text-[13px]">{link.label}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
