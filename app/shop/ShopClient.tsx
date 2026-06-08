"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ProductLink } from "../components/ProductLink";
import { useSearchParams } from "next/navigation";
import { ShoppingBag, ArrowRight, Heart, ChevronDown, Search, X } from "lucide-react";
import { useProductFavorites } from "../hooks/use-product-favorites";
import { getShopProducts, getShopCatalogCount, getShopMeta, getShopBrands } from "./actions";
import {
  SHOP_COLOR_OPTIONS,
  SHOP_CATEGORY_OPTIONS,
  SHOP_PRICE_TIERS,
  priceBoundsFromTier,
  type ShopCategoryKey,
  type ShopPriceTierId,
} from "../../lib/catalog-filter-options";
import { CatalogMobileToolbar, CatalogMobileSheet } from "../components/CatalogMobileToolbar";
import { CATALOG_PAGE_SIZE, US_CATALOG_KNOWN_TOTAL } from "../../lib/catalog-constants";
import { formatDisplayPrice } from "../../lib/format-display-price";
import { canonicalProductId } from "../../lib/canonical-product-id";
import { useShoppingMarket, SHOP_MARKET_INVALIDATE } from "../hooks/use-shopping-market";
import { CatalogProductImage } from "../components/CatalogProductImage";
import { ProductGridSkeleton } from "../components/ProductGridSkeleton";
import { CountrySelector } from "../components/CountrySelector";
import { CatalogFilterSidebar } from "../components/CatalogFilterSidebar";
import { shopWearToWhereTextOptions } from "../../lib/wear-to-where";
import { fiberSubtypesFor } from "../../lib/fiber-subtypes";
import {
  SHIPPING_REGIONS,
  getRegionForCountryCode,
  getRegionForMarket,
  type MarketFilter,
} from "../../lib/shipping-regions";
import { cfProductCard } from "../../lib/cloudflare-images";

type FiberTab = "all" | "cashmere" | "silk" | "wool" | "cotton" | "linen" | "leather";
type CategoryFilterKey = ShopCategoryKey | "bottoms";
type SortOption = "new" | "price-high" | "price-low" | "natural-high";
const FIBER_TABS: { key: FiberTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "silk", label: "Silk" },
  { key: "linen", label: "Linen" },
  { key: "cashmere", label: "Cashmere" },
  { key: "cotton", label: "Cotton" },
  { key: "wool", label: "Wool" },
  { key: "leather", label: "Leather" },
];

const MATERIAL_FILTER_OPTIONS = FIBER_TABS.filter((t) => t.key !== "all");

const CATEGORY_FILTERS = SHOP_CATEGORY_OPTIONS;

const PRICE_FILTER_OPTIONS = SHOP_PRICE_TIERS.map((tier) => ({
  id: tier.id as ShopPriceTierId,
  label: tier.label,
}));

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
    let k = part.trim().toLowerCase();
    if (k === "bottoms") k = "trousers";
    if (CATEGORY_FILTERS.some((c) => c.key === k)) keys.add(k as CategoryFilterKey);
  }
  return keys;
}

function priceTierFromParam(raw: string | null): ShopPriceTierId {
  if (!raw || raw === "any") return "any";
  if (raw === "2500plus" || raw === "600plus") return "2500plus";
  if (raw === "100") return "200";
  if (raw === "300") return "500";
  if (raw === "600") return "1000";
  if (PRICE_FILTER_OPTIONS.some((p) => p.id === raw)) return raw as ShopPriceTierId;
  return "any";
}

function parseColorParam(raw: string | null): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  return SHOP_COLOR_OPTIONS.some((c) => c.value === normalized) ? normalized : null;
}

const SHOP_PAGE_SIZE = CATALOG_PAGE_SIZE;
const WEAR_TO_WHERE_OPTIONS = shopWearToWhereTextOptions();

function optimizeImageUrl(url: string, width: number): string {
  return cfProductCard(url);
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
      {product.stock_status === "low_stock" || product.stockStatus === "low_stock" ? (
        <span className="absolute top-3 left-3 z-20 text-[7px] tracking-[0.2em] uppercase font-medium text-white bg-[#420217] px-2 py-1">
          Low Stock
        </span>
      ) : null}
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
    <ProductGridSkeleton count={12} />
  );
}

export default function ShopClient({
  initialProducts,
  initialTotal = 0,
  initialHasMore = true,
  initialMeta,
  prefetchedBrands,
  detectedCountry,
}: {
  initialProducts: any[];
  initialTotal?: number;
  initialHasMore?: boolean;
  initialMeta?: { totalProductCount: number; fiberCounts: Record<string, number> };
  prefetchedBrands?: { slug: string; name: string; count: number }[];
  detectedCountry?: string;
}) {
  const searchParams = useSearchParams();

  const fiberParam = searchParams.get("fiber");
  const hasOtherFilters =
    !!searchParams.get("category") ||
    !!searchParams.get("q") ||
    !!searchParams.get("brands");
  const initialFiber: FiberTab =
    fiberParam && FIBER_TABS.some((t) => t.key === fiberParam)
      ? (fiberParam as FiberTab)
      : "all";
  const initialCategories = parseCategoryParams(searchParams.get("category"));
  const sortParam = searchParams.get("sort");
  const initialSort: SortOption =
    sortParam && SORT_OPTIONS.some((s) => s.key === sortParam)
      ? (sortParam as SortOption)
      : sortParam === "recommended"
        ? "new"
        : "new";
  const initialPriceTier = priceTierFromParam(searchParams.get("price"));
  const initialColor = parseColorParam(searchParams.get("color"));
  const initialBrands = (searchParams.get("brands") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const initialMarketFilter = (searchParams.get("market") as MarketFilter) || "all";
  const initialSearch = searchParams.get("q") || "";
  const { market: marketFilter, setMarket: setMarketFilter, catalogRegion } = useShoppingMarket(
    initialMarketFilter === "us-ca" || initialMarketFilter === "eu-uk-me" ? initialMarketFilter : "all"
  );

  const [fiberTab, setFiberTab] = useState<FiberTab>(initialFiber);
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryFilterKey>>(initialCategories);
  const [priceTier, setPriceTier] = useState<ShopPriceTierId>(initialPriceTier);
  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor);
  const [selectedBrandSlugs, setSelectedBrandSlugs] = useState<string[]>(initialBrands);
  const [selectedFiberSubtypes, setSelectedFiberSubtypes] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
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
    marketFilter === "us-ca" && catalogRegion === "ca"
      ? SHIPPING_REGIONS.find((r) => r.code === "CA") ?? getRegionForMarket(marketFilter)
      : marketFilter === "us-ca"
        ? SHIPPING_REGIONS.find((r) => r.code === "US") ?? getRegionForMarket(marketFilter)
        : detectedRegion && marketFilter === detectedRegion.market
          ? detectedRegion
          : getRegionForMarket(marketFilter);

  const selectLocation = (market: MarketFilter) => {
    setMarketFilter(market);
    setListOffset(0);
  };

  const categoryList = [...selectedCategories];
  const priceBounds = priceBoundsFromTier(priceTier);

  const syncUrl = useCallback(
    (
      fiber: string,
      categories: string[],
      sort: string,
      market: string,
      search: string,
      tier: ShopPriceTierId,
      brands: string[]
    ) => {
      const params = new URLSearchParams();
      if (fiber !== "all") params.set("fiber", fiber);
      if (categories.length) params.set("category", categories.join(","));
      if (sort !== "new") params.set("sort", sort);
      if (market !== "all") params.set("market", market);
      if (search) params.set("q", search);
      if (tier !== "any") params.set("price", tier === "2500plus" ? "2500plus" : tier);
      if (brands.length) params.set("brands", brands.join(","));
      const qs = params.toString();
      const newUrl = qs ? `/shop?${qs}` : "/shop";
      window.history.replaceState(null, "", newUrl);
    },
    []
  );

  useEffect(() => {
    syncUrl(fiberTab, categoryList, sortBy, marketFilter, debouncedSearch, priceTier, selectedBrandSlugs);
  }, [fiberTab, categoryList.join(","), sortBy, marketFilter, debouncedSearch, priceTier, selectedBrandSlugs.join(","), syncUrl]);

  const [shopBrands, setShopBrands] = useState<{ slug: string; name: string; count: number }[]>(
    prefetchedBrands?.map((b) => ({ slug: b.slug, name: b.name, count: b.count })) ?? []
  );

  useEffect(() => {
    if (prefetchedBrands?.length) return;
    getShopBrands()
      .then((brands) => setShopBrands(brands.map((b) => ({ slug: b.slug, name: b.name, count: b.count }))))
      .catch(() => {});
  }, [prefetchedBrands]);

  const [products, setProducts] = useState(initialProducts || []);
  const [resultTotal, setResultTotal] = useState<number | null>(initialTotal > 0 ? initialTotal : null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(!initialMeta);
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
  const [globalCount, setGlobalCount] = useState(initialMeta?.totalProductCount ?? 0);
  const [fiberCountsState, setFiberCountsState] = useState<Record<string, number>>(initialMeta?.fiberCounts ?? {});

  useEffect(() => {
    if (initialMeta) return;
    getShopMeta()
      .then((d) => {
        if (d.totalProductCount) setGlobalCount(d.totalProductCount);
        if (d.fiberCounts) setFiberCountsState(d.fiberCounts);
      })
      .catch(() => {});
  }, [initialMeta]);

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
      priceTier === "any" &&
      !selectedColor &&
      selectedBrandSlugs.length === 0 &&
      selectedFiberSubtypes.length === 0 &&
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
            fiberSubtypes: selectedFiberSubtypes.length ? selectedFiberSubtypes : undefined,
            color: selectedColor || undefined,
            maxPrice: priceBounds.maxPrice ?? null,
            minPrice: priceBounds.minPrice ?? null,
            price600Plus: priceTier === "2500plus",
            sort: sortBy,
            market: marketFilter !== "all" ? marketFilter : undefined,
            catalogRegion,
            limit: SHOP_PAGE_SIZE,
            offset: listOffset,
            search: debouncedSearch || undefined,
            skipTotal: false,
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
          if (result.total != null) {
            setResultTotal((prev) =>
              prev != null && result.total != null && result.total < prev ? prev : result.total
            );
          }
          setHasMore(result.hasMore);
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
    priceTier,
    selectedColor,
    catalogRegion,
    selectedBrandSlugs.join(","),
    selectedFiberSubtypes.join(","),
    initialProducts,
    initialHasMore,
  ]);

  useEffect(() => {
    setCountLoading(true);
    getShopCatalogCount({
      fiber: fiberTab,
      categories: categoryList.length ? categoryList : undefined,
      brandSlugs: selectedBrandSlugs.length ? selectedBrandSlugs : undefined,
      fiberSubtypes: selectedFiberSubtypes.length ? selectedFiberSubtypes : undefined,
      color: selectedColor || undefined,
      maxPrice: priceBounds.maxPrice ?? null,
      minPrice: priceBounds.minPrice ?? null,
      price600Plus: priceTier === "2500plus",
      market: marketFilter,
      catalogRegion,
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
    priceTier,
    selectedColor,
    catalogRegion,
    selectedBrandSlugs.join(","),
    selectedFiberSubtypes.join(","),
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
    priceTier === "any" &&
    !selectedColor &&
    selectedBrandSlugs.length === 0 &&
    selectedFiberSubtypes.length === 0;

  const displayResultTotal =
    resultTotal ??
    (initialTotal > 0 ? initialTotal : null) ??
    (useGlobalCountHint && globalCount > 0
      ? globalCount
      : useGlobalCountHint && fiberTab !== "all" && fiberCountsState[fiberTab]
        ? fiberCountsState[fiberTab]
        : useGlobalCountHint
          ? US_CATALOG_KNOWN_TOTAL
          : null);

  const displayTotal = displayResultTotal ?? (useGlobalCountHint ? US_CATALOG_KNOWN_TOTAL : products.length);
  const pagingTotal = displayTotal > 0 ? displayTotal : US_CATALOG_KNOWN_TOTAL;
  const canLoadMore = products.length > 0 && products.length < pagingTotal;

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
    ...(priceTier !== "any"
      ? [{
          id: "price",
          label: PRICE_FILTER_OPTIONS.find((p) => p.id === priceTier)?.label || "Price",
          onRemove: () => { setPriceTier("any"); setListOffset(0); },
        }]
      : []),
    ...(selectedColor
      ? [{
          id: "color",
          label: SHOP_COLOR_OPTIONS.find((c) => c.value === selectedColor)?.label || selectedColor,
          onRemove: () => { setSelectedColor(null); setListOffset(0); },
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
    ...selectedFiberSubtypes.map((st) => ({
      id: `subtype-${st}`,
      label: st,
      onRemove: () => {
        setSelectedFiberSubtypes((prev) => prev.filter((s) => s !== st));
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
          resultCount={displayTotal}
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
            resultCount={displayTotal}
            isLoading={countLoading && displayResultTotal == null}
            fiberTab={fiberTab}
            categoryFilter={categoryList[0] ?? "all"}
            fiberOptions={FIBER_TABS}
            categoryOptions={[{ key: "all" as const, label: "All" }, ...CATEGORY_FILTERS]}
            onFiberChange={(key) => {
              setFiberTab(key);
              setSelectedFiberSubtypes([]);
              setSelectedCategories(new Set());
              setListOffset(0);
            }}
            onCategoryChange={(key) => {
              if (key === "all") setSelectedCategories(new Set());
              else setSelectedCategories(new Set([key as CategoryFilterKey]));
              setListOffset(0);
            }}
            designers={shopBrands}
            selectedDesigners={selectedBrandSlugs}
            onDesignersChange={(slugs) => {
              setSelectedBrandSlugs(slugs);
              setListOffset(0);
            }}
            selectedFiberSubtypes={selectedFiberSubtypes}
            onFiberSubtypesChange={(subtypes) => {
              setSelectedFiberSubtypes(subtypes);
              setListOffset(0);
            }}
            colorOptions={[...SHOP_COLOR_OPTIONS]}
            selectedColor={selectedColor}
            onColorChange={(color) => {
              setSelectedColor(color);
              setListOffset(0);
            }}
            priceTierOptions={PRICE_FILTER_OPTIONS}
            selectedPriceTier={priceTier}
            onPriceTierChange={(tier) => {
              setPriceTier(tier as ShopPriceTierId);
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
            ) : displayTotal > 0 ? (
              <><span className="text-foreground">{displayTotal.toLocaleString()}</span> verified pieces</>
            ) : null}
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
            displayTotal > 0
              ? `${displayTotal.toLocaleString()} verified pieces`
              : countLoading && displayResultTotal == null
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
              <div className="flex flex-wrap gap-2 mb-4">
                {MATERIAL_FILTER_OPTIONS.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setFiberTab(tab.key);
                      setSelectedFiberSubtypes([]);
                      setListOffset(0);
                    }}
                    className={`px-4 py-2 text-[10px] uppercase tracking-[0.12em] border ${
                      fiberTab === tab.key ? "border-foreground bg-foreground text-background" : "border-border/40"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {fiberTab !== "all" && fiberSubtypesFor(fiberTab).length > 0 && (
                <div className="mt-1 mb-8 pl-4 border-l border-gray-100">
                  <p className="text-xs tracking-widest text-gray-400 uppercase mb-2">Type</p>
                  {fiberSubtypesFor(fiberTab).map((subtype) => (
                    <button
                      key={subtype}
                      type="button"
                      onClick={() => {
                        setSelectedFiberSubtypes((prev) =>
                          prev.includes(subtype)
                            ? prev.filter((s) => s !== subtype)
                            : [...prev, subtype]
                        );
                        setListOffset(0);
                      }}
                      className={`block w-full text-left text-sm py-1.5 ${
                        selectedFiberSubtypes.includes(subtype)
                          ? "font-medium text-black"
                          : "text-gray-500"
                      }`}
                    >
                      {subtype}
                    </button>
                  ))}
                </div>
              )}
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
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Color</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {SHOP_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => {
                      setSelectedColor(selectedColor === color.value ? null : color.value);
                      setListOffset(0);
                    }}
                    className={`px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase border transition-colors ${
                      selectedColor === color.value
                        ? "bg-[#1C2B2A] text-white border-[#1C2B2A]"
                        : "bg-white text-black border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Price</p>
              <div className="flex flex-col gap-2 mb-8 border border-border/30">
                {PRICE_FILTER_OPTIONS.map((opt) => {
                  const active = priceTier === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPriceTier(opt.id);
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
                setPriceTier("any");
                setSelectedColor(null);
                setSelectedBrandSlugs([]);
                setSelectedFiberSubtypes([]);
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

            {(canLoadMore || hasMore) && (
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
                    : `Load More · ${products.length.toLocaleString()} of ${pagingTotal.toLocaleString()}`}
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
