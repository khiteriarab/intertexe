"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductLink } from "../../components/ProductLink";
import { formatDisplayPrice } from "../../../lib/format-display-price";
import {
  COLLECTION_PAGES,
  COLLECTION_SLUGS,
  type CollectionPageConfig,
} from "../../../lib/collection-pages";

type Product = {
  id: string;
  productId?: string;
  name: string;
  brandName: string;
  imageUrl?: string;
  price?: string;
};

export default function CollectionClient({
  config,
  products: initialProducts,
  editCount,
  catalogTotal,
  heroImageUrl,
}: {
  config: CollectionPageConfig;
  products: Product[];
  editCount: number;
  catalogTotal: number;
  heroImageUrl: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [offset, setOffset] = useState(initialProducts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const displayTotal = Math.max(editCount, catalogTotal);
  const [totalCount, setTotalCount] = useState(displayTotal);
  const [hasMore, setHasMore] = useState(
    initialProducts.length < displayTotal && initialProducts.length > 0
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
      setTotalCount(total);
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
        setOffset((o) => {
          const nextOffset = o + next.length;
          setHasMore(nextOffset < total && next.length >= 32);
          return nextOffset;
        });
      }
    } finally {
      setLoadingMore(false);
    }
  }, [config.slug, offset, loadingMore, hasMore]);

  const catalogLabel =
    catalogTotal > 0
      ? `${config.catalogLabel} (${catalogTotal.toLocaleString()}+ in catalog)`
      : config.catalogLabel;

  return (
    <div className="flex flex-col" data-testid={`page-collection-${config.slug}`}>
      <section className="relative -mx-4 md:-mx-8 h-[52vh] md:h-[58vh] min-h-[320px] overflow-hidden">
        <img src={heroImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/10" />
        <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-14 pb-12 md:pb-16 max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/55 mb-2">{config.kicker}</p>
          <h1 className="text-3xl md:text-[52px] font-serif text-white leading-[1.05] mb-3">{config.title}</h1>
          <p className="text-sm md:text-base text-white/80 leading-relaxed max-w-xl mb-2">{config.description}</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">{config.atmosphere}</p>
        </div>
      </section>

      {config.themes.length > 0 && (
        <section className="border-b border-border/30 px-4 md:px-8 py-6 md:py-8 bg-white">
          <div className="max-w-6xl mx-auto">
            <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400 mb-4">The edit</p>
            <ul className="flex flex-wrap gap-2">
              {config.themes.map((theme) => (
                <li
                  key={theme}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-neutral-600 border border-neutral-200 bg-[#FAFAF8]"
                >
                  {theme}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

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
        <p className="text-[11px] text-neutral-500 mb-6">
          <span className="font-medium text-neutral-800">{totalCount} pieces</span> in this collection
          {products.length < totalCount ? (
            <> · scroll or load more to explore the full edit</>
          ) : null}
        </p>

        {products.length === 0 ? (
          <p className="text-sm text-neutral-500 max-w-md leading-relaxed">
            This collection is being refreshed with new editorial picks. Browse the full catalog link below.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductLink
                key={product.id}
                href={`/product/${product.id}`}
                className="group flex flex-col"
              >
                <div className="aspect-[3/4] bg-[#f5f4f2] relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : null}
                </div>
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

        <Link
          href={config.catalogHref}
          className="inline-flex items-center gap-2 mt-8 text-[10px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-900"
        >
          {catalogLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </section>
    </div>
  );
}
