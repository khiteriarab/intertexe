"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useProductFavorites } from "../../hooks/use-product-favorites";

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
}: {
  products: ProductItem[];
  designerName: string;
  designerSlug: string;
  designerWebsite: string | null;
  hasProfile: boolean;
  profileMaterialStrengths: string[];
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const [priceSort, setPriceSort] = useState<PriceSort>("default");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const { favorites, toggle: toggleProductFav } = useProductFavorites();

  const visibleProducts = useMemo(() => {
    return products.filter((p) => p.imageUrl);
  }, [products]);

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

  const filteredProducts = useMemo(() => {
    let filtered = visibleProducts;
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
    if (priceSort !== "default") {
      filtered = [...filtered].sort((a, b) => {
        const pa = parsePrice(a.price);
        const pb = parsePrice(b.price);
        return priceSort === "price-low" ? pa - pb : pb - pa;
      });
    }
    return filtered;
  }, [visibleProducts, activeCategory, searchQuery, priceSort]);

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const hasMore = filteredProducts.length > visibleCount;

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
      <div className="flex items-center gap-3">
        <h2 className="text-xs uppercase tracking-[0.2em] font-medium">
          {visibleProducts.length > 0 ? `${visibleProducts.length} Verified Pieces` : `Browse ${designerName}`}
        </h2>
      </div>

      {visibleProducts.length > 0 ? (
        <>
          <p className="text-sm text-foreground/70 leading-relaxed">
            Every item below has been verified by INTERTEXE — only pieces with ≥50% natural fiber composition make this list.
          </p>

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
                    onClick={() => handleCategoryChange("all")}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      activeCategory === "all"
                        ? "bg-foreground text-background"
                        : "bg-secondary/60 text-foreground/70 hover:bg-secondary"
                    }`}
                    data-testid="filter-category-all"
                  >
                    All ({visibleProducts.length})
                  </button>
                  {categories.map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => handleCategoryChange(key)}
                      className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                        activeCategory === key
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
                    className="group bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col"
                    data-testid={`card-product-${product.productId || product.id}`}
                  >
                    <a href={product.url} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
                            {product.naturalFiberPercent}% natural
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleProductFav(String(product.id)); }}
                          className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
                          data-testid={`btn-fav-${product.id}`}
                          aria-label={favorites.has(String(product.id)) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart className={`w-3.5 h-3.5 ${favorites.has(String(product.id)) ? "fill-red-500 text-red-500" : "text-foreground/70"}`} />
                        </button>
                      </div>
                    </a>
                    <div className="p-3 flex flex-col gap-1.5 flex-1">
                      <h3 className="text-xs md:text-sm leading-snug line-clamp-2 font-medium">{product.name}</h3>
                      <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1">{product.composition}</p>
                      {product.price && (
                        <p className="text-xs font-medium mt-auto pt-1">{product.price}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((prev) => prev + PRODUCTS_PER_PAGE)}
                  className="w-full border border-foreground/20 hover:border-foreground/40 text-foreground py-3.5 uppercase tracking-widest text-[10px] md:text-xs transition-colors active:scale-[0.98]"
                  data-testid="button-load-more-products"
                >
                  Load More ({filteredProducts.length - visibleCount} remaining)
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
