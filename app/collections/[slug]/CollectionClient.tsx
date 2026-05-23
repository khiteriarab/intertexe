"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { CatalogMobileToolbar, CatalogMobileSheet } from "../../components/CatalogMobileToolbar";
import Link from "next/link";
import { ProductLink } from "../../components/ProductLink";
import { formatDisplayPrice } from "../../../lib/format-display-price";
import {
  COLLECTION_PAGES,
  COLLECTION_SLUGS,
  type CollectionPageConfig,
} from "../../../lib/collection-pages";
import { EditorialHeroImage } from "../../components/EditorialHeroImage";
import { CatalogProductImage } from "../../components/CatalogProductImage";
import { WearToWhereRail } from "../../components/WearToWhereRail";
import type { CollectionSlug } from "../../../lib/collection-pages";

type Product = {
  id: string;
  productId?: string;
  name: string;
  brandName: string;
  imageUrl?: string;
  price?: string;
  composition?: string;
  naturalFiberPercent?: number;
};

type CollectionSort = "recommended" | "price_asc" | "price_desc" | "natural";

const SORT_OPTIONS: { key: CollectionSort; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "natural", label: "Highest natural fiber" },
];

const FIBER_OPTIONS = ["All", "Silk", "Cashmere", "Wool", "Linen", "Cotton"] as const;

function parsePriceNum(price: string | undefined): number {
  if (!price) return Number.POSITIVE_INFINITY;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function sortCollectionProducts(items: Product[], sort: CollectionSort): Product[] {
  const list = [...items];
  if (sort === "price_asc") {
    return list.sort((a, b) => parsePriceNum(a.price) - parsePriceNum(b.price));
  }
  if (sort === "price_desc") {
    return list.sort((a, b) => parsePriceNum(b.price) - parsePriceNum(a.price));
  }
  if (sort === "natural") {
    return list.sort(
      (a, b) => (b.naturalFiberPercent ?? 0) - (a.naturalFiberPercent ?? 0)
    );
  }
  return list;
}

export default function CollectionClient({
  config,
  products: initialProducts,
  editCount,
  catalogTotal,
  initialHasMore = true,
  heroImageUrl,
}: {
  config: CollectionPageConfig;
  products: Product[];
  editCount: number;
  catalogTotal: number;
  initialHasMore?: boolean;
  heroImageUrl: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [offset, setOffset] = useState(initialProducts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(catalogTotal > 0 ? catalogTotal : null);
  const [countLoading, setCountLoading] = useState(catalogTotal <= 0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [sortBy, setSortBy] = useState<CollectionSort>("recommended");
  const [fiberFilter, setFiberFilter] = useState<string>("All");
  const [brandFilter, setBrandFilter] = useState<string>("All");

  useEffect(() => {
    if (catalogTotal > 0) return;
    fetch(`/api/catalog?mode=collection&slug=${config.slug}&limit=1&offset=0`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.total === "number" && d.total > 0) setTotalCount(d.total);
        else if (typeof d.poolCount === "number") setTotalCount(d.poolCount);
      })
      .finally(() => setCountLoading(false));
  }, [config.slug, catalogTotal]);

  const brands = useMemo(() => {
    const names = Array.from(new Set(products.map((p) => p.brandName).filter(Boolean))).sort();
    return ["All", ...names.slice(0, 24)];
  }, [products]);

  const availableFibers = useMemo(() => {
    return FIBER_OPTIONS.filter((fiber) => {
      if (fiber === "All") return true;
      return products.some((p) =>
        (p.composition || "").toLowerCase().includes(fiber.toLowerCase())
      );
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (fiberFilter !== "All") {
      const needle = fiberFilter.toLowerCase();
      list = list.filter((p) => (p.composition || "").toLowerCase().includes(needle));
    }
    if (brandFilter !== "All") {
      list = list.filter((p) => p.brandName === brandFilter);
    }
    return sortCollectionProducts(list, sortBy);
  }, [products, fiberFilter, brandFilter, sortBy]);

  const currentSort = SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0];

  const activeFilters = [
    ...(fiberFilter !== "All"
      ? [{ id: "fiber", label: fiberFilter, onRemove: () => setFiberFilter("All") }]
      : []),
    ...(brandFilter !== "All"
      ? [{ id: "brand", label: brandFilter, onRemove: () => setBrandFilter("All") }]
      : []),
  ];

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/catalog?mode=collection&slug=${config.slug}&limit=32&offset=${offset}`
      );
      const data = await res.json();
      const next = data.products || [];
      const total = typeof data.total === "number" ? data.total : totalCount;
      if (total != null) setTotalCount(total);
      setHasMore(Boolean(data.hasMore));
      if (next.length === 0) {
        setHasMore(false);
      } else {
        setProducts((prev) => {
          const seen = new Set(prev.map((p) => p.productId || p.id));
          const merged = [...prev];
          for (const p of next) {
            const id = p.productId || p.id;
            if (!seen.has(id)) {
              seen.add(id);
              merged.push(p);
            }
          }
          return merged;
        });
        setOffset((o) => o + next.length);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [config.slug, offset, loadingMore, hasMore, totalCount]);

  return (
    <div className="flex flex-col" data-testid={`page-collection-${config.slug}`}>
      <section className="relative -mx-4 md:-mx-8 overflow-hidden">
        <EditorialHeroImage
          src={heroImageUrl}
          alt={config.title}
          variant="collection"
          slug={config.slug}
          title={config.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/10 pointer-events-none" />
        <div className="absolute inset-0 z-10 flex flex-col justify-end px-6 md:px-14 pb-12 md:pb-16 max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/55 mb-2">{config.kicker}</p>
          <h1 className="text-3xl md:text-[52px] font-serif text-white leading-[1.05] mb-3">{config.title}</h1>
          <p className="text-sm md:text-base text-white/80 leading-relaxed max-w-xl mb-2">{config.description}</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">{config.atmosphere}</p>
        </div>
      </section>

      <WearToWhereRail collectionSlug={config.slug as CollectionSlug} className="border-b border-border/30 bg-white" />

      <section className="border-b border-border/30 bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
          {COLLECTION_SLUGS.map((slug) => {
            const col = COLLECTION_PAGES[slug];
            const active = slug === config.slug;
            return (
              <Link
                key={slug}
                href={`/collections/${slug}`}
                className={`flex-shrink-0 px-4 py-2 text-[10px] uppercase tracking-[0.14em] whitespace-nowrap ${
                  active
                    ? "bg-[#111] text-white"
                    : "bg-white border border-neutral-200 text-foreground/70 hover:text-foreground"
                }`}
              >
                {col.title}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="py-8 md:py-12 px-4 md:px-8 max-w-6xl mx-auto w-full">
        <CatalogMobileToolbar
          className="mb-6"
          resultCount={fiberFilter !== "All" || brandFilter !== "All" ? filteredProducts.length : totalCount}
          countLoading={countLoading && totalCount == null}
          sortLabel={currentSort.label}
          onOpenFilter={() => setShowFilterSheet(true)}
          onOpenSort={() => setShowSortSheet(true)}
          activeFilters={activeFilters}
        />

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
            totalCount != null ? `${filteredProducts.length.toLocaleString()} shown` : undefined
          }
          footer={
            <button
              type="button"
              onClick={() => setShowFilterSheet(false)}
              className="w-full bg-foreground text-background py-3.5 text-[10px] uppercase tracking-[0.2em]"
            >
              View results
            </button>
          }
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Material</p>
          <div className="flex flex-wrap gap-2 mb-8">
            {availableFibers.map((fiber) => (
              <button
                key={fiber}
                type="button"
                onClick={() => setFiberFilter(fiber)}
                className={`px-4 py-2 text-[10px] uppercase tracking-[0.12em] border ${
                  fiberFilter === fiber
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/40"
                }`}
              >
                {fiber}
              </button>
            ))}
          </div>
          {brands.length > 1 && (
            <>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Designer</p>
              <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                {brands.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setBrandFilter(brand)}
                    className={`px-4 py-2 text-[10px] uppercase tracking-[0.12em] border ${
                      brandFilter === brand
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/40"
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </>
          )}
        </CatalogMobileSheet>

        <p className="hidden md:block text-[11px] uppercase tracking-[0.14em] text-neutral-500 mb-6" data-testid="text-collection-count">
          <span className="font-medium text-neutral-800">
            {countLoading || totalCount == null ? "—" : totalCount.toLocaleString()}
          </span>{" "}
          pieces in this collection
        </p>

        {filteredProducts.length === 0 ? (
          <p className="text-sm text-neutral-500 max-w-md leading-relaxed">
            {products.length === 0
              ? "This collection is being refreshed. Check back shortly or explore another edit above."
              : "No pieces match these filters. Clear filters to see the full collection."}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <ProductLink
                key={product.id}
                href={`/product/${product.id}`}
                className="group flex flex-col"
              >
                {product.imageUrl ? (
                  <CatalogProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    variant="collection-grid"
                    category={config.slug}
                    name={product.name}
                    className="group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="aspect-[3/4] bg-[#f5f4f2]" />
                )}
                <div className="pt-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">{product.brandName}</span>
                  <h3 className="text-[11px] md:text-[12px] leading-snug text-neutral-500 mt-px line-clamp-2">
                    {product.name}
                  </h3>
                  {product.price && (
                    <span className="text-[11px] mt-0.5 block">{formatDisplayPrice(product)}</span>
                  )}
                </div>
              </ProductLink>
            ))}
          </div>
        )}

        {hasMore && products.length > 0 && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-10 border border-neutral-800 px-8 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-neutral-800 hover:text-white transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </section>
    </div>
  );
}
