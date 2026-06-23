"use client";

import { useCallback, useEffect, useState } from "react";
import { useInfiniteScroll } from "../hooks/use-infinite-scroll";
import Link from "next/link";
import { ShoppingBag, Heart, Tag, ChevronDown } from "lucide-react";
import { useProductFavorites } from "../hooks/use-product-favorites";
import { formatDisplayOriginalPrice, formatDisplayPrice } from "../../lib/format-display-price";
import {
  SHOP_CATEGORY_OPTIONS,
  SHOP_COLOR_OPTIONS,
  SHOP_PRICE_TIERS,
  type ShopPriceTierId,
} from "../../lib/catalog-filter-options";
import { getShopBrands } from "../shop/actions";
import { fiberSubtypesFor } from "../../lib/fiber-subtypes";
import { DesignerSearchFilter } from "../components/DesignerSearchFilter";
import {
  CatalogMobileToolbar,
  CatalogMobileSheet,
} from "../components/CatalogMobileToolbar";
import { CatalogFilterSidebar } from "../components/CatalogFilterSidebar";
import { CatalogProductImage } from "../components/CatalogProductImage";

type FiberTab = "all" | "cashmere" | "silk" | "wool" | "cotton" | "linen" | "leather";
type SaleSort = "discount" | "new" | "price-low" | "price-high" | "natural-high";

const PAGE_SIZE = 24;

const FIBER_TABS: { key: FiberTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "silk", label: "Silk" },
  { key: "linen", label: "Linen" },
  { key: "cashmere", label: "Cashmere" },
  { key: "cotton", label: "Cotton" },
  { key: "wool", label: "Wool" },
  { key: "leather", label: "Leather" },
];

const SALE_CATEGORIES = [{ key: "all" as const, label: "All" }, ...SHOP_CATEGORY_OPTIONS];

const SORT_OPTIONS: { key: SaleSort; label: string }[] = [
  { key: "discount", label: "Best discount" },
  { key: "new", label: "Newest" },
  { key: "price-low", label: "Price: Low to High" },
  { key: "price-high", label: "Price: High to Low" },
  { key: "natural-high", label: "Highest natural fiber" },
];

function getDiscountPercent(originalPrice: string | null, currentPrice: string | null): number | null {
  if (!originalPrice || !currentPrice) return null;
  const orig = parseFloat(String(originalPrice).replace(/[^0-9.]/g, ""));
  const curr = parseFloat(String(currentPrice).replace(/[^0-9.]/g, ""));
  if (!orig || !curr || orig <= curr) return null;
  return Math.round(((orig - curr) / orig) * 100);
}

function SaleProductCard({ product, eager }: { product: any; eager?: boolean }) {
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
    <Link href={`/product/${product.id}`} className="group flex flex-col cursor-pointer relative" data-testid={`sale-product-${product.id}`}>
      {imageUrl ? (
        <div className="relative">
          <CatalogProductImage
            src={imageUrl}
            alt={name}
            category={product.category}
            name={name}
            eager={eager}
          />
          {(product.stock_status === "low_stock" || product.stockStatus === "low_stock") && (
            <span className="absolute top-3 left-3 z-20 text-[7px] tracking-[0.2em] uppercase font-medium text-white bg-[#420217] px-2 py-1">
              Low Stock
            </span>
          )}
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
    </Link>
  );
}

function buildSaleParams(
  fiberTab: FiberTab,
  priceTier: ShopPriceTierId,
  categoryFilter: string,
  selectedColor: string | null,
  selectedBrands: string[],
  selectedFiberSubtypes: string[],
  sortBy: SaleSort,
  limit: number,
  offset: number
) {
  const params = new URLSearchParams();
  params.set("region", "us");
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (fiberTab !== "all") params.set("fiber", fiberTab);
  if (priceTier !== "any") params.set("price", priceTier);
  if (categoryFilter !== "all") params.set("category", categoryFilter);
  if (selectedColor) params.set("color", selectedColor);
  if (selectedBrands.length) params.set("brand", selectedBrands[0]);
  if (selectedFiberSubtypes.length) params.set("fiberSubtype", selectedFiberSubtypes[0]);
  if (sortBy) params.set("sort", sortBy);
  return params;
}

export default function SaleClient({
  initialProducts,
  initialTotal,
  initialHasMore = true,
}: {
  initialProducts: any[];
  initialTotal: number;
  initialHasMore?: boolean;
}) {
  const [fiberTab, setFiberTab] = useState<FiberTab>("all");
  const [priceTier, setPriceTier] = useState<ShopPriceTierId>("any");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFiberSubtypes, setSelectedFiberSubtypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SaleSort>("discount");
  const [shopBrands, setShopBrands] = useState<{ slug: string; name: string; count: number }[]>([]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [products, setProducts] = useState(initialProducts || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [offset, setOffset] = useState(initialProducts?.length || 0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    getShopBrands()
      .then((brands) => setShopBrands(brands.map((b) => ({ slug: b.slug, name: b.name, count: b.count }))))
      .catch(() => {});
  }, []);

  const hasActiveFilters =
    fiberTab !== "all" ||
    selectedFiberSubtypes.length > 0 ||
    categoryFilter !== "all" ||
    selectedBrands.length > 0 ||
    selectedColor != null ||
    priceTier !== "any" ||
    sortBy !== "discount";

  const fetchPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      const params = buildSaleParams(
        fiberTab,
        priceTier,
        categoryFilter,
        selectedColor,
        selectedBrands,
        selectedFiberSubtypes,
        sortBy,
        PAGE_SIZE,
        nextOffset
      );
      const res = await fetch(`/api/sale?${params}`);
      const data = await res.json();
      const nextProducts = data.products || [];
      const nextTotal = data.total ?? nextProducts.length ?? 0;
      setProducts((prev) => (append ? [...prev, ...nextProducts] : nextProducts));
      setTotal(nextTotal);
      setOffset(nextOffset + nextProducts.length);
      setHasMore(Boolean(data.hasMore) && nextProducts.length > 0);
    },
    [fiberTab, priceTier, categoryFilter, selectedColor, selectedBrands, selectedFiberSubtypes, sortBy]
  );

  useEffect(() => {
    if (!hasActiveFilters && initialProducts?.length) {
      setProducts(initialProducts);
      setTotal(initialTotal);
      setOffset(initialProducts.length);
      setHasMore(initialHasMore);
      return;
    }

    setIsLoading(true);
    fetchPage(0, false)
      .catch(() => {
        setProducts([]);
        setTotal(0);
        setOffset(0);
        setHasMore(false);
      })
      .finally(() => setIsLoading(false));
  }, [
    fiberTab,
    priceTier,
    categoryFilter,
    selectedColor,
    selectedBrands.join(","),
    selectedFiberSubtypes.join(","),
    sortBy,
    hasActiveFilters,
    initialProducts,
    initialTotal,
    initialHasMore,
    fetchPage,
  ]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      await fetchPage(offset, true);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, isLoading, fetchPage, offset]);

  const loadMoreSentinelRef = useInfiniteScroll(
    hasMore && products.length > 0 && !isLoadingMore && !isLoading,
    () => {
      void loadMore();
    },
    [hasMore, products.length, isLoadingMore, isLoading, loadMore]
  );

  const currentSort = SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0];

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
      ? [{ id: "cat", label: SALE_CATEGORIES.find((c) => c.key === categoryFilter)?.label || categoryFilter, onRemove: () => setCategoryFilter("all") }]
      : []),
    ...(selectedColor
      ? [{ id: "color", label: SHOP_COLOR_OPTIONS.find((c) => c.value === selectedColor)?.label || selectedColor, onRemove: () => setSelectedColor(null) }]
      : []),
    ...(priceTier !== "any"
      ? [{ id: "price", label: SHOP_PRICE_TIERS.find((t) => t.id === priceTier)?.label || priceTier, onRemove: () => setPriceTier("any") }]
      : []),
    ...selectedBrands.map((slug) => ({
      id: `brand-${slug}`,
      label: shopBrands.find((b) => b.slug === slug)?.name || slug,
      onRemove: () => setSelectedBrands((prev) => prev.filter((s) => s !== slug)),
    })),
  ];

  const mobileFilterPanel = (
    <>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Category</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {SALE_CATEGORIES.map((cat) => (
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
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Color</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {SHOP_COLOR_OPTIONS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => setSelectedColor(selectedColor === color.value ? null : color.value)}
            className={`px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase border transition-colors ${
              selectedColor === color.value
                ? "bg-[#1C2B2A] text-white border-[#1C2B2A]"
                : "bg-white text-black border-gray-200 hover:border-gray-400"
            }`}
          >
            {color.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Price</p>
      <div className="flex flex-col gap-2 mb-8 border border-border/30">
        {SHOP_PRICE_TIERS.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => setPriceTier(tier.id)}
            className={`w-full text-left px-4 py-3 text-[12px] border-b border-border/20 last:border-0 ${
              priceTier === tier.id ? "bg-[#f5f5f3] font-medium" : "text-muted-foreground"
            }`}
          >
            {tier.label}
          </button>
        ))}
      </div>
      {shopBrands.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Designer</p>
          <DesignerSearchFilter
            designers={shopBrands}
            selected={selectedBrands}
            onChange={setSelectedBrands}
          />
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen pb-20">
      <div className="py-10 md:py-16 flex flex-col gap-8 md:gap-12">
        <div className="flex flex-col gap-3 text-center">
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground">Verified Natural Fabrics</span>
          <h1 className="text-3xl md:text-5xl font-serif" data-testid="text-sale-title">The Edit — On Sale</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {total > 0
              ? `${total.toLocaleString()} verified products on sale`
              : products.length > 0
                ? `${products.length.toLocaleString()} verified products on sale`
                : "Sale items will appear here as prices drop"}
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 w-full">
          <CatalogMobileToolbar
            className="mb-6 lg:hidden"
            resultCount={total > 0 ? total : null}
            countLoading={isLoading && total === 0}
            sortLabel={currentSort.label}
            onOpenFilter={() => setShowFilterSheet(true)}
            onOpenSort={() => setShowSortSheet(true)}
            activeFilters={activeFilters}
          />

          <div className="lg:flex lg:gap-10 lg:items-start">
            <CatalogFilterSidebar
              resultCount={total > 0 ? total : null}
              isLoading={isLoading && total === 0}
              fiberTab={fiberTab}
              categoryFilter={categoryFilter}
              fiberOptions={FIBER_TABS}
              categoryOptions={[...SALE_CATEGORIES]}
              onFiberChange={(key) => {
                setFiberTab(key);
                setSelectedFiberSubtypes([]);
              }}
              onCategoryChange={(key) => setCategoryFilter(key)}
              designers={shopBrands}
              selectedDesigners={selectedBrands}
              onDesignersChange={setSelectedBrands}
              selectedFiberSubtypes={selectedFiberSubtypes}
              onFiberSubtypesChange={setSelectedFiberSubtypes}
              colorOptions={[...SHOP_COLOR_OPTIONS]}
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              priceTierOptions={SHOP_PRICE_TIERS.map((t) => ({ id: t.id, label: t.label }))}
              selectedPriceTier={priceTier}
              onPriceTierChange={(id) => setPriceTier(id as ShopPriceTierId)}
            />

            <div className="flex-1 min-w-0">
              <div className="hidden lg:flex items-center justify-between py-3 border-y border-border/20 mb-6 gap-4">
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground shrink-0">
                  Filter
                </span>
                <p className="text-[11px] text-muted-foreground text-center flex-1 min-w-0">
                  {isLoading && total === 0 ? (
                    <span className="animate-pulse">Loading…</span>
                  ) : (
                    <>
                      <span className="text-foreground font-medium">{total.toLocaleString()}</span> results
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
                subtitle={total > 0 ? `${total.toLocaleString()} on sale` : undefined}
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

              {isLoading && products.length === 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-5 md:gap-y-12">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex flex-col">
                      <div className="aspect-[3/4] bg-[#f0f0ee]" />
                      <div className="pt-3 flex flex-col gap-2">
                        <div className="h-2.5 bg-[#f0f0ee] w-1/3" />
                        <div className="h-3 bg-[#f0f0ee] w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-5 md:gap-y-12" data-testid="sale-product-grid">
                    {products.map((product: any, i: number) => (
                      <SaleProductCard key={product.id} product={product} eager={i < 12} />
                    ))}
                  </div>
                  {hasMore && (
                    <div ref={loadMoreSentinelRef} className="flex justify-center pt-8 pb-4 min-h-[48px]">
                      {isLoadingMore && (
                        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
                          Loading more…
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 flex flex-col gap-4 items-center">
                  <Tag className="w-12 h-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No sale items match your filters yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
