"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProductLink } from "../components/ProductLink";
import { ShoppingBag, Heart, Tag, ChevronDown } from "lucide-react";
import { useProductFavorites } from "../hooks/use-product-favorites";
import { formatDisplayOriginalPrice, formatDisplayPrice } from "../../lib/format-display-price";
import { useShoppingMarket, SHOP_MARKET_INVALIDATE } from "../hooks/use-shopping-market";
import { CatalogMobileToolbar, CatalogMobileSheet } from "../components/CatalogMobileToolbar";

type FiberTab = "all" | "cashmere" | "silk" | "wool" | "cotton" | "linen";
type PriceFilter = "all" | "100" | "200" | "300";
type SaleSort = "newest" | "discount" | "price_asc" | "price_desc";

const SORT_OPTIONS: { key: SaleSort; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "discount", label: "Biggest discount" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
];

function parsePriceNum(price: string | null | undefined): number {
  if (!price) return Number.POSITIVE_INFINITY;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function sortSaleProducts(items: any[], sort: SaleSort): any[] {
  const list = [...items];
  if (sort === "newest") {
    return list.sort((a, b) => String(b.createdAt || b.created_at || "").localeCompare(String(a.createdAt || a.created_at || "")));
  }
  if (sort === "discount") {
    return list.sort((a, b) => {
      const da = getDiscountPercent(a.originalPrice || a.original_price, a.price) ?? 0;
      const db = getDiscountPercent(b.originalPrice || b.original_price, b.price) ?? 0;
      return db - da;
    });
  }
  if (sort === "price_asc") {
    return list.sort((a, b) => parsePriceNum(a.price) - parsePriceNum(b.price));
  }
  return list.sort((a, b) => parsePriceNum(b.price) - parsePriceNum(a.price));
}

const FIBER_TABS: { key: FiberTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "cashmere", label: "Cashmere" },
  { key: "silk", label: "Silk" },
  { key: "wool", label: "Wool" },
  { key: "cotton", label: "Cotton" },
  { key: "linen", label: "Linen" },
];

const PRICE_FILTERS: { key: PriceFilter; label: string }[] = [
  { key: "all", label: "All Prices" },
  { key: "100", label: "Under $100" },
  { key: "200", label: "Under $200" },
  { key: "300", label: "Under $300" },
];

function getDiscountPercent(originalPrice: string | null, currentPrice: string | null): number | null {
  if (!originalPrice || !currentPrice) return null;
  const orig = parseFloat(String(originalPrice).replace(/[^0-9.]/g, ""));
  const curr = parseFloat(String(currentPrice).replace(/[^0-9.]/g, ""));
  if (!orig || !curr || orig <= curr) return null;
  return Math.round(((orig - curr) / orig) * 100);
}

function SaleProductCard({ product }: { product: any }) {
  const { toggle, isFavorited } = useProductFavorites();
  const productId = String(product.id);
  const saved = isFavorited(productId);
  const name = product.name || "";
  const brandName = product.brandName || product.brand_name || "";
  const imageUrl = product.imageUrl || product.image_url;
  const price = product.price;
  const originalPrice = product.originalPrice || product.original_price;
  const composition = product.composition;
  const discount = getDiscountPercent(originalPrice, price);
  const priceHints = {
    price,
    originalPrice,
    listingRegion: product.listingRegion ?? product.listing_region,
    productId: product.productId || product.product_id,
  };
  const priceShown = formatDisplayPrice(priceHints);
  const originalShown = formatDisplayOriginalPrice(priceHints);

  return (
    <ProductLink href={`/product/${product.id}`} className="group flex flex-col cursor-pointer relative" data-testid={`sale-product-${product.id}`}>
      {imageUrl ? (
        <div className="aspect-[3/4] bg-[#f5f5f3] relative overflow-hidden">
          <img src={imageUrl} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading="lazy" />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId, brandName, priceShown || String(price)); }}
            className={`absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center transition-opacity duration-200 ${saved ? "opacity-100" : "md:opacity-0 md:group-hover:opacity-100"}`}
            data-testid={`btn-favorite-sale-${product.id}`}
            aria-label={saved ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart className={`w-4 h-4 drop-shadow-sm transition-colors ${saved ? "fill-red-500 text-red-500" : "text-white/80"}`} />
          </button>
          {discount && (
            <div className="absolute bottom-3 left-3">
              <span className="bg-red-600/90 text-white px-2.5 py-1 text-[9px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" /> {discount}% off
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[3/4] bg-[#f5f5f3] flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-neutral-300" />
        </div>
      )}
      <div className="flex flex-col gap-1 pt-3">
        <span className="text-[10px] md:text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{brandName}</span>
        <h3 className="text-[12px] md:text-[13px] leading-snug line-clamp-2 text-foreground">{name}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {priceShown && <span className="text-[12px] md:text-[13px] font-medium text-red-600">{priceShown}</span>}
          {originalShown && discount && (
            <span className="text-[11px] text-muted-foreground line-through">{originalShown}</span>
          )}
        </div>
        {composition && (
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 mt-0.5 line-clamp-1">{composition}</span>
        )}
      </div>
    </ProductLink>
  );
}

export default function SaleClient({
  initialProducts,
  initialTotal,
  initialHasMore = true,
}: {
  initialProducts: any[];
  initialTotal: number | null;
  initialHasMore?: boolean;
}) {
  const [fiberTab, setFiberTab] = useState<FiberTab>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [products, setProducts] = useState(initialProducts || []);
  const [total, setTotal] = useState<number | null>(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [countLoading, setCountLoading] = useState(initialTotal == null);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(initialProducts?.length || 0);
  const [sortBy, setSortBy] = useState<SaleSort>("newest");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const { market } = useShoppingMarket();
  const currentSort = SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0];
  const sortedProducts = sortSaleProducts(products, sortBy);

  const pageSize = 40;

  useEffect(() => {
    const onMarket = () => {
      setOffset(0);
      setProducts([]);
      setIsLoading(true);
    };
    window.addEventListener(SHOP_MARKET_INVALIDATE, onMarket);
    return () => window.removeEventListener(SHOP_MARKET_INVALIDATE, onMarket);
  }, []);

  useEffect(() => {
    const isDefault = fiberTab === "all" && priceFilter === "all";
    if (isDefault && initialProducts?.length) {
      setProducts(initialProducts);
      setTotal(initialTotal);
      setOffset(initialProducts.length);
      return;
    }

    setIsLoading(true);
    const params = new URLSearchParams();
    if (fiberTab !== "all") params.set("fiber", fiberTab);
    if (priceFilter !== "all") params.set("maxPrice", priceFilter);
    if (market !== "all") params.set("market", market);
    params.set("limit", String(pageSize));
    params.set("offset", "0");
    params.set("skipCount", "1");

    fetch(`/api/sale?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        if (d.total != null) setTotal(d.total);
        setHasMore(Boolean(d.hasMore));
        setOffset((d.products || []).length);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    const countParams = new URLSearchParams(params);
    countParams.delete("skipCount");
    setCountLoading(true);
    fetch(`/api/sale?${countParams}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.total != null) setTotal(d.total);
      })
      .finally(() => setCountLoading(false));
  }, [fiberTab, priceFilter, market, initialProducts, initialTotal]);

  const loadMore = () => {
    if (loadingMore || (!hasMore && total != null && products.length >= total)) return;
    setLoadingMore(true);
    const params = new URLSearchParams();
    if (fiberTab !== "all") params.set("fiber", fiberTab);
    if (priceFilter !== "all") params.set("maxPrice", priceFilter);
    if (market !== "all") params.set("market", market);
    params.set("limit", String(pageSize));
    params.set("offset", String(offset));

    fetch(`/api/sale?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const next = d.products || [];
        setProducts((prev) => {
          const seen = new Set(prev.map((p: any) => p.id));
          return [...prev, ...next.filter((p: any) => !seen.has(p.id))];
        });
        setOffset((o) => o + next.length);
        if (d.total) setTotal(d.total);
      })
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="py-10 md:py-16 flex flex-col gap-8 md:gap-12">
        <div className="flex flex-col gap-3 text-center">
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground">Verified Natural Fabrics</span>
          <h1 className="text-3xl md:text-5xl font-serif" data-testid="text-sale-title">The Edit — On Sale</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {total != null && total > 0 ? `${total.toLocaleString()} verified products on sale` : "Sale items will appear here as prices drop"}
          </p>
        </div>

        <CatalogMobileToolbar
          resultCount={total}
          countLoading={countLoading}
          sortLabel={currentSort.label}
          onOpenFilter={() => setShowFilterSheet(true)}
          onOpenSort={() => setShowSortSheet(true)}
          activeFilters={[
            ...(fiberTab !== "all" ? [{ id: "fiber", label: fiberTab, onRemove: () => setFiberTab("all") }] : []),
            ...(priceFilter !== "all" ? [{ id: "price", label: PRICE_FILTERS.find((p) => p.key === priceFilter)?.label || priceFilter, onRemove: () => setPriceFilter("all") }] : []),
          ]}
        />
        <div className="hidden md:flex items-center justify-between border-y border-border/20 py-3 mb-2 gap-4">
          <p className="text-[11px] text-muted-foreground flex-shrink-0">
            <span className="text-foreground font-medium">{total != null ? total.toLocaleString() : "—"}</span> on sale
          </p>
          <div className="flex items-center gap-4 md:gap-6 ml-auto">
            <button
              type="button"
              onClick={() => setShowFilterSheet(true)}
              className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
              data-testid="btn-sale-filter"
            >
              Filter
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="btn-sale-sort"
              >
                Sort: {currentSort.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border/40 shadow-xl min-w-[180px]">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => { setSortBy(option.key); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[11px] transition-colors ${
                          sortBy === option.key ? "bg-[#f5f5f3] text-foreground" : "text-muted-foreground hover:bg-[#f5f5f3] hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {showFilterSheet && (
          <>
            <div className="fixed inset-0 z-[90] bg-black/40" onClick={() => setShowFilterSheet(false)} />
            <div className="fixed inset-x-0 bottom-0 z-[100] bg-background border-t border-border/40 rounded-t-2xl max-h-[85vh] overflow-y-auto p-6 pb-10">
              <p className="text-lg font-serif mb-1">Filter &amp; Sort</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-6">Material</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {FIBER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => { setFiberTab(tab.key); setOffset(0); }}
                    className={`px-4 py-2 text-[10px] uppercase tracking-[0.12em] border ${
                      fiberTab === tab.key ? "border-foreground bg-foreground text-background" : "border-border/40"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Price</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {PRICE_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => { setPriceFilter(f.key); setOffset(0); }}
                    className={`px-4 py-2 text-[10px] uppercase tracking-[0.12em] border ${
                      priceFilter === f.key ? "border-foreground bg-foreground text-background" : "border-border/40"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="w-full bg-foreground text-background py-3.5 text-[10px] uppercase tracking-[0.2em]"
              >
                View {total.toLocaleString()} on sale
              </button>
            </div>
          </>
        )}

        <div className="hidden md:flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {FIBER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFiberTab(tab.key)}
                className={`px-4 py-2 text-[10px] uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${fiberTab === tab.key ? "bg-foreground text-background" : "border border-border/60 text-muted-foreground hover:text-foreground"}`}
                data-testid={`btn-fiber-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {PRICE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setPriceFilter(f.key)}
                className={`px-4 py-2 text-[10px] uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${priceFilter === f.key ? "bg-foreground text-background" : "border border-border/60 text-muted-foreground hover:text-foreground"}`}
                data-testid={`btn-price-${f.key}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-5 md:gap-y-12">
            {Array.from({ length: 8 }).map((_, i) => (
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
        ) : sortedProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-5 md:gap-y-12" data-testid="sale-product-grid">
              {sortedProducts.map((product: any) => (
                <SaleProductCard key={product.id} product={product} />
              ))}
            </div>
            {canLoadMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="border border-foreground px-10 py-3 uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
                  data-testid="btn-load-more-sale"
                >
                  {loadingMore ? "Loading…" : "Load More"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 flex flex-col gap-4 items-center">
            <Tag className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No sale items match your filters yet.</p>
            <p className="text-xs text-muted-foreground/70">Our price tracker monitors products daily — check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
