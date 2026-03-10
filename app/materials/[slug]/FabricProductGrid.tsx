"use client";

import { useState, useMemo } from "react";

interface Product {
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

type SortOption = "relevance" | "price-asc" | "price-desc" | "fiber-desc";

export default function FabricProductGrid({
  products,
  fiberName,
  totalCount,
}: {
  products: Product[];
  fiberName: string;
  totalCount: number;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("relevance");

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
    } else if (sort === "fiber-desc") {
      list = [...list].sort(
        (a, b) => (b.naturalFiberPercent || 0) - (a.naturalFiberPercent || 0)
      );
    }

    return list;
  }, [products, search, sort]);

  return (
    <section className="max-w-5xl mx-auto w-full px-4 py-8 md:py-10" data-testid="section-shop-fabric">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${fiberName.toLowerCase()} products...`}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border/40 text-sm focus:outline-none focus:border-foreground/40 transition-colors placeholder:text-muted-foreground/40"
              data-testid="input-fabric-search"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="px-4 py-2.5 bg-background border border-border/40 text-[11px] uppercase tracking-[0.1em] text-foreground/70 focus:outline-none focus:border-foreground/40 transition-colors appearance-none cursor-pointer min-w-[160px]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
            data-testid="select-fabric-sort"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="fiber-desc">Natural Fiber %</option>
          </select>
        </div>
        {search.trim() && (
          <p className="text-[11px] text-muted-foreground">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {search.trim()
              ? `No ${fiberName.toLowerCase()} products matching "${search}".`
              : `No ${fiberName.toLowerCase()} products found yet.`}
          </p>
          {search.trim() && (
            <button
              onClick={() => setSearch("")}
              className="mt-3 text-xs uppercase tracking-widest border-b border-foreground pb-0.5 hover:text-muted-foreground transition-colors"
              data-testid="button-clear-search"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map((product, index) => (
              <a
                key={product.productId || product.id || index}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col"
                data-testid={`card-fabric-product-${index}`}
              >
                <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={`${product.name} by ${product.brandName}`}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    </div>
                  )}
                  {(product.naturalFiberPercent ?? 0) > 0 && (
                    <div className="absolute top-2 left-2">
                      <span
                        className={`px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm ${
                          (product.naturalFiberPercent ?? 0) >= 90
                            ? "bg-emerald-900/90 text-emerald-100"
                            : (product.naturalFiberPercent ?? 0) >= 70
                            ? "bg-emerald-800/80 text-emerald-100"
                            : "bg-amber-800/80 text-amber-100"
                        }`}
                      >
                        {product.naturalFiberPercent}% natural
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {product.brandName}
                  </span>
                  <h3 className="text-xs md:text-sm leading-snug font-medium line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {product.composition}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-sm font-medium">{product.price}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-foreground transition-colors"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
          {totalCount > filtered.length && !search.trim() && (
            <div className="text-center mt-8">
              <p className="text-xs text-muted-foreground">
                Showing {filtered.length} of {totalCount} verified pieces
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
