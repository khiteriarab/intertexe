"use client";

import { useState, useMemo, useCallback } from "react";
import { ProductLink } from "../../components/ProductLink";
import { formatDisplayPrice, type DisplayPriceProduct } from "../../../lib/format-display-price";
import { CATALOG_PAGE_SIZE } from "../../../lib/catalog-rules";

interface Product extends DisplayPriceProduct {
  productId?: string;
  id?: string;
  name: string;
  brandName: string;
  brandSlug?: string;
  composition?: string;
  price?: string;
  imageUrl?: string;
  url?: string;
  naturalFiberPercent?: number;
}

function parsePrice(p: string | undefined): number {
  if (!p) return Infinity;
  const match = p.replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : Infinity;
}

type SortOption = "relevance" | "price-asc" | "price-desc";

export default function FabricProductGrid({
  products: initialProducts,
  fiberName,
  totalCount,
  catalogFiber,
  catalogCategory,
}: {
  products: Product[];
  fiberName: string;
  totalCount: number;
  catalogFiber?: string;
  catalogCategory?: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [offset, setOffset] = useState(initialProducts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(
    catalogFiber ? initialProducts.length >= Math.min(32, CATALOG_PAGE_SIZE) : false
  );

  const [sort, setSort] = useState<SortOption>("relevance");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const loadMore = useCallback(async () => {
    if (!catalogFiber || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({
      mode: "materials",
      fiber: catalogFiber,
      limit: String(CATALOG_PAGE_SIZE),
      offset: String(offset),
    });
    if (catalogCategory) params.set("category", catalogCategory);
    try {
      const res = await fetch(`/api/catalog?${params}`);
      const data = await res.json();
      const next = (data.products || []) as Product[];
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.productId || p.id));
        return [...prev, ...next.filter((p) => !seen.has(p.productId || p.id))];
      });
      setOffset((o) => o + next.length);
      setHasMore(Boolean(data.hasMore) && next.length > 0);
    } finally {
      setLoadingMore(false);
    }
  }, [catalogFiber, catalogCategory, offset, loadingMore, hasMore]);

  const filtered = useMemo(() => {
    let list = products;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.brandName?.toLowerCase().includes(q) ||
          p.composition?.toLowerCase().includes(q)
      );
    }

    if (sort === "price-asc") {
      list = [...list].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sort === "price-desc") {
      list = [...list].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }

    return list;
  }, [products, search, sort]);

  return (
    <section className="w-full" data-testid="section-shop-fabric">
      <div className="flex items-center justify-between pb-5 border-b border-foreground/[0.06] mb-8">
        <div className="flex items-center gap-5">
          <span className="text-[11px] tracking-[0.15em] text-foreground/35 uppercase">{filtered.length} pieces</span>
          {searchOpen ? (
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                autoFocus
                onBlur={() => { if (!search.trim()) setSearchOpen(false); }}
                className="w-48 bg-transparent border-b border-foreground/20 text-[13px] py-1 focus:outline-none focus:border-foreground/40 transition-colors placeholder:text-foreground/20"
                data-testid="input-fabric-search"
              />
              {search.trim() && (
                <button
                  onClick={() => { setSearch(""); setSearchOpen(false); }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-foreground/25 hover:text-foreground/50"
                  data-testid="button-clear-search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="text-foreground/25 hover:text-foreground/50 transition-colors"
              data-testid="button-open-search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {(["relevance", "price-asc", "price-desc"] as SortOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setSort(opt)}
              className={`text-[10px] uppercase tracking-[0.12em] px-3 py-1 transition-all duration-200 ${
                sort === opt
                  ? "text-foreground"
                  : "text-foreground/25 hover:text-foreground/50"
              }`}
              data-testid={`sort-${opt}`}
            >
              {opt === "relevance" ? "Curated" : opt === "price-asc" ? "Price ↑" : "Price ↓"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-foreground/30 text-[13px] tracking-wide">
            {search.trim()
              ? `No results for "${search}"`
              : `No ${fiberName.toLowerCase()} products found.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-5 md:gap-y-12">
          {filtered.map((product, index) => (
            <ProductLink
              key={product.productId || product.id || index}
              href={`/product/${product.id || product.productId}`}
              className="group flex flex-col"
              data-testid={`card-fabric-product-${index}`}
            >
              <div className="aspect-[3/4] bg-[#f3f3f1] relative overflow-hidden mb-3 md:mb-4">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={`${product.name} by ${product.brandName}`}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[800ms] ease-out"
                    loading={index < 8 ? "eager" : "lazy"}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-foreground/8 text-[10px] uppercase tracking-[0.3em]">No image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition-colors duration-500" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-foreground/35 font-light">
                  {product.brandName}
                </span>
                <h3 className="text-[12px] md:text-[13px] leading-[1.4] text-foreground/70 group-hover:text-foreground transition-colors duration-300 line-clamp-2 font-light">
                  {product.name}
                </h3>
                <span className="text-[12px] md:text-[13px] text-foreground/90 mt-1 tracking-wide">{formatDisplayPrice(product)}</span>
              </div>
            </ProductLink>
          ))}
        </div>
      )}

      {hasMore && catalogFiber && filtered.length > 0 && (
        <div className="flex justify-center pt-8">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="border border-foreground/20 px-10 py-3 text-[10px] uppercase tracking-[0.2em] text-foreground/60 hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40"
            data-testid="btn-load-more-materials"
          >
            {loadingMore ? "Loading…" : "Load More"}
          </button>
        </div>
      )}
    </section>
  );
}
