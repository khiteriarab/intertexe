"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

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

type SortOption = "relevance" | "price-asc" | "price-desc";

export default function FabricProductGrid({
  products,
  fiberName,
  totalCount,
}: {
  products: Product[];
  fiberName: string;
  totalCount: number;
}) {
  const [sort, setSort] = useState<SortOption>("relevance");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-[11px] uppercase tracking-[0.2em] text-foreground/40">{filtered.length} pieces</span>
          {searchOpen ? (
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                autoFocus
                onBlur={() => { if (!search.trim()) setSearchOpen(false); }}
                className="w-48 bg-transparent border-b border-foreground/20 text-sm py-1 focus:outline-none focus:border-foreground/50 transition-colors placeholder:text-foreground/25"
                data-testid="input-fabric-search"
              />
              {search.trim() && (
                <button
                  onClick={() => { setSearch(""); setSearchOpen(false); }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
                  data-testid="button-clear-search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="text-foreground/30 hover:text-foreground/60 transition-colors"
              data-testid="button-open-search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(["relevance", "price-asc", "price-desc"] as SortOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setSort(opt)}
              className={`text-[10px] uppercase tracking-[0.15em] px-2.5 py-1.5 transition-colors ${
                sort === opt ? "text-foreground" : "text-foreground/30 hover:text-foreground/60"
              }`}
              data-testid={`sort-${opt}`}
            >
              {opt === "relevance" ? "Curated" : opt === "price-asc" ? "Price ↑" : "Price ↓"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-foreground/40 text-sm">
            {search.trim()
              ? `No results for "${search}"`
              : `No ${fiberName.toLowerCase()} products found.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-5 md:gap-y-10">
          {filtered.map((product, index) => (
            <Link
              key={product.productId || product.id || index}
              href={`/product/${product.id || product.productId}`}
              className="group flex flex-col"
              data-testid={`card-fabric-product-${index}`}
            >
              <div className="aspect-[3/4] bg-[#f5f5f3] relative overflow-hidden mb-3">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={`${product.name} by ${product.brandName}`}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-foreground/10 text-xs uppercase tracking-widest">No image</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/40">
                  {product.brandName}
                </span>
                <h3 className="text-[13px] leading-snug text-foreground/80 group-hover:text-foreground transition-colors line-clamp-2">
                  {product.name}
                </h3>
                <span className="text-[13px] text-foreground mt-0.5">{product.price}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
