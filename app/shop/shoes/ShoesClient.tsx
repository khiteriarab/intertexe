"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CatalogProductImage } from "../../components/CatalogProductImage";
import { ProductLink } from "../../components/ProductLink";
import { formatDisplayPrice } from "../../../lib/format-display-price";
import { cfProductCard } from "../../../lib/cloudflare-images";
import { getShoesCount, getShoesProducts } from "./actions";

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
}: {
  initialProducts: ShoeProduct[];
  initialHasMore: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [offset, setOffset] = useState(initialProducts.length);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    getShoesCount()
      .then((n) => {
        if (!cancelled && n > 0) setTotal(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await getShoesProducts({ limit: PAGE_SIZE, offset });
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
  }, [hasMore, loadingMore, offset]);

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
        <p className="text-[13px] md:text-[15px] text-muted-foreground font-light max-w-lg mb-6">
          Natural leather and suede footwear — verified compositions, shown on the fast footwear catalog.
        </p>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-6">
          {total != null ? `${total.toLocaleString()} styles` : `${products.length}+ styles`}
        </p>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16">Shoes are refreshing — check back shortly.</p>
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
