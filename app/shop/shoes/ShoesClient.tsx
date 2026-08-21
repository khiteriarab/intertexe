"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CatalogProductImage } from "../../components/CatalogProductImage";
import { ProductLink } from "../../components/ProductLink";
import { formatDisplayPrice } from "../../../lib/format-display-price";
import { cfProductCard } from "../../../lib/cloudflare-images";
import { getShoesCount, getShoesProducts } from "./actions";
import {
  SHOE_MATERIAL_OPTIONS,
  SHOE_TYPE_OPTIONS,
  type ShoeMaterialKey,
} from "../../../lib/footwear-filters";

type ShoeProduct = {
  id: string;
  productId?: string;
  name: string;
  brandName: string;
  imageUrl?: string;
  price?: string;
  originalPrice?: string | null;
  composition?: string;
  listingRegion?: string | null;
  isEditorPick?: boolean;
};

const PAGE_SIZE = 24;

function chipClass(on: boolean) {
  return `px-4 py-2 text-[10px] uppercase tracking-[0.12em] border ${
    on ? "border-foreground bg-foreground text-background" : "border-border/40"
  }`;
}

function ShoeCard({ product, eager }: { product: ShoeProduct; eager?: boolean }) {
  const src = cfProductCard(product.imageUrl) || product.imageUrl || "";
  const priceShown = formatDisplayPrice({
    price: product.price,
    originalPrice: product.originalPrice,
    listingRegion: product.listingRegion,
    productId: product.productId || product.id,
  });

  return (
    <div className="group relative flex flex-col" data-testid={`shoe-card-${product.id}`}>
      {product.isEditorPick ? (
        <span className="absolute top-3 left-3 z-20 text-[7px] tracking-[0.2em] uppercase font-medium text-white bg-[#420217] px-2 py-1">
          Editor pick
        </span>
      ) : null}
      <ProductLink href={`/product/${product.id}`} className="flex flex-col cursor-pointer">
        {src ? (
          <CatalogProductImage
            src={src}
            alt={product.name}
            category="shoes"
            name={product.name}
            eager={eager}
          />
        ) : (
          <div className="aspect-[3/4] bg-[#f5f5f3]" />
        )}
        <div className="flex flex-col gap-1 pt-3">
          <span className="text-[10px] md:text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {product.brandName}
          </span>
          <h3 className="text-[12px] md:text-[13px] leading-snug truncate text-foreground">{product.name}</h3>
          {priceShown ? (
            <span className="text-[12px] md:text-[13px] font-medium mt-0.5">{priceShown}</span>
          ) : null}
          {product.composition ? (
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 mt-0.5 line-clamp-1">
              {product.composition}
            </span>
          ) : null}
        </div>
      </ProductLink>
    </div>
  );
}

export function ShoesClient({
  initialProducts,
  initialHasMore,
  initialType = null,
  initialMaterial = null,
}: {
  initialProducts: ShoeProduct[];
  initialHasMore: boolean;
  initialType?: string | null;
  initialMaterial?: ShoeMaterialKey | null;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [offset, setOffset] = useState(initialProducts.length);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [type, setType] = useState<string | null>(initialType);
  const [material, setMaterial] = useState<ShoeMaterialKey | null>(initialMaterial);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestId = useRef(0);

  const syncUrl = useCallback((nextType: string | null, nextMaterial: ShoeMaterialKey | null) => {
    const params = new URLSearchParams();
    if (nextType) params.set("type", nextType);
    if (nextMaterial) params.set("material", nextMaterial);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/shop/shoes?${qs}` : "/shop/shoes");
  }, []);

  useEffect(() => {
    let cancelled = false;
    getShoesCount({ type, material })
      .then((n) => {
        if (!cancelled) setTotal(n > 0 ? n : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [type, material]);

  const applyFilters = useCallback(
    async (nextType: string | null, nextMaterial: ShoeMaterialKey | null) => {
      setType(nextType);
      setMaterial(nextMaterial);
      syncUrl(nextType, nextMaterial);
      const id = ++requestId.current;
      setLoadingFilters(true);
      try {
        const result = await getShoesProducts({
          limit: PAGE_SIZE,
          offset: 0,
          type: nextType,
          material: nextMaterial,
        });
        if (id !== requestId.current) return;
        setProducts(result.products);
        setOffset(result.products.length);
        setHasMore(result.hasMore && result.products.length > 0);
      } finally {
        if (id === requestId.current) setLoadingFilters(false);
      }
    },
    [syncUrl]
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || loadingFilters || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await getShoesProducts({
        limit: PAGE_SIZE,
        offset,
        type,
        material,
      });
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.productId || p.id));
        const next = [...prev];
        for (const p of result.products) {
          const id = p.productId || p.id;
          if (!seen.has(id)) {
            seen.add(id);
            next.push(p);
          }
        }
        return next;
      });
      setOffset((o) => o + result.products.length);
      setHasMore(result.hasMore && result.products.length > 0);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingFilters, loadingMore, material, offset, type]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="pb-28 md:pb-16" data-testid="shoes-catalog">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-10">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
          <Link href="/shop/hub" className="hover:text-foreground">
            Shop
          </Link>
          <span className="mx-2">/</span>
          Shoes
        </p>
        <h1 className="font-serif text-[32px] md:text-[40px] leading-tight mb-2">Shoes</h1>
        <p className="text-[13px] md:text-[15px] text-muted-foreground font-light max-w-lg mb-8">
          Natural leather and suede footwear — verified compositions, shown on the fast footwear catalog.
        </p>

        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Shoe type</p>
        <div className="flex flex-wrap gap-2 mb-6" data-testid="shoes-type-menu">
          <button type="button" className={chipClass(!type)} onClick={() => void applyFilters(null, material)}>
            All
          </button>
          {SHOE_TYPE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={chipClass(type === option)}
              onClick={() => void applyFilters(type === option ? null : option, material)}
              data-testid={`shoes-type-${option.toLowerCase()}`}
            >
              {option}
            </button>
          ))}
        </div>

        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Material</p>
        <div className="flex flex-wrap gap-2 mb-8" data-testid="shoes-material-menu">
          <button type="button" className={chipClass(!material)} onClick={() => void applyFilters(type, null)}>
            All
          </button>
          {SHOE_MATERIAL_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={chipClass(material === option.key)}
              onClick={() => void applyFilters(type, material === option.key ? null : option.key)}
              data-testid={`shoes-material-${option.key}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-6">
          {loadingFilters
            ? "Updating…"
            : total != null
              ? `${total.toLocaleString()} styles`
              : `${products.length}+ styles`}
        </p>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16">
            {type || material ? "No shoes match these filters." : "Shoes are refreshing — check back shortly."}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-5 md:gap-y-10">
            {products.map((product, i) => (
              <ShoeCard key={product.productId || product.id} product={product} eager={i < 8} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-8" />
        {loadingMore ? (
          <p className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground py-6">
            Loading…
          </p>
        ) : null}
      </div>
    </div>
  );
}
