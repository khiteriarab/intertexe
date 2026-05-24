"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ProductLink } from "../components/ProductLink";
import { useSearchParams } from "next/navigation";
import { ShoppingBag, ArrowRight, Heart, ChevronDown, Search, X } from "lucide-react";
import { useProductFavorites } from "../hooks/use-product-favorites";
import { getShopProducts, getShopCatalogCount, getShopMeta, getShopBrands } from "./actions";
import type { ShopPriceCap } from "../../lib/shop-client-filters";
import { CatalogMobileToolbar, CatalogMobileSheet } from "../components/CatalogMobileToolbar";
import { CATALOG_PAGE_SIZE } from "../../lib/catalog-rules";
import { formatDisplayPrice } from "../../lib/format-display-price";
import { canonicalProductId } from "../../lib/canonical-product-id";
import { useShoppingMarket, SHOP_MARKET_INVALIDATE } from "../hooks/use-shopping-market";
import { CatalogProductImage } from "../components/CatalogProductImage";
import { CountrySelector } from "../components/CountrySelector";
import { CatalogFilterSidebar } from "../components/CatalogFilterSidebar";
import { shopWearToWhereTextOptions } from "../../lib/wear-to-where";
import {
  getRegionForCountryCode,
  getRegionForMarket,
  type MarketFilter,
} from "../../lib/shipping-regions";

type FiberTab = "all" | "cashmere" | "silk" | "wool" | "cotton" | "linen";
type CategoryFilterKey = "knitwear" | "tops" | "dresses" | "skirts" | "bottoms" | "outerwear" | "lingerie" | "swimwear";
type SortOption = "new" | "price-high" | "price-low" | "natural-high";
const FIBER_TABS: { key: FiberTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "silk", label: "Silk" },
  { key: "linen", label: "Linen" },
  { key: "cashmere", label: "Cashmere" },
  { key: "cotton", label: "Cotton" },
  { key: "wool", label: "Wool" },
];

const MATERIAL_FILTER_OPTIONS = FIBER_TABS.filter((t) => t.key !== "all");

const CATEGORY_FILTERS: { key: CategoryFilterKey; label: string }[] = [
  { key: "knitwear", label: "Knitwear" },
  { key: "tops", label: "Tops" },
  { key: "dresses", label: "Dresses" },
  { key: "skirts", label: "Skirts" },
  { key: "bottoms", label: "Bottoms" },
  { key: "outerwear", label: "Outerwear" },
  { key: "lingerie", label: "Lingerie" },
  { key: "swimwear", label: "Swimwear" },
];

type PriceFilterId = "any" | "100" | "300" | "600" | "600plus";
const PRICE_FILTER_OPTIONS: { id: PriceFilterId; label: string }[] = [
  { id: "any", label: "Any price" },
  { id: "100", label: "Under £100" },
  { id: "300", label: "£100–£300" },
  { id: "600", label: "£300–£600" },
  { id: "600plus", label: "£600+" },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "new", label: "Newest" },
  { key: "price-low", label: "Price low to high" },
  { key: "price-high", label: "Price high to low" },
  { key: "natural-high", label: "Highest natural fiber %" },
];

function parseCategoryParams(raw: string | null): Set<CategoryFilterKey> {
  const keys = new Set<CategoryFilterKey>();
  if (!raw) return keys;
  for (const part of raw.split(",")) {
    const k = part.trim().toLowerCase();
    if (CATEGORY_FILTERS.some((c) => c.key === k)) keys.add(k as CategoryFilterKey);
  }
  return keys;
}

function priceCapFromParam(raw: string | null): ShopPriceCap {
  if (raw === "100" || raw === "300" || raw === "600") return Number(raw) as ShopPriceCap;
  if (raw === "600plus") return null;
  return null;
}

const SHOP_PAGE_SIZE = CATALOG_PAGE_SIZE;
const WEAR_TO_WHERE_OPTIONS = shopWearToWhereTextOptions();

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
  const productId = canonicalProductId(product);
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
    <div className="group relative flex flex-col" data-testid={`product-card-${product.id}`}>
      {imageUrl && (
        <button
          type="button"
          onClick={() => toggle(productId, brandName, priceShown || String(product.price))}
          className={`absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center transition-opacity duration-200 ${saved ? "opacity-100" : "md:opacity-0 md:group-hover:opacity-100"}`}
          data-testid={`btn-favorite-${product.id}`}
          aria-label={saved ? "Remove from favorites" : "Save to favorites"}
        >
          <Heart className={`w-4 h-4 drop-shadow-sm transition-colors ${saved ? "fill-red-500 text-red-500" : "text-white/80"}`} />
        </button>
      )}
      <ProductLink href={`/product/${product.id}`} onClick={saveShopState} className="flex flex-col cursor-pointer">
        {imageUrl ? (
          <CatalogProductImage
            src={optimizeImageUrl(imageUrl, 400)}
            alt={name}
            category={product.category}
            name={name}
            eager={eager}
          />
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
      </ProductLink>
    </div>
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
  initialHasMore = true,
  detectedCountry,
}: {
  initialProducts: any[];
  initialHasMore?: boolean;
  detectedCountry?: string;
}) {
  const searchParams = useSearchParams();

  const fiberParam = searchParams.get("fiber");
  const initialFiber: FiberTab =
    fiberParam && FIBER_TABS.some((t) => t.key === fiberParam) ? (fiberParam as FiberTab) : "all";
  const initialCategories = parseCategoryParams(searchParams.get("category"));
  const sortParam = searchParams.get("sort");
  const initialSort: SortOption =
    sortParam && SORT_OPTIONS.some((s) => s.key === sortParam)
      ? (sortParam as SortOption)
      : sortParam === "recommended"
        ? "new"
        : "new";
  const initialPriceCap = priceCapFromParam(searchParams.get("price"));
  const initialBrands = (searchParams.get("brands") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const initialMarketFilter = (searchParams.get("market") as MarketFilter) || "all";
  const initialSearch = searchParams.get("q") || "";
  const { market: marketFilter, setMarket: setMarketFilter } = useShoppingMarket(
    initialMarketFilter === "us-ca" || initialMarketFilter === "eu-uk-me" ? initialMarketFilter : "all"
  );

  const [fiberTab, setFiberTab] = useState<FiberTab>(initialFiber);
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryFilterKey>>(initialCategories);
  const [priceCap, setPriceCap] = useState<ShopPriceCap>(initialPriceCap);
  const [priceCap600Plus, setPriceCap600Plus] = useState(searchParams.get("price") === "600plus");
  const [selectedBrandSlugs, setSelectedBrandSlugs] = useState<string[]>(initialBrands);
  const [brandSearch, setBrandSearch] = useState("");
  const [shopBrands, setShopBrands] = useState<{ slug: string; name: string; count: number }[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [listOffset, setListOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const detectedRegion = getRegionForCountryCode(detectedCountry);
  const activeRegion =
    detectedRegion && marketFilter === detectedRegion.market
      ? detectedRegion
      : getRegionForMarket(marketFilter);

  const selectLocation = (market: MarketFilter) => {
    setMarketFilter(market);
    setListOffset(0);
  };

  const categoryList = [...selectedCategories];

  const syncUrl = useCallback(
    (
      fiber: string,
      categories: string[],
      sort: string,
      market: string,
      search: string,
      price: ShopPriceCap,
      price600Plus: boolean,
      brands: string[]
    ) => {
      const params = new URLSearchParams();
      if (fiber !== "all") params.set("fiber", fiber);
      if (categories.length) params.set("category", categories.join(","));
      if (sort !== "new") params.set("sort", sort);
      if (market !== "all") params.set("market", market);
      if (search) params.set("q", search);
      if (price600Plus) params.set("price", "600plus");
      else if (price != null) params.set("price", String(price));
      if (brands.length) params.set("brands", brands.join(","));
      const qs = params.toString();
      const newUrl = qs ? `/shop?${qs}` : "/shop";
      window.history.replaceState(null, "", newUrl);
    },
    []
  );

  useEffect(() => {
    syncUrl(fiberTab, categoryList, sortBy, marketFilter, debouncedSearch, priceCap, priceCap600Plus, selectedBrandSlugs);
  }, [fiberTab, categoryList.join(","), sortBy, marketFilter, debouncedSearch, priceCap, priceCap600Plus, selectedBrandSlugs.join(","), syncUrl]);

  useEffect(() => {
    getShopBrands()
      .then((brands) => setShopBrands(brands.map((b) => ({ slug: b.slug, name: b.name, count: b.count }))))
      .catch(() => {});
  }, []);

  const effectiveMaxPrice = priceCap600Plus ? null : priceCap;

  const [products, setProducts] = useState(initialProducts || []);
  const [resultTotal, setResultTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(true);
  const initialFetchDone = useRef(initialProducts?.length > 0);

  const scrollRestored = useRef(false);

  useEffect(() => {
    const savedCount = sessionStorage.getItem("shop_visible_count");
    if (savedCount) {
      const count = parseInt(savedCount, 10);
      if (count > SHOP_PAGE_SIZE) setListOffset(Math.max(0, count - SHOP_PAGE_SIZE));
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
  const [globalCount, setGlobalCount] = useState(0);
  const [fiberCountsState, setFiberCountsState] = useState<Record<string, number>>({});

  useEffect(() => {
    getShopMeta()
      .then((d) => {
        if (d.totalProductCount) setGlobalCount(d.totalProductCount);
        if (d.fiberCounts) setFiberCountsState(d.fiberCounts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setListOffset(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const isDefaultState =
      fiberTab === "all" &&
      selectedCategories.size === 0 &&
      sortBy === "new" &&
      marketFilter === "all" &&
      !debouncedSearch &&
      priceCap == null &&
      !priceCap600Plus &&
      selectedBrandSlugs.length === 0 &&
      listOffset === 0;

    if (isDefaultState && initialFetchDone.current && listOffset === 0) {
      setProducts(initialProducts);
      setHasMore(initialHasMore);
      setIsLoading(false);
    } else {
      const fetchProducts = async () => {
        setIsLoading(true);
        try {
          const result = await getShopProducts({
            fiber: fiberTab !== "all" ? fiberTab : undefined,
            categories: categoryList.length ? categoryList : undefined,
            brandSlugs: selectedBrandSlugs.length ? selectedBrandSlugs : undefined,
            maxPrice: effectiveMaxPrice,
            price600Plus: priceCap600Plus,
            sort: sortBy,
            market: marketFilter !== "all" ? marketFilter : undefined,
            limit: SHOP_PAGE_SIZE,
            offset: listOffset,
            search: debouncedSearch || undefined,
            skipTotal: listOffset === 0,
          });
          if (listOffset === 0) {
            setProducts(result.products || []);
          } else {
            setProducts((prev) => {
              const seen = new Set(prev.map((p) => p.productId || p.id));
              const next = [...prev];
              for (const p of result.products || []) {
                const id = p.productId || p.id;
                if (!seen.has(id)) {
                  seen.add(id);
                  next.push(p);
                }
              }
              return next;
            });
          }
          setHasMore(result.hasMore);
          if (result.total != null) setResultTotal(result.total);
        } catch {
          if (listOffset === 0) {
            setProducts([]);
            setResultTotal(0);
            setHasMore(false);
          }
        }
        setIsLoading(false);
        setLoadingMore(false);
      };
      fetchProducts();
    }

  }, [
    fiberTab,
    categoryList.join(","),
    sortBy,
    marketFilter,
    listOffset,
    debouncedSearch,
    effectiveMaxPrice,
    priceCap600Plus,
    selectedBrandSlugs.join(","),
    initialProducts,
    initialHasMore,
  ]);

  useEffect(() => {
    setCountLoading(true);
    getShopCatalogCount({
      fiber: fiberTab,
      categories: categoryList.length ? categoryList : undefined,
      brandSlugs: selectedBrandSlugs.length ? selectedBrandSlugs : undefined,
      maxPrice: effectiveMaxPrice,
      price600Plus: priceCap600Plus,
      market: marketFilter,
      search: debouncedSearch || undefined,
    })
      .then(({ total }) => {
        setResultTotal(total);
      })
      .catch(() => {})
      .finally(() => setCountLoading(false));
  }, [
    fiberTab,
    categoryList.join(","),
    marketFilter,
    debouncedSearch,
    effectiveMaxPrice,
    priceCap600Plus,
    selectedBrandSlugs.join(","),
  ]);

  useEffect(() => {
    const onMarket = () => {
      setListOffset(0);
      setProducts([]);
      setIsLoading(true);
    };
    window.addEventListener(SHOP_MARKET_INVALIDATE, onMarket);
    return () => window.removeEventListener(SHOP_MARKET_INVALIDATE, onMarket);
  }, []);

  const isSearchActive = debouncedSearch.length >= 2;

  const useGlobalCountHint =
    fiberTab === "all" &&
    selectedCategories.size === 0 &&
    sortBy === "new" &&
    marketFilter === "all" &&
    !debouncedSearch &&
    priceCap == null &&
    !priceCap600Plus &&
    selectedBrandSlugs.length === 0;

  const displayResultTotal =
    resultTotal ??
    (useGlobalCountHint && globalCount > 0
      ? globalCount
      : useGlobalCountHint && fiberTab !== "all" && fiberCountsState[fiberTab]
        ? fiberCountsState[fiberTab]
        : null);

  const currentSort = SORT_OPTIONS.find((s) => s.key === sortBy) ?? SORT_OPTIONS[0];

  const toggleCategory = (key: CategoryFilterKey) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setListOffset(0);
  };

  const activeFilterChips = [
    ...(fiberTab !== "all"
      ? [{ id: "fiber", label: FIBER_TABS.find((t) => t.key === fiberTab)?.label || fiberTab, onRemove: () => { setFiberTab("all"); setListOffset(0); } }]
      : []),
    ...categoryList.map((cat) => ({
      id: `cat-${cat}`,
      label: CATEGORY_FILTERS.find((c) => c.key === cat)?.label || cat,
      onRemove: () => {
        setSelectedCategories((prev) => {
          const next = new Set(prev);
          next.delete(cat as CategoryFilterKey);
          return next;
        });
        setListOffset(0);
      },
    })),
    ...(priceCap != null || priceCap600Plus
      ? [{
          id: "price",
          label: priceCap600Plus ? "£600+" : PRICE_FILTER_OPTIONS.find((p) => p.id === String(priceCap))?.label || "Price",
          onRemove: () => { setPriceCap(null); setPriceCap600Plus(false); setListOffset(0); },
        }]
      : []),
    ...selectedBrandSlugs.map((slug) => ({
      id: `brand-${slug}`,
      label: shopBrands.find((b) => b.slug === slug)?.name || slug,
      onRemove: () => {
        setSelectedBrandSlugs((prev) => prev.filter((s) => s !== slug));
        setListOffset(0);
      },
    })),
    ...(marketFilter !== "all"
      ? [{ id: "market", label: activeRegion.country, onRemove: () => { selectLocation("all"); } }]
      : []),
  ];

  const filteredBrands = shopBrands.filter((b) =>
    !brandSearch.trim() || b.name.toLowerCase().includes(brandSearch.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen pb-[7.5rem] md:pb-16">
      <div className="py-8 md:py-12 flex flex-col gap-0">
        <header className="mb-8 md:mb-10">
          <div className="flex flex-col gap-6 md:gap-8">
            <div>
              <h1 className="text-2xl md:text-4xl font-serif" data-testid="text-shop-title">
                {isSearchActive ? `Results for "${debouncedSearch}"` : "Shop"}
              </h1>
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

        <CatalogMobileToolbar
          className="mb-4"
          resultCount={displayResultTotal}
          countLoading={countLoading && resultTotal == null}
          sortLabel={currentSort.label}
          onOpenFilter={() => { setShowFilterSheet(true); setShowSortSheet(false); }}
          onOpenSort={() => { setShowSortSheet(true); setShowFilterSheet(false); }}
          activeFilters={activeFilterChips}
        />
        <p className="lg:hidden text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-4">
          Delivering to {activeRegion.country}
          {activeRegion.currency !== "ALL" ? ` · ${activeRegion.currency}` : ""}
        </p>

        <div className="lg:flex lg:gap-10 lg:items-start">
          <CatalogFilterSidebar
            resultCount={displayResultTotal}
            isLoading={countLoading || (isLoading && displayResultTotal == null)}
            fiberTab={fiberTab}
            categoryFilter={categoryList[0] ?? "all"}
            fiberOptions={FIBER_TABS}
            categoryOptions={[{ key: "all" as const, label: "All" }, ...CATEGORY_FILTERS]}
            onFiberChange={(key) => {
              setFiberTab(key);
              setSelectedCategories(new Set());
              setListOffset(0);
            }}
            onCategoryChange={(key) => {
              if (key === "all") setSelectedCategories(new Set());
              else setSelectedCategories(new Set([key as CategoryFilterKey]));
              setListOffset(0);
            }}
          />

          <div className="flex-1 min-w-0">
        <div className="hidden md:flex items-center justify-end gap-3 mb-6">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Delivering to
          </span>
          <CountrySelector detectedCountryCode={detectedCountry} />
        </div>

        <div className="hidden lg:flex items-center justify-between py-3 border-y border-border/20 mb-6 md:mb-8 gap-4">
          <p className="text-[11px] md:text-xs text-muted-foreground" data-testid="text-result-count-desktop">
            {countLoading && displayResultTotal == null ? (
              <span className="animate-pulse">Loading…</span>
            ) : (
              <><span className="text-foreground">{(displayResultTotal ?? products.length).toLocaleString()}</span> results</>
            )}
          </p>
          <div className="relative">
              <button
                type="button"
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 text-[11px] md:text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="btn-sort"
              >
                <span className="text-foreground/80">Sort By</span> {currentSort.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border/40 shadow-xl min-w-[200px]">
                    {SORT_OPTIONS.map(option => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => { setSortBy(option.key); setListOffset(0); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[11px] md:text-xs transition-colors ${
                          sortBy === option.key ? "bg-[#f5f5f3] text-foreground font-medium" : "text-muted-foreground hover:bg-[#f5f5f3] hover:text-foreground"
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

        <CatalogMobileSheet
          open={showSortSheet}
          onClose={() => setShowSortSheet(false)}
          title="Sort by"
        >
          <div className="flex flex-col border border-border/30">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setSortBy(option.key);
                  setListOffset(0);
                  setShowSortSheet(false);
                }}
                className={`w-full text-left px-4 py-3.5 text-[12px] border-b border-border/20 last:border-0 ${
                  sortBy === option.key ? "bg-[#f5f5f3] font-medium" : "text-muted-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CatalogMobileSheet>

        <CatalogMobileSheet
          open={showFilterSheet}
          onClose={() => setShowFilterSheet(false)}
          title="Filter"
          subtitle={
            displayResultTotal != null
              ? `${displayResultTotal.toLocaleString()} results`
              : countLoading
                ? "Loading…"
                : undefined
          }
          footer={
            <button
              type="button"
              onClick={() => setShowFilterSheet(false)}
              className="w-full bg-foreground text-background py-3.5 text-[10px] uppercase tracking-[0.2em]"
            >
              Apply filters
            </button>
          }
        >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Wear to where</p>
              <div className="flex flex-wrap gap-2 mb-8 max-h-[140px] overflow-y-auto">
                {WEAR_TO_WHERE_OPTIONS.map((opt) => (
                  <Link
                    key={opt.key}
                    href={opt.href}
                    onClick={() => setShowFilterSheet(false)}
                    className="px-4 py-2 text-[10px] uppercase tracking-[0.12em] border border-border/40 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Material</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {MATERIAL_FILTER_OPTIONS.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => { setFiberTab(tab.key); setListOffset(0); }}
                    className={`px-4 py-2 text-[10px] uppercase tracking-[0.12em] border ${
                      fiberTab === tab.key ? "border-foreground bg-foreground text-background" : "border-border/40"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Category</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {CATEGORY_FILTERS.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => toggleCategory(cat.key)}
                    className={`px-4 py-2 text-[10px] uppercase tracking-[0.12em] border ${
                      selectedCategories.has(cat.key) ? "border-foreground bg-foreground text-background" : "border-border/40"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Price</p>
              <div className="flex flex-col gap-2 mb-8 border border-border/30">
                {PRICE_FILTER_OPTIONS.map((opt) => {
                  const active =
                    opt.id === "any"
                      ? priceCap == null && !priceCap600Plus
                      : opt.id === "600plus"
                        ? priceCap600Plus
                        : priceCap === Number(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (opt.id === "any") {
                          setPriceCap(null);
                          setPriceCap600Plus(false);
                        } else if (opt.id === "600plus") {
                          setPriceCap(null);
                          setPriceCap600Plus(true);
                        } else {
                          setPriceCap(Number(opt.id) as ShopPriceCap);
                          setPriceCap600Plus(false);
                        }
                        setListOffset(0);
                      }}
                      className={`w-full text-left px-4 py-3 text-[12px] border-b border-border/20 last:border-0 ${
                        active ? "bg-[#f5f5f3] font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Brand</p>
              <input
                type="search"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Search brands"
                className="w-full border border-border/40 px-3 py-2.5 text-sm mb-3"
              />
              <div className="flex flex-col gap-1 mb-8 max-h-[200px] overflow-y-auto border border-border/30">
                {filteredBrands.slice(0, 80).map((brand) => {
                  const checked = selectedBrandSlugs.includes(brand.slug);
                  return (
                    <button
                      key={brand.slug}
                      type="button"
                      onClick={() => {
                        setSelectedBrandSlugs((prev) =>
                          checked ? prev.filter((s) => s !== brand.slug) : [...prev, brand.slug]
                        );
                        setListOffset(0);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-[12px] flex justify-between gap-2 border-b border-border/10 last:border-0 ${
                        checked ? "bg-[#f5f5f3] font-medium" : "text-muted-foreground"
                      }`}
                    >
                      <span>{brand.name}</span>
                      {brand.count > 0 && (
                        <span className="text-[10px] text-muted-foreground/70">{brand.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
        </CatalogMobileSheet>

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

        {isLoading && products.length === 0 ? (
          <LoadingSkeleton />
        ) : !isLoading && products.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/15" />
            <p className="text-muted-foreground text-sm">No products match this combination.</p>
            <button
              onClick={() => {
                setFiberTab("all");
                setSelectedCategories(new Set());
                setPriceCap(null);
                setPriceCap600Plus(false);
                setSelectedBrandSlugs([]);
                setSortBy("new");
                setSearchQuery("");
                setDebouncedSearch("");
                selectLocation("all");
              }}
              className="text-[11px] uppercase tracking-[0.15em] text-foreground hover:text-muted-foreground transition-colors"
              data-testid="button-reset-filters"
            >
              View all products
            </button>
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-5 md:gap-y-12 transition-opacity ${isLoading && products.length > 0 ? "opacity-60" : ""}`}>
              {products.map((product: any, i: number) => (
                <ProductCard key={product.id} product={product} eager={i < 8} />
              ))}
            </div>

            {(hasMore || (resultTotal != null && resultTotal > products.length)) && (
              <div className="flex justify-center pt-10 md:pt-12">
                <button
                  onClick={() => {
                    if (loadingMore || isLoading) return;
                    setLoadingMore(true);
                    setListOffset(products.length);
                  }}
                  disabled={loadingMore || isLoading}
                  className="px-10 py-3.5 bg-foreground text-background text-[11px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-colors disabled:opacity-50"
                  data-testid="btn-load-more"
                >
                  {loadingMore
                    ? "Loading…"
                    : resultTotal != null && resultTotal > products.length
                      ? `Load more (${(resultTotal - products.length).toLocaleString()} remaining)`
                      : "Load more"}
                </button>
              </div>
            )}
          </>
        )}

        <div className="border-t border-border/20 pt-10 md:pt-14 mt-12 md:mt-16 lg:col-span-1">
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
      </div>
    </div>
  );
}
