"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { CatalogMobileToolbar, CatalogMobileSheet } from "../../components/CatalogMobileToolbar";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { ProductLink } from "../../components/ProductLink";
import { formatDisplayPrice } from "../../../lib/format-display-price";
import {
  COLLECTION_PAGES,
  COLLECTION_SLUGS,
  type CollectionPageConfig,
  type CollectionSlug,
} from "../../../lib/collection-pages";
import { EditorialHeroImage } from "../../components/EditorialHeroImage";
import { CatalogProductImage } from "../../components/CatalogProductImage";
import { WearToWhereRail } from "../../components/WearToWhereRail";
import { CatalogFilterSidebar } from "../../components/CatalogFilterSidebar";
import { DesignerSearchFilter } from "../../components/DesignerSearchFilter";
import { getShopBrands } from "../../shop/actions";
import {
  collectionMoodLabels,
  filterProductsByCollectionMood,
} from "../../../lib/collection-moods";
import { filterProductsByFiberSubtypes, fiberSubtypesFor } from "../../../lib/fiber-subtypes";
import { wearToWhereEditorialCards } from "../../../lib/wear-to-where";
import type { Product as CatalogProduct } from "../../../lib/supabase-server";

type Product = {
  id: string;
  productId?: string;
  name: string;
  brandName: string;
  brandSlug?: string;
  imageUrl?: string;
  price?: string;
  composition?: string;
  naturalFiberPercent?: number;
  category?: string;
  fiberSubtypeLabel?: string | null;
};

type CollectionSort = "recommended" | "price_asc" | "price_desc" | "natural";
type FiberTab = "all" | "silk" | "linen" | "cashmere" | "cotton" | "wool";

const SORT_OPTIONS: { key: CollectionSort; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "natural", label: "Highest natural fiber" },
];

const FIBER_TABS: { key: FiberTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "silk", label: "Silk" },
  { key: "linen", label: "Linen" },
  { key: "cashmere", label: "Cashmere" },
  { key: "cotton", label: "Cotton" },
  { key: "wool", label: "Wool" },
];

const CATEGORY_OPTIONS = [
  { key: "all", label: "All" },
  { key: "dresses", label: "Dresses" },
  { key: "tops", label: "Tops" },
  { key: "knitwear", label: "Knitwear" },
  { key: "bottoms", label: "Bottoms" },
  { key: "outerwear", label: "Outerwear" },
  { key: "skirts", label: "Skirts" },
] as const;

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

function toCatalogProduct(p: Product): CatalogProduct {
  return {
    id: p.id,
    brandSlug: p.brandSlug || "",
    brandName: p.brandName,
    name: p.name,
    productId: p.productId || p.id,
    url: "",
    imageUrl: p.imageUrl || "",
    price: p.price || "",
    composition: p.composition || "",
    naturalFiberPercent: p.naturalFiberPercent ?? 0,
    category: p.category || "",
    fiberSubtypeLabel: p.fiberSubtypeLabel,
  };
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
  const collectionSlug = config.slug as CollectionSlug;
  const moodLabels = collectionMoodLabels(collectionSlug);

  const [products, setProducts] = useState(initialProducts);
  const [offset, setOffset] = useState(initialProducts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(catalogTotal > 0 ? catalogTotal : null);
  const [countLoading, setCountLoading] = useState(catalogTotal <= 0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [sortBy, setSortBy] = useState<CollectionSort>("recommended");
  const [fiberTab, setFiberTab] = useState<FiberTab>("all");
  const [selectedFiberSubtypes, setSelectedFiberSubtypes] = useState<string[]>([]);
  const [selectedBrandSlugs, setSelectedBrandSlugs] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [shopBrands, setShopBrands] = useState<{ slug: string; name: string; count: number }[]>([]);

  useEffect(() => {
    getShopBrands()
      .then((brands) =>
        setShopBrands(brands.map((b) => ({ slug: b.slug, name: b.name, count: b.count })))
      )
      .catch(() => {});
  }, []);

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

  const wearCards = useMemo(
    () => wearToWhereEditorialCards(collectionSlug, products.map(toCatalogProduct)),
    [collectionSlug, products]
  );

  const filteredProducts = useMemo(() => {
    let list = products;
    if (fiberTab !== "all") {
      const needle = fiberTab.toLowerCase();
      list = list.filter((p) => (p.composition || "").toLowerCase().includes(needle));
    }
    list = filterProductsByFiberSubtypes(list, selectedFiberSubtypes);
    if (categoryFilter !== "all") {
      const needle = categoryFilter.toLowerCase();
      list = list.filter(
        (p) =>
          (p.category || "").toLowerCase().includes(needle) ||
          (p.name || "").toLowerCase().includes(needle)
      );
    }
    if (selectedBrandSlugs.length > 0) {
      const slugSet = new Set(selectedBrandSlugs.map((s) => s.toLowerCase()));
      const nameBySlug = new Map(shopBrands.map((b) => [b.slug, b.name.toLowerCase()]));
      list = list.filter((p) => {
        const slug = (p.brandSlug || "").toLowerCase();
        if (slug && slugSet.has(slug)) return true;
        const bn = (p.brandName || "").toLowerCase();
        return [...slugSet].some((s) => bn === (nameBySlug.get(s) || s));
      });
    }
    list = filterProductsByCollectionMood(
      list.map(toCatalogProduct),
      selectedMood,
      collectionSlug
    ) as Product[];
    return sortCollectionProducts(list, sortBy);
  }, [
    products,
    fiberTab,
    selectedFiberSubtypes,
    categoryFilter,
    selectedBrandSlugs,
    selectedMood,
    collectionSlug,
    sortBy,
    shopBrands,
  ]);

  const currentSort = SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0];

  const hasActiveFilters =
    fiberTab !== "all" ||
    selectedFiberSubtypes.length > 0 ||
    categoryFilter !== "all" ||
    selectedBrandSlugs.length > 0 ||
    selectedMood != null;

  const displayCount = hasActiveFilters ? filteredProducts.length : totalCount;

  const activeFilters = [
    ...(fiberTab !== "all"
      ? [{ id: "fiber", label: FIBER_TABS.find((t) => t.key === fiberTab)?.label || fiberTab, onRemove: () => { setFiberTab("all"); setSelectedFiberSubtypes([]); } }]
      : []),
    ...selectedFiberSubtypes.map((st) => ({
      id: `subtype-${st}`,
      label: st,
      onRemove: () => setSelectedFiberSubtypes((prev) => prev.filter((s) => s !== st)),
    })),
    ...(categoryFilter !== "all"
      ? [{ id: "cat", label: CATEGORY_OPTIONS.find((c) => c.key === categoryFilter)?.label || categoryFilter, onRemove: () => setCategoryFilter("all") }]
      : []),
    ...selectedBrandSlugs.map((slug) => ({
      id: `brand-${slug}`,
      label: shopBrands.find((b) => b.slug === slug)?.name || slug,
      onRemove: () => setSelectedBrandSlugs((prev) => prev.filter((s) => s !== slug)),
    })),
    ...(selectedMood
      ? [{ id: "mood", label: selectedMood, onRemove: () => setSelectedMood(null) }]
      : []),
  ];

  const mobileFilterPanel = (
    <>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Material</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {FIBER_TABS.filter((t) => t.key !== "all").map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setFiberTab(tab.key);
              setSelectedFiberSubtypes([]);
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
              onClick={() =>
                setSelectedFiberSubtypes((prev) =>
                  prev.includes(subtype) ? prev.filter((s) => s !== subtype) : [...prev, subtype]
                )
              }
              className={`block w-full text-left text-sm py-1.5 ${
                selectedFiberSubtypes.includes(subtype) ? "font-medium text-black" : "text-gray-500"
              }`}
            >
              {subtype}
            </button>
          ))}
        </div>
      )}
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Category</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setCategoryFilter(cat.key)}
            className={`px-4 py-2 text-[10px] uppercase tracking-[0.12em] border ${
              categoryFilter === cat.key ? "border-foreground bg-foreground text-background" : "border-border/40"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {shopBrands.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Designer</p>
          <DesignerSearchFilter
            designers={shopBrands}
            selected={selectedBrandSlugs}
            onChange={setSelectedBrandSlugs}
          />
        </>
      )}
      {moodLabels.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4 mt-8">Mood</p>
          <ul className="space-y-2">
            <li>
              <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={!selectedMood}
                  onChange={() => setSelectedMood(null)}
                  className="accent-foreground"
                />
                All moods
              </label>
            </li>
            {moodLabels.map((mood) => (
              <li key={mood}>
                <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMood === mood}
                    onChange={() => setSelectedMood(selectedMood === mood ? null : mood)}
                    className="accent-foreground"
                  />
                  {mood}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );

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

      <WearToWhereRail
        cards={wearCards}
        className="border-b border-border/30 bg-white"
      />

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

      <section className="py-8 md:py-12 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <CatalogMobileToolbar
          className="mb-6 lg:hidden"
          resultCount={displayCount}
          countLoading={countLoading && displayCount == null}
          sortLabel={currentSort.label}
          onOpenFilter={() => setShowFilterSheet(true)}
          onOpenSort={() => setShowSortSheet(true)}
          activeFilters={activeFilters}
        />

        <div className="lg:flex lg:gap-10 lg:items-start">
          <CatalogFilterSidebar
            resultCount={displayCount}
            isLoading={countLoading && displayCount == null}
            fiberTab={fiberTab}
            categoryFilter={categoryFilter}
            fiberOptions={FIBER_TABS}
            categoryOptions={CATEGORY_OPTIONS}
            onFiberChange={(key) => {
              setFiberTab(key);
              setSelectedFiberSubtypes([]);
            }}
            onCategoryChange={(key) => setCategoryFilter(key)}
            designers={shopBrands}
            selectedDesigners={selectedBrandSlugs}
            onDesignersChange={setSelectedBrandSlugs}
            selectedFiberSubtypes={selectedFiberSubtypes}
            onFiberSubtypesChange={setSelectedFiberSubtypes}
            moodOptions={moodLabels}
            selectedMood={selectedMood}
            onMoodChange={setSelectedMood}
          />

          <div className="flex-1 min-w-0">
            <div className="hidden lg:flex items-center justify-between py-3 border-y border-border/20 mb-6 gap-4">
              <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground shrink-0">
                Filter
              </span>
              <p className="text-[11px] text-muted-foreground text-center flex-1 min-w-0">
                {countLoading && displayCount == null ? (
                  <span className="animate-pulse">Loading…</span>
                ) : (
                  <>
                    <span className="text-foreground font-medium">
                      {(displayCount ?? filteredProducts.length).toLocaleString()}
                    </span>{" "}
                    results
                  </>
                )}
              </p>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sort: {currentSort.label}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
                </button>
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border/40 shadow-xl min-w-[200px]">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => {
                            setSortBy(option.key);
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-[11px] ${
                            sortBy === option.key ? "bg-[#f5f5f3] font-medium" : "text-muted-foreground"
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
              subtitle={`${filteredProducts.length.toLocaleString()} shown`}
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
              {mobileFilterPanel}
            </CatalogMobileSheet>

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

            {hasMore && products.length > 0 && !hasActiveFilters && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-10 border border-neutral-800 px-8 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-neutral-800 hover:text-white transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
