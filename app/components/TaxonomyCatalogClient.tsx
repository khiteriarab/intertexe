"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ProductLink } from "./ProductLink";
import { CatalogProductImage } from "./CatalogProductImage";
import { formatDisplayPrice } from "../../lib/format-display-price";
import { cfProductCard } from "../../lib/cloudflare-images";
import { getTaxonomyProducts } from "../shop/taxonomy-actions";
import { getShopBrands } from "../shop/actions";
import type { Product } from "../../lib/supabase-server";
import type { TaxonomyDepartment } from "../../lib/catalog-taxonomy";
import { taxonomyPathSegment } from "../../lib/catalog-taxonomy";
import {
  SHOP_APPAREL_FIBER_OPTIONS,
  SHOP_COLOR_OPTIONS,
  SHOP_PRICE_TIERS,
  priceBoundsFromTier,
  type ShopPriceTierId,
} from "../../lib/catalog-filter-options";
import { CatalogMobileToolbar, CatalogMobileSheet } from "./CatalogMobileToolbar";
import { CatalogFilterSidebar } from "./CatalogFilterSidebar";

const PAGE_SIZE = 24;

type SortOption = "new" | "price-low" | "price-high" | "natural-high";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "new", label: "New In" },
  { key: "price-low", label: "Price: Low to High" },
  { key: "price-high", label: "Price: High to Low" },
  { key: "natural-high", label: "Highest Natural Fiber %" },
];

type RefinementState = {
  fiber?: string;
  color?: string;
  brand?: string;
  sort: SortOption;
  priceTier: ShopPriceTierId;
};

function refinementCount(r: RefinementState, department: TaxonomyDepartment): number {
  let n = 0;
  if (department === "clothing" && r.fiber && r.fiber !== "all") n++;
  if (r.color) n++;
  if (r.brand) n++;
  if (r.priceTier !== "any") n++;
  return n;
}

function ProductCard({ product, eager }: { product: Product; eager?: boolean }) {
  const src = cfProductCard(product.imageUrl) || product.imageUrl || "";
  const priceShown = formatDisplayPrice({
    price: product.price,
    originalPrice: product.originalPrice,
    listingRegion: product.listingRegion,
    productId: product.productId || product.id,
  });

  return (
    <div className="group relative flex flex-col" data-testid={`taxonomy-card-${product.id}`}>
      <ProductLink href={`/product/${product.id}`} className="flex flex-col cursor-pointer">
        {src ? (
          <CatalogProductImage src={src} alt={product.name} category="" name={product.name} eager={eager} />
        ) : (
          <div className="aspect-[3/4] bg-[#f5f5f3]" />
        )}
        <div className="flex flex-col gap-1 pt-3">
          <span className="text-[10px] md:text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {product.brandName}
          </span>
          <h3 className="text-[12px] md:text-[13px] leading-snug truncate">{product.name}</h3>
          {priceShown ? <span className="text-[12px] font-medium mt-0.5">{priceShown}</span> : null}
        </div>
      </ProductLink>
    </div>
  );
}

export function TaxonomyCatalogClient({
  department,
  taxonomySlug,
  categoryLabel,
  initialProducts,
  initialTotal,
  initialHasMore,
  totalStatus,
}: {
  department: TaxonomyDepartment;
  taxonomySlug: string;
  categoryLabel: string;
  initialProducts: Product[];
  initialTotal: number;
  initialHasMore: boolean;
  totalStatus: "exact" | "unavailable";
}) {
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(initialProducts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refinements, setRefinements] = useState<RefinementState>({ sort: "new", priceTier: "any" });
  const [draftRefinements, setDraftRefinements] = useState<RefinementState>({ sort: "new", priceTier: "any" });
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [shopBrands, setShopBrands] = useState<{ slug: string; name: string; count: number }[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const seg = taxonomyPathSegment(taxonomySlug);
  const backHref = `/shop/${department}`;
  const filterActive = refinementCount(refinements, department);
  const sortLabel = SORT_OPTIONS.find((o) => o.key === refinements.sort)?.label ?? "New In";

  const fiberOptions = useMemo(
    () => [{ key: "all" as const, label: "All fibers" }, ...SHOP_APPAREL_FIBER_OPTIONS.map((f) => ({ key: f.key, label: f.label }))],
    []
  );

  useEffect(() => {
    getShopBrands()
      .then((brands) => setShopBrands(brands.map((b) => ({ slug: b.slug, name: b.name, count: b.count }))))
      .catch(() => {});
  }, []);

  const queryParams = useCallback(
    (state: RefinementState) => {
      const bounds = priceBoundsFromTier(state.priceTier);
      return {
        department,
        taxonomySlug,
        fiber: department === "clothing" && state.fiber && state.fiber !== "all" ? state.fiber : undefined,
        color: state.color,
        brand: state.brand,
        sort: state.sort,
        minPrice: bounds.minPrice,
        maxPrice: bounds.maxPrice,
      };
    },
    [department, taxonomySlug]
  );

  const reload = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const res = await getTaxonomyProducts({
        ...queryParams(refinements),
        limit: PAGE_SIZE,
        offset: 0,
      });
      setProducts(res.products);
      setTotal(res.total);
      setHasMore(res.hasMore);
      setOffset(res.products.length);
    } finally {
      setLoadingFilters(false);
    }
  }, [queryParams, refinements]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoadingMore(true);
          getTaxonomyProducts({ ...queryParams(refinements), limit: PAGE_SIZE, offset })
            .then((res) => {
              setProducts((prev) => [...prev, ...res.products]);
              setHasMore(res.hasMore);
              setOffset((o) => o + res.products.length);
              if (res.totalStatus === "exact") setTotal(res.total);
            })
            .finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [queryParams, refinements, offset, hasMore, loadingMore]);

  const countLabel =
    totalStatus === "exact" && total > 0 && (!hasMore || total <= products.length * 50)
      ? `${(!hasMore ? products.length : total).toLocaleString()} pieces`
      : products.length > 0
        ? `${products.length.toLocaleString()}${hasMore ? "+" : ""} pieces`
        : "No pieces";

  const activeFilters = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = [];
    if (department === "clothing" && refinements.fiber && refinements.fiber !== "all") {
      chips.push({
        id: "fiber",
        label: refinements.fiber,
        onRemove: () => setRefinements((r) => ({ ...r, fiber: undefined })),
      });
    }
    if (refinements.color) {
      chips.push({
        id: "color",
        label: refinements.color,
        onRemove: () => setRefinements((r) => ({ ...r, color: undefined })),
      });
    }
    if (refinements.brand) {
      const name = shopBrands.find((b) => b.slug === refinements.brand)?.name ?? refinements.brand;
      chips.push({
        id: "brand",
        label: name,
        onRemove: () => setRefinements((r) => ({ ...r, brand: undefined })),
      });
    }
    if (refinements.priceTier !== "any") {
      const label = SHOP_PRICE_TIERS.find((t) => t.id === refinements.priceTier)?.label ?? refinements.priceTier;
      chips.push({
        id: "price",
        label: label,
        onRemove: () => setRefinements((r) => ({ ...r, priceTier: "any" })),
      });
    }
    return chips;
  }, [department, refinements, shopBrands]);

  const openFilter = () => {
    setDraftRefinements(refinements);
    setShowFilterSheet(true);
  };

  const clearAllFilters = () => {
    const sort = refinements.sort;
    setRefinements({ sort, priceTier: "any" });
    setDraftRefinements({ sort, priceTier: "any" });
    setShowFilterSheet(false);
  };

  const applyFilters = () => {
    setRefinements(draftRefinements);
    setShowFilterSheet(false);
  };

  return (
    <div className="min-h-screen bg-background pb-28" data-testid={`taxonomy-grid-${seg}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-6">
          <Link href={backHref} className="hover:text-foreground">
            {department === "clothing" ? "Clothing" : "Shoes"}
          </Link>
          <span>/</span>
          <span className="text-foreground">{categoryLabel}</span>
        </div>

        <header className="text-center mb-8">
          <h1 className="text-[28px] md:text-[36px] font-serif tracking-tight uppercase">{categoryLabel}</h1>
          <p className="mt-2 text-[12px] text-muted-foreground">
            {department === "shoes" ? "Natural leather, suede & nubuck" : "Natural-fiber apparel"}
            {totalStatus === "exact" ? ` · ${countLabel}` : null}
          </p>
        </header>

        <div className="flex gap-10">
          <aside className="hidden lg:block w-56 shrink-0">
            <CatalogFilterSidebar
              resultCount={totalStatus === "exact" ? total : null}
              isLoading={loadingFilters}
              fiberTab={(refinements.fiber as "all" | "silk") ?? "all"}
              categoryFilter="all"
              fiberOptions={department === "clothing" ? fiberOptions : [{ key: "all", label: "All" }]}
              categoryOptions={[{ key: "all", label: "All" }]}
              onFiberChange={(key) =>
                setRefinements((r) => ({ ...r, fiber: key === "all" ? undefined : key }))
              }
              onCategoryChange={() => {}}
              colorOptions={SHOP_COLOR_OPTIONS.map((c) => ({ label: c.label, value: c.value }))}
              selectedColor={refinements.color ?? null}
              onColorChange={(color) => setRefinements((r) => ({ ...r, color: color ?? undefined }))}
              priceTierOptions={SHOP_PRICE_TIERS.map((t) => ({ id: t.id, label: t.label }))}
              selectedPriceTier={refinements.priceTier}
              onPriceTierChange={(tier) => setRefinements((r) => ({ ...r, priceTier: tier as ShopPriceTierId }))}
              designers={shopBrands}
              selectedDesigners={refinements.brand ? [refinements.brand] : []}
              onDesignersChange={(slugs) => setRefinements((r) => ({ ...r, brand: slugs[0] }))}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <CatalogMobileToolbar
              resultCount={totalStatus === "exact" ? total : null}
              countLoading={loadingFilters}
              sortLabel={sortLabel}
              onOpenFilter={openFilter}
              onOpenSort={() => setShowSortSheet(true)}
              activeFilters={activeFilters}
            />

            <div className="hidden lg:flex items-center justify-end border-b border-border/25 py-3 mb-6">
              <button
                type="button"
                onClick={() => setShowSortSheet(true)}
                className="flex items-center gap-1 text-[11px] uppercase tracking-[0.1em]"
              >
                Sort: {sortLabel}
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {loadingFilters && products.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Loading…</p>
            ) : products.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">No products match this category yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">
                {products.map((p, i) => (
                  <ProductCard key={p.id} product={p} eager={i < 4} />
                ))}
              </div>
            )}

            <div ref={sentinelRef} className="h-8" />
            {loadingMore ? (
              <p className="text-center text-[11px] text-muted-foreground py-4">Loading more…</p>
            ) : null}
          </div>
        </div>
      </div>

      <CatalogMobileSheet
        open={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter"
        subtitle={categoryLabel}
        footer={
          <div className="flex flex-col gap-2">
            {filterActive > 0 ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="w-full py-3 text-[11px] uppercase tracking-[0.16em] border border-border text-foreground"
                data-testid="btn-taxonomy-clear-all"
              >
                Clear all
              </button>
            ) : null}
            <button
              type="button"
              onClick={applyFilters}
              className="w-full py-3 text-[11px] uppercase tracking-[0.16em] bg-foreground text-background"
            >
              View results
            </button>
          </div>
        }
      >
        <CatalogFilterSidebar
          resultCount={null}
          fiberTab={(draftRefinements.fiber as "all" | "silk") ?? "all"}
          categoryFilter="all"
          fiberOptions={department === "clothing" ? fiberOptions : [{ key: "all", label: "All" }]}
          categoryOptions={[{ key: "all", label: "All" }]}
          onFiberChange={(key) =>
            setDraftRefinements((r) => ({ ...r, fiber: key === "all" ? undefined : key }))
          }
          onCategoryChange={() => {}}
          colorOptions={SHOP_COLOR_OPTIONS.map((c) => ({ label: c.label, value: c.value }))}
          selectedColor={draftRefinements.color ?? null}
          onColorChange={(color) => setDraftRefinements((r) => ({ ...r, color: color ?? undefined }))}
          priceTierOptions={SHOP_PRICE_TIERS.map((t) => ({ id: t.id, label: t.label }))}
          selectedPriceTier={draftRefinements.priceTier}
          onPriceTierChange={(tier) =>
            setDraftRefinements((r) => ({ ...r, priceTier: tier as ShopPriceTierId }))
          }
          designers={shopBrands}
          selectedDesigners={draftRefinements.brand ? [draftRefinements.brand] : []}
          onDesignersChange={(slugs) => setDraftRefinements((r) => ({ ...r, brand: slugs[0] }))}
        />
      </CatalogMobileSheet>

      <CatalogMobileSheet
        open={showSortSheet}
        onClose={() => setShowSortSheet(false)}
        title="Sort"
      >
        <ul className="space-y-1">
          {SORT_OPTIONS.map((opt) => (
            <li key={opt.key}>
              <button
                type="button"
                onClick={() => {
                  setRefinements((r) => ({ ...r, sort: opt.key }));
                  setShowSortSheet(false);
                }}
                className={`w-full text-left py-3 text-[13px] ${
                  refinements.sort === opt.key ? "font-medium" : "text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </CatalogMobileSheet>
    </div>
  );
}
