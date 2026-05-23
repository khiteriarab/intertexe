"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductLink } from "../../components/ProductLink";
import { formatDisplayPrice } from "../../../lib/format-display-price";
import type { EditPageConfig } from "../../../lib/edit-pages";
import { EDIT_SLUGS, EDIT_PAGES, FABRIC_EDIT_SLUGS } from "../../../lib/edit-pages";
import { EditorialHeroImage } from "../../components/EditorialHeroImage";

type Product = {
  id: string;
  productId?: string;
  name: string;
  brandName: string;
  imageUrl?: string;
  price?: string;
};

export default function EditClient({
  config,
  products: initialProducts,
  editCount,
  catalogTotal,
  heroImageUrl,
}: {
  config: EditPageConfig;
  products: Product[];
  editCount: number;
  catalogTotal: number;
  heroImageUrl: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [offset, setOffset] = useState(initialProducts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(Math.max(editCount, catalogTotal));
  const [hasMore, setHasMore] = useState(
    initialProducts.length < Math.max(editCount, catalogTotal) && initialProducts.length > 0
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/catalog?mode=edit&slug=${config.slug}&limit=32&offset=${offset}`
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
      ? `${config.catalogLabel} (${catalogTotal.toLocaleString()}+)`
      : config.catalogLabel;

  return (
    <div className="flex flex-col" data-testid={`page-edit-${config.slug}`}>
      <section className="relative -mx-4 md:-mx-8 overflow-hidden">
        <EditorialHeroImage
          src={heroImageUrl}
          alt={config.title}
          variant="collection"
          slug={config.slug}
          title={config.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-10 flex flex-col justify-end px-6 md:px-14 pb-10 md:pb-14 max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/60 mb-2">{config.kicker}</p>
          <h1 className="text-3xl md:text-5xl font-serif text-white leading-tight mb-3">{config.title}</h1>
          <p className="text-sm md:text-base text-white/75 leading-relaxed max-w-xl">{config.description}</p>
        </div>
      </section>

      <section className="border-b border-border/30 bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
          {FABRIC_EDIT_SLUGS.map((slug) => {
            const ed = EDIT_PAGES[slug];
            const href = `/edits/${slug}`;
            const active = slug === config.slug;
            return (
              <Link
                key={slug}
                href={href}
                className={`flex-shrink-0 px-4 py-2 text-[10px] uppercase tracking-[0.14em] whitespace-nowrap ${
                  active
                    ? "bg-[#111] text-white"
                    : "bg-white border border-neutral-200 text-foreground/70 hover:text-foreground"
                }`}
              >
                {ed.title.replace(/^The /, "")}
              </Link>
            );
          })}
          <Link
            href="/collections/vacation"
            className="flex-shrink-0 px-4 py-2 text-[10px] uppercase tracking-[0.14em] bg-white border border-neutral-200 text-foreground/70 hover:text-foreground"
          >
            Collections →
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto w-full px-4 pt-8 pb-4">
        <p className="text-[11px] text-muted-foreground">
          <span className="text-foreground font-medium">{totalCount.toLocaleString()} pieces</span> in this edit
          {catalogTotal > 0 && (
            <>
              {" "}
              · <span className="text-foreground font-medium">{catalogTotal.toLocaleString()}+</span> in the
              full catalog
            </>
          )}
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            This edit is refreshing. Browse the{" "}
            <Link href={config.catalogHref} className="underline">
              full catalog
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-5 md:gap-y-12">
              {products.map((product, index) => (
                <ProductLink
                  key={product.id || product.productId || index}
                  href={`/product/${product.id}`}
                  className="group flex flex-col"
                >
                  <div className="aspect-[3/4] bg-[#f3f3f1] overflow-hidden mb-3">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                        loading={index < 8 ? "eager" : "lazy"}
                      />
                    ) : null}
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {product.brandName}
                  </span>
                  <h3 className="text-[12px] md:text-[13px] line-clamp-2">{product.name}</h3>
                  <span className="text-[12px] mt-1">{formatDisplayPrice(product)}</span>
                </ProductLink>
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-10">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-10 py-3.5 border border-foreground/25 text-[10px] uppercase tracking-[0.2em] hover:border-foreground/50 disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-12 flex flex-col sm:flex-row gap-3 border-t border-border/30 pt-10">
          <Link
            href={config.catalogHref}
            className="inline-flex items-center gap-2 border border-foreground/20 px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:border-foreground/50"
          >
            {catalogLabel} <ArrowRight className="w-3 h-3" />
          </Link>
          {config.materialHref && (
            <Link
              href={config.materialHref}
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground px-2 py-3"
            >
              Material guide <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground px-2 py-3"
          >
            Main shop
          </Link>
        </div>
      </section>
    </div>
  );
}
