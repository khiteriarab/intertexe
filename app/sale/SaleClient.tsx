"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Heart, Tag } from "lucide-react";
import { useProductFavorites } from "../hooks/use-product-favorites";
import { formatDisplayOriginalPrice, formatDisplayPrice } from "../../lib/format-display-price";

type FiberTab = "all" | "cashmere" | "silk" | "wool" | "cotton" | "linen";
type PriceFilter = "all" | "100" | "200" | "300";

const PAGE_SIZE = 48;

const FIBER_TABS: { key: FiberTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "cashmere", label: "Cashmere" },
  { key: "silk", label: "Silk" },
  { key: "wool", label: "Wool" },
  { key: "cotton", label: "Cotton" },
  { key: "linen", label: "Linen" },
];

const PRICE_FILTERS: { key: PriceFilter; label: string }[] = [
  { key: "all", label: "All Prices" },
  { key: "100", label: "Under $100" },
  { key: "200", label: "Under $200" },
  { key: "300", label: "Under $300" },
];

const CATEGORIES: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Dresses", value: "dresses" },
  { label: "Tops", value: "tops" },
  { label: "Knitwear", value: "knitwear" },
  { label: "Trousers", value: "trousers" },
  { label: "Skirts", value: "skirts" },
  { label: "Outerwear", value: "outerwear" },
  { label: "Jumpsuits", value: "jumpsuits" },
];

function getDiscountPercent(originalPrice: string | null, currentPrice: string | null): number | null {
  if (!originalPrice || !currentPrice) return null;
  const orig = parseFloat(String(originalPrice).replace(/[^0-9.]/g, ""));
  const curr = parseFloat(String(currentPrice).replace(/[^0-9.]/g, ""));
  if (!orig || !curr || orig <= curr) return null;
  return Math.round(((orig - curr) / orig) * 100);
}

function SaleProductCard({ product }: { product: any }) {
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
        <div className="aspect-[3/4] bg-[#f5f5f3] relative overflow-hidden">
          <img src={imageUrl} alt={name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading="lazy" />
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
  priceFilter: PriceFilter,
  selectedCategory: string | null,
  limit: number,
  offset: number
) {
  const params = new URLSearchParams();
  params.set("region", "us");
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (fiberTab !== "all") params.set("fiber", fiberTab);
  if (priceFilter !== "all") params.set("maxPrice", priceFilter);
  if (selectedCategory) params.set("category", selectedCategory);
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
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState(initialProducts || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [offset, setOffset] = useState(initialProducts?.length || 0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      const params = buildSaleParams(fiberTab, priceFilter, selectedCategory, PAGE_SIZE, nextOffset);
      const res = await fetch(`/api/sale?${params}`);
      const data = await res.json();
      const nextProducts = data.products || [];
      const nextTotal = data.total ?? nextProducts.length ?? 0;
      setProducts((prev) => (append ? [...prev, ...nextProducts] : nextProducts));
      setTotal(nextTotal);
      setOffset(nextOffset + nextProducts.length);
      setHasMore(Boolean(data.hasMore) && nextProducts.length > 0);
    },
    [fiberTab, priceFilter, selectedCategory]
  );

  useEffect(() => {
    const isDefault =
      fiberTab === "all" && priceFilter === "all" && selectedCategory === null;
    if (isDefault && initialProducts?.length) {
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
  }, [fiberTab, priceFilter, selectedCategory, initialProducts, initialTotal, initialHasMore, fetchPage]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      await fetchPage(offset, true);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

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

        <div className="flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 border-b border-gray-100">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex-shrink-0 px-4 py-2 text-[9px] tracking-[0.2em] uppercase font-normal border ${
                  selectedCategory === cat.value
                    ? "bg-[#1C2B2A] text-white border-[#1C2B2A]"
                    : "bg-white text-black border-gray-200"
                }`}
                data-testid={`btn-category-${cat.value ?? "all"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {FIBER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFiberTab(tab.key)}
                className={`px-4 py-2 text-[10px] uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${fiberTab === tab.key ? "bg-foreground text-background" : "border border-border/60 text-muted-foreground hover:text-foreground"}`}
                data-testid={`btn-fiber-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {PRICE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setPriceFilter(f.key)}
                className={`px-4 py-2 text-[10px] uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${priceFilter === f.key ? "bg-foreground text-background" : "border border-border/60 text-muted-foreground hover:text-foreground"}`}
                data-testid={`btn-price-${f.key}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-5 md:gap-y-12">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col">
                <div className="aspect-[3/4] bg-[#f0f0ee]" />
                <div className="pt-3 flex flex-col gap-2">
                  <div className="h-2.5 bg-[#f0f0ee] w-1/3" />
                  <div className="h-3 bg-[#f0f0ee] w-3/4" />
                  <div className="h-2.5 bg-[#f0f0ee] w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-5 md:gap-y-12" data-testid="sale-product-grid">
              {products.map((product: any) => (
                <SaleProductCard key={product.id} product={product} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="border border-foreground px-10 py-3 uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
                  data-testid="btn-load-more-sale"
                >
                  {isLoadingMore ? "Loading…" : "Load More"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 flex flex-col gap-4 items-center">
            <Tag className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No sale items match your filters yet.</p>
            <p className="text-xs text-muted-foreground/70">Our price tracker monitors products daily — check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
