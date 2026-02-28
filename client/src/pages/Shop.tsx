import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { ExternalLink, ShoppingBag, ArrowRight, ChevronRight, Heart, ChevronDown } from "lucide-react";
import { trackAffiliateRedirect } from "@/lib/analytics";
import { useQuery } from "@tanstack/react-query";
import { useSEO } from "@/hooks/use-seo";
import { fetchShopProducts, fetchFiberCounts, fetchProductCount } from "@/lib/supabase";
import { useProductFavorites } from "@/hooks/use-product-favorites";

type FiberTab = "all" | "cashmere" | "silk" | "wool" | "cotton" | "linen";
type CategoryFilter = "all" | "knitwear" | "tops" | "dresses" | "bottoms" | "outerwear";
type SortOption = "recommended" | "new" | "price-high" | "price-low";

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
  { key: "bottoms", label: "Bottoms" },
  { key: "outerwear", label: "Outerwear" },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "new", label: "New In" },
  { key: "price-high", label: "Price High to Low" },
  { key: "price-low", label: "Price Low to High" },
];

function ProductCard({ product }: { product: any }) {
  const { toggle, isFavorited } = useProductFavorites();
  const productId = String(product.id);
  const saved = isFavorited(productId);

  const shopUrl = product.url || null;

  const name = product.name || product.productName || "";
  const brandName = product.brand_name || product.brandName || "";
  const imageUrl = product.image_url || product.imageUrl;
  const price = product.price;
  const composition = product.composition;
  const fiberPercent = product.natural_fiber_percent || product.naturalFiberPercent;

  const CardWrapper = shopUrl ? 'a' : 'div';
  const handleClick = shopUrl ? () => { trackAffiliateRedirect(brandName, shopUrl); } : undefined;
  const wrapperProps = shopUrl ? { href: shopUrl, target: "_blank" as const, rel: "noopener noreferrer", onClick: handleClick } : {};

  return (
    <CardWrapper {...wrapperProps} className="group flex flex-col cursor-pointer relative" data-testid={`product-card-${product.id}`}>
      {imageUrl ? (
        <div className="aspect-[3/4] bg-[#f5f5f5] relative overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            loading="lazy"
          />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId, brandName, price); }}
            className="absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            data-testid={`btn-favorite-${product.id}`}
            aria-label={saved ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart className={`w-4.5 h-4.5 drop-shadow-sm transition-colors ${saved ? "fill-red-500 text-red-500 opacity-100" : "text-white hover:text-white/80"}`} style={saved ? { opacity: 1 } : {}} />
          </button>
          {saved && (
            <div className="absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center group-hover:opacity-0 transition-opacity">
              <Heart className="w-4.5 h-4.5 fill-red-500 text-red-500" />
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[3/4] bg-[#f5f5f5] flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-neutral-300" />
        </div>
      )}
      <div className="flex flex-col gap-1 pt-3 pb-1">
        <span className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.08em] text-foreground" data-testid={`text-brand-${product.id}`}>{brandName}</span>
        <h3 className="text-[12px] md:text-[13px] leading-snug line-clamp-2 text-muted-foreground" data-testid={`text-product-name-${product.id}`}>{name}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {price && <span className="text-[12px] md:text-[13px]" data-testid={`text-price-${product.id}`}>{price}</span>}
        </div>
        {fiberPercent != null && fiberPercent >= 90 && (
          <span className="text-[9px] uppercase tracking-wider text-emerald-700 mt-0.5">{fiberPercent}% Natural Fiber</span>
        )}
      </div>
    </CardWrapper>
  );
}

function FiberHighlight({ fiber, count, onClick }: { fiber: string; count: number; onClick: () => void }) {
  const fiberImages: Record<string, string> = {
    cashmere: "https://cdn.shopify.com/s/files/1/0150/1528/files/AB_JACKSON_CARDIGAN_-_MEDIUM_HEATHER_GREY_A-09-10222-MHG1_0040.jpg?v=1753111950",
    silk: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1319612/PLUTO_DOT/1319612.1.PLUTO_DOT?_s=RAABAB0",
    wool: "https://cdn.shopify.com/s/files/1/1519/7996/files/MARGO-DRESS_BLACK_18121533-200_GHOST_jpg.jpg?v=1757970225",
    cotton: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1319334/PRESPA/1319334.1.PRESPA?_s=RAABAB0",
    linen: "https://us.sandro-paris.com/dw/image/v2/BCMW_PRD/on/demandware.static/-/Sites-master-catalog/default/dwd3c61fa4/images/hi-res/Sandro_SFPRO04783-4111_F_1.jpg?sw=800",
  };

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden aspect-[3/2] md:aspect-[4/3] bg-[#f5f5f5] flex items-end active:scale-[0.98] transition-transform"
      data-testid={`fiber-card-${fiber}`}
    >
      <img
        src={fiberImages[fiber] || ""}
        alt={fiber}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="relative z-10 p-3 md:p-4 flex flex-col gap-0.5 w-full">
        <span className="font-serif text-base md:text-lg text-white capitalize">{fiber}</span>
        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/70">{count} verified pieces</span>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
      </div>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-5 md:gap-y-10">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse flex flex-col">
          <div className="aspect-[3/4] bg-[#f0f0ee]" />
          <div className="pt-3 flex flex-col gap-2">
            <div className="h-3 bg-[#f0f0ee] w-1/3" />
            <div className="h-3 bg-[#f0f0ee] w-3/4" />
            <div className="h-3 bg-[#f0f0ee] w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Shop() {
  const [fiberTab, setFiberTab] = useState<FiberTab>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);

  useSEO({
    title: "Shop Verified Products | INTERTEXE",
    description: "Browse 17,000+ women's clothing products verified for natural fiber quality. Shop cashmere, silk, wool, cotton, and linen from 60+ vetted brands.",
  });

  const { data: totalProductCount = 0 } = useQuery({
    queryKey: ["total-product-count"],
    queryFn: fetchProductCount,
    staleTime: 30 * 60 * 1000,
  });

  const { data: fiberCounts = {} } = useQuery({
    queryKey: ["fiber-counts"],
    queryFn: fetchFiberCounts,
    staleTime: 30 * 60 * 1000,
  });

  const { data: shopData, isLoading, isFetching } = useQuery({
    queryKey: ["shop-products", fiberTab, categoryFilter, sortBy, visibleCount],
    queryFn: () => fetchShopProducts({
      fiber: fiberTab,
      category: categoryFilter,
      sort: sortBy,
      limit: visibleCount,
      offset: 0,
    }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const products = shopData?.products || [];
  const resultTotal = shopData?.total || 0;

  const displayCount = fiberTab === "all" && categoryFilter === "all"
    ? (totalProductCount > 0 ? totalProductCount : 17000)
    : resultTotal;

  const showHighlights = fiberTab === "all" && categoryFilter === "all";
  const currentSort = SORT_OPTIONS.find(s => s.key === sortBy)!;

  return (
    <div className="min-h-screen pb-24 md:pb-16">
      <div className="py-6 md:py-10 flex flex-col gap-6 md:gap-10">
        <header className="flex flex-col gap-2 md:gap-3">
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground" data-testid="text-shop-label">
            Verified Products
          </span>
          <h1 className="text-2xl md:text-5xl font-serif" data-testid="text-shop-title">
            Shop by Material
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed">
            {displayCount > 0 ? displayCount.toLocaleString() : '17,000'}+ products, every one checked for natural fiber content.
          </p>
        </header>

        {showHighlights && Object.keys(fiberCounts).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 -mx-1 md:mx-0">
            {(["cashmere", "silk", "wool", "cotton", "linen"] as const).map(fiber => (
              <FiberHighlight
                key={fiber}
                fiber={fiber}
                count={fiberCounts[fiber] || 0}
                onClick={() => { setFiberTab(fiber); setCategoryFilter("all"); setVisibleCount(60); }}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {FIBER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setFiberTab(tab.key); setCategoryFilter("all"); setVisibleCount(60); }}
                className={`px-3.5 md:px-5 py-2.5 text-[10px] md:text-xs uppercase tracking-[0.15em] whitespace-nowrap transition-colors flex-shrink-0 min-h-[40px] ${
                  fiberTab === tab.key
                    ? "bg-foreground text-background font-medium"
                    : "bg-secondary/60 text-foreground/70 hover:bg-secondary active:bg-secondary"
                }`}
                data-testid={`tab-fiber-${tab.key}`}
              >
                {tab.label}
                {tab.key !== "all" && fiberCounts[tab.key] ? (
                  <span className="ml-1.5 opacity-60">{fiberCounts[tab.key]}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat.key}
                onClick={() => { setCategoryFilter(cat.key); setVisibleCount(60); }}
                className={`px-3 py-2 text-[10px] uppercase tracking-[0.1em] whitespace-nowrap border transition-colors flex-shrink-0 min-h-[36px] ${
                  categoryFilter === cat.key
                    ? "border-foreground text-foreground font-medium"
                    : "border-border/40 text-muted-foreground hover:border-foreground/40"
                }`}
                data-testid={`tab-category-${cat.key}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border/30 pb-3">
          <p className="text-xs md:text-sm text-muted-foreground" data-testid="text-result-count">
            {isLoading ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              <>
                <span className="font-medium text-foreground">{resultTotal.toLocaleString()}</span> Results
              </>
            )}
          </p>
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="btn-sort"
            >
              {currentSort.label}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border/60 shadow-lg min-w-[180px]">
                  {SORT_OPTIONS.map(option => (
                    <button
                      key={option.key}
                      onClick={() => { setSortBy(option.key); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs md:text-sm transition-colors ${
                        sortBy === option.key
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

        {fiberTab !== "all" && (
          <div className="flex items-center justify-end -mt-4">
            <Link
              href={`/materials/${fiberTab}`}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`link-material-guide-${fiberTab}`}
            >
              {fiberTab} buying guide <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {isLoading && !products.length ? (
          <LoadingSkeleton />
        ) : products.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center gap-3">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/20" />
            <p className="text-muted-foreground text-sm">No products match this combination yet.</p>
            <button
              onClick={() => { setFiberTab("all"); setCategoryFilter("all"); }}
              className="text-xs uppercase tracking-[0.15em] border-b border-foreground pb-0.5"
              data-testid="button-reset-filters"
            >
              View all products
            </button>
          </div>
        ) : (
          <>
            {isFetching && products.length > 0 && (
              <div className="flex justify-center">
                <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground animate-spin" />
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-5 md:gap-y-10">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {resultTotal > visibleCount && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setVisibleCount(prev => prev + 60)}
                  className="px-8 py-3 border border-foreground text-foreground text-xs uppercase tracking-[0.2em] hover:bg-foreground hover:text-background transition-colors"
                  data-testid="btn-load-more"
                >
                  View More ({(resultTotal - visibleCount).toLocaleString()} remaining)
                </button>
              </div>
            )}
          </>
        )}

        <div className="border-t border-border/30 pt-8 md:pt-10 flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Explore by Material</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {[
              { href: "/materials/cashmere-sweaters", label: "Cashmere Sweaters" },
              { href: "/materials/silk-tops", label: "Silk Tops" },
              { href: "/materials/linen-dresses", label: "Linen Dresses" },
              { href: "/materials/cotton", label: "Cotton Guide" },
              { href: "/materials/wool", label: "Wool Guide" },
              { href: "/materials", label: "All Materials" },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between px-4 py-3.5 border border-border/30 hover:border-foreground/30 active:bg-secondary/50 transition-colors"
                data-testid={`link-explore-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="text-xs md:text-sm">{link.label}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
