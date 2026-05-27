"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { ProductLink } from "../../components/ProductLink";
import { CatalogProductImage } from "../../components/CatalogProductImage";
import { CatalogMobileToolbar, CatalogMobileSheet } from "../../components/CatalogMobileToolbar";
import { Heart } from "lucide-react";
import { useProductFavorites } from "../../hooks/use-product-favorites";
import { formatDisplayOriginalPrice, formatDisplayPrice } from "../../../lib/format-display-price";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  dresses: "Dresses",
  tops: "Tops",
  knitwear: "Knitwear",
  bottoms: "Bottoms",
  outerwear: "Outerwear",
  skirts: "Skirts",
  pants: "Pants",
  shirts: "Shirts",
  jackets: "Jackets",
};

const PRODUCTS_PER_PAGE = 24;
const DESIGNER_PAGE_SIZE = 48;

type PriceSort = "default" | "price-low" | "price-high";
const PRICE_SORT_OPTIONS: { key: PriceSort; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "price-low", label: "Price: Low to High" },
  { key: "price-high", label: "Price: High to Low" },
];

function parsePrice(p: string | null | undefined): number {
  if (!p) return 0;
  const match = p.replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

interface ProductItem {
  id: string;
  name: string;
  productId: string;
  url: string;
  imageUrl: string;
  price: string;
  composition: string;
  naturalFiberPercent: number;
  category: string;
  matchingSetId?: string | null;
  [key: string]: any;
}

export function DesignerDetailProducts({
  products,
  designerName,
  designerSlug,
  designerWebsite,
  hasProfile,
  profileMaterialStrengths,
  shopMode = false,
  initialHasMore = false,
  fiberFilter = null,
}: {
  products: ProductItem[];
  designerName: string;
  designerSlug: string;
  designerWebsite: string | null;
  hasProfile: boolean;
  profileMaterialStrengths: string[];
  initialHasMore?: boolean;
  shopMode?: boolean;
  fiberFilter?: string | null;
}) {
  const [catalogProducts, setCatalogProducts] = useState<ProductItem[]>(products);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showSaleOnly, setShowSaleOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const [priceSort, setPriceSort] = useState<PriceSort>("default");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [serverHasMore, setServerHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const { favorites, toggle: toggleProductFav } = useProductFavorites();

  const visibleProducts = useMemo(() => {
    return catalogProducts.filter((p) => p.imageUrl);
  }, [catalogProducts]);

  const categories = useMemo(() => {
    const cats: Record<string, number> = {};
    visibleProducts.forEach((p) => {
      const cat = (p.category || "").toLowerCase().trim();
      if (cat) cats[cat] = (cats[cat] || 0) + 1;
    });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({ key: cat, label: CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1), count }));
  }, [visibleProducts]);

  const saleCount = useMemo(() => {
    return visibleProducts.filter((p) => p.isSale).length;
  }, [visibleProducts]);

  const filteredProducts = useMemo(() => {
    let filtered = visibleProducts;
    if (showSaleOnly) {
      filtered = filtered.filter((p) => p.isSale);
    }
    if (activeCategory !== "all") {
      filtered = filtered.filter((p) => (p.category || "").toLowerCase().trim() === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.composition || "").toLowerCase().includes(q)
      );
    }
    if (fiberFilter) {
      const f = fiberFilter.toLowerCase();
      filtered = filtered.filter((p) => (p.composition || "").toLowerCase().includes(f));
    }
    if (priceSort !== "default") {
      filtered = [...filtered].sort((a, b) => {
        const pa = parsePrice(a.price);
        const pb = parsePrice(b.price);
        return priceSort === "price-low" ? pa - pb : pb - pa;
      });
    }
    return filtered;
  }, [visibleProducts, activeCategory, showSaleOnly, searchQuery, priceSort, fiberFilter]);

  const paginatedProducts = useMemo(() => {
    if (shopMode) return filteredProducts;
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount, shopMode]);

  const hasMoreClient = filteredProducts.length > visibleCount;
  const hasMore = shopMode ? serverHasMore : hasMoreClient;

  const loadMoreFromServer = useCallback(async () => {
    if (!shopMode || loadingMore || !serverHasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/catalog?mode=brand&slug=${encodeURIComponent(designerSlug)}&limit=${DESIGNER_PAGE_SIZE}&offset=${catalogProducts.length}`
      );
      const data = await res.json();
      const next = (data.products || []) as ProductItem[];
      setCatalogProducts((prev) => {
        const seen = new Set(prev.map((p) => p.productId || p.id));
        return [...prev, ...next.filter((p) => !seen.has(p.productId || p.id))];
      });
      setServerHasMore(Boolean(data.hasMore));
    } finally {
      setLoadingMore(false);
    }
  }, [shopMode, loadingMore, serverHasMore, designerSlug, catalogProducts.length]);

  useEffect(() => {
    if (!shopMode || !serverHasMore) return;
    const node = loadMoreSentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMoreFromServer();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shopMode, serverHasMore, loadMoreFromServer]);

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
    setVisibleCount(PRODUCTS_PER_PAGE);
  }, []);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    setVisibleCount(PRODUCTS_PER_PAGE);
  }, []);

  return (
    <section className="flex flex-col gap-5" data-testid="section-browse-collection">
      {!shopMode && (
        <div className="flex items-center gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] font-medium">
            {visibleProducts.length > 0 ? `${visibleProducts.length} Verified Pieces` : `Browse ${designerName}`}
          </h2>
        </div>
      )}

      {visibleProducts.length > 0 ? (
        <>
          {shopMode && (
            <CatalogMobileToolbar
              className="mb-4"
              resultCount={visibleProducts.length}
              countLoading={false}
              sortLabel={PRICE_SORT_OPTIONS.find((o) => o.key === priceSort)?.label || "Default"}
              onOpenFilter={() => setShowFilterSheet(true)}
              onOpenSort={() => setShowSortSheet(true)}
              activeFilters={[
                ...(activeCategory !== "all"
                  ? [{ id: "cat", label: CATEGORY_LABELS[activeCategory] || activeCategory, onRemove: () => setActiveCategory("all") }]
                  : []),
                ...(showSaleOnly ? [{ id: "sale", label: "Sale", onRemove: () => setShowSaleOnly(false) }] : []),
              ]}
            />
          )}

          {!shopMode && (
            <p className="text-sm text-foreground/70 leading-relaxed">
              Every item below has been verified by INTERTEXE for natural fiber content. Where a piece shows less than 100%, the remaining percentage is typically from functional components like linings, trims, or elastic.
            </p>
          )}

          {(visibleProducts.length > 6 || categories.length > 1) && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" /></svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={`Search ${designerName} products...`}
                  className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border/30 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 transition-colors"
                  data-testid="input-product-search"
                />
              </div>

              {categories.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                  <button
                    onClick={() => { handleCategoryChange("all"); setShowSaleOnly(false); }}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      activeCategory === "all" && !showSaleOnly
                        ? "bg-foreground text-background"
                        : "bg-secondary/60 text-foreground/70 hover:bg-secondary"
                    }`}
                    data-testid="filter-category-all"
                  >
                    All ({visibleProducts.length})
                  </button>
                  {saleCount > 0 && (
                    <button
                      onClick={() => { setShowSaleOnly(!showSaleOnly); setActiveCategory("all"); setVisibleCount(PRODUCTS_PER_PAGE); }}
                      className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                        showSaleOnly
                          ? "bg-[#b91c1c] text-white"
                          : "bg-secondary/60 text-[#b91c1c] hover:bg-secondary"
                      }`}
                      data-testid="filter-sale"
                    >
                      Sale ({saleCount})
                    </button>
                  )}
                  {categories.map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => { handleCategoryChange(key); setShowSaleOnly(false); }}
                      className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                        activeCategory === key && !showSaleOnly
                          ? "bg-foreground text-background"
                          : "bg-secondary/60 text-foreground/70 hover:bg-secondary"
                      }`}
                      data-testid={`filter-category-${key}`}
                    >
                      {label} ({count})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{filteredProducts.length}</span> items
            </p>
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="btn-price-sort"
              >
                {PRICE_SORT_OPTIONS.find((o) => o.key === priceSort)?.label || "Sort"}
                <svg className={`w-3.5 h-3.5 transition-transform ${showSortMenu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border/60 shadow-lg min-w-[180px]">
                    {PRICE_SORT_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => { setPriceSort(option.key); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                          priceSort === option.key
                            ? "bg-secondary font-medium text-foreground"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
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

          {filteredProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {paginatedProducts.map((product) => (
                  <div
                    key={product.productId || product.id}
                    className="group relative bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col"
                    data-testid={`card-product-${product.productId || product.id}`}
                  >
                    <ProductLink href={`/product/${product.id}`} className="flex flex-col flex-1">
                      <div className="relative">
                        {product.imageUrl ? (
                          <CatalogProductImage
                            src={product.imageUrl}
                            alt={product.name}
                            name={product.name}
                            category={product.category}
                          />
                        ) : (
                          <div className="aspect-[3/4] bg-secondary flex items-center justify-center text-muted-foreground">
                            <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                          </div>
                        )}
                        {product.naturalFiberPercent > 0 && (
                          <div className="absolute top-2 left-2 pointer-events-none">
                            <span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
                              {product.naturalFiberPercent}% Natural
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col gap-1.5 flex-1">
                        <h3 className="text-xs md:text-sm leading-snug line-clamp-2 font-medium">{product.name}</h3>
                        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1">{product.composition}</p>
                        {product.price && (
                          <div className="flex items-center gap-2 mt-auto pt-1">
                            <p className={`text-xs font-medium ${product.isSale ? "text-[#b91c1c]" : ""}`}>
                              {formatDisplayPrice(product)}
                            </p>
                            {product.isSale && product.originalPrice && (
                              <>
                                <p className="text-[10px] text-muted-foreground line-through">
                                  {formatDisplayOriginalPrice(product)}
                                </p>
                                {(() => {
                                  const cur = parsePrice(product.price);
                                  const orig = parsePrice(product.originalPrice);
                                  const disc = orig > 0 ? Math.round((1 - cur / orig) * 100) : 0;
                                  return disc > 0 ? <span className="text-[10px] font-medium text-[#b91c1c]">{disc}% OFF</span> : null;
                                })()}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </ProductLink>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleProductFav(String(product.id)); }}
                      className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
                      data-testid={`btn-fav-${product.id}`}
                      aria-label={favorites.has(String(product.id)) ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart className={`w-3.5 h-3.5 ${favorites.has(String(product.id)) ? "fill-red-500 text-red-500" : "text-foreground/70"}`} />
                    </button>
                  </div>
                ))}
              </div>
              {shopMode && hasMore && <div ref={loadMoreSentinelRef} className="h-2 w-full" aria-hidden="true" />}
              {hasMore && (
                <button
                  onClick={() => {
                    if (shopMode) loadMoreFromServer();
                    else setVisibleCount((prev) => prev + PRODUCTS_PER_PAGE);
                  }}
                  disabled={loadingMore}
                  className="w-full border border-foreground/20 hover:border-foreground/40 text-foreground py-3.5 uppercase tracking-widest text-[10px] md:text-xs transition-colors active:scale-[0.98] disabled:opacity-50"
                  data-testid="button-load-more-products"
                >
                  {loadingMore ? "Loading…" : shopMode ? "Load more" : `Load More (${filteredProducts.length - visibleCount} remaining)`}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No products match your search. Try a different term or category.
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground/70 leading-relaxed">
            {hasProfile
              ? `We're currently verifying ${designerName}'s product compositions. ${profileMaterialStrengths.length > 0 ? `Based on our analysis, look for pieces in ${profileMaterialStrengths.slice(0, 3).join(", ").toLowerCase()} for the best natural fiber content.` : ""}`
              : `Product verification for ${designerName} is in progress. Check back soon for verified pieces with natural fiber compositions.`}
          </p>
          {designerWebsite && (
            <Link
              href={`/leaving?url=${encodeURIComponent(designerWebsite)}&brand=${encodeURIComponent(designerName)}`}
              className="flex items-center justify-center gap-3 w-full border border-foreground/20 hover:border-foreground/40 text-foreground px-8 py-3.5 uppercase tracking-widest text-[10px] md:text-xs transition-colors active:scale-[0.98]"
              data-testid={`link-browse-${designerSlug}`}
            >
              Browse on {designerName.split(" ").length > 3 ? "their site" : `${designerName}.com`}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
