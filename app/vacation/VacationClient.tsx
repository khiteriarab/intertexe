"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductLink } from "../components/ProductLink";
import { formatDisplayPrice } from "../../lib/format-display-price";

type CategoryTab = "edit" | "dresses" | "skirts";

type Product = {
  id: string;
  productId?: string;
  name: string;
  brandName: string;
  imageUrl?: string;
  price?: string;
  composition?: string;
};

export default function VacationClient({
  initialEditProducts,
  initialCatalogProducts,
  initialCatalogTotal,
  editCount,
  linenDressCount,
  linenSkirtCount,
  initialCategory,
}: {
  initialEditProducts: Product[];
  initialCatalogProducts: Product[];
  initialCatalogTotal: number;
  editCount: number;
  linenDressCount: number;
  linenSkirtCount: number;
  initialCategory: "dresses" | "skirts";
}) {
  const [tab, setTab] = useState<CategoryTab>("edit");
  const [catalogProducts, setCatalogProducts] = useState(initialCatalogProducts);
  const [catalogTotal, setCatalogTotal] = useState(initialCatalogTotal);
  const [category, setCategory] = useState<"dresses" | "skirts">(initialCategory);
  const [loading, setLoading] = useState(false);

  const loadCategory = useCallback(async (cat: "dresses" | "skirts") => {
    setLoading(true);
    setCategory(cat);
    setTab(cat);
    try {
      const res = await fetch(`/api/catalog?mode=vacation&category=${cat}&limit=32&offset=0`);
      const data = await res.json();
      setCatalogProducts(data.products || []);
      setCatalogTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  const displayProducts = tab === "edit" ? initialEditProducts : catalogProducts;
  const fullLinenCount = linenDressCount + linenSkirtCount;

  return (
    <div className="flex flex-col" data-testid="page-vacation">
      <section className="pt-10 md:pt-14 pb-6 max-w-6xl mx-auto w-full px-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Curated collection</p>
        <h1 className="text-3xl md:text-5xl font-serif leading-tight mb-3">The Vacation Edit</h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
          Resort-ready <strong className="font-normal text-foreground">linen dresses and skirts</strong> — a
          small curated edit on the homepage, not the full catalog.
        </p>
        <p className="text-[11px] text-muted-foreground mt-4">
          <span className="text-foreground font-medium">{editCount} pieces</span> in this edit ·{" "}
          <span className="text-foreground font-medium">{fullLinenCount.toLocaleString()}+</span> linen dresses
          &amp; skirts in the full shop
        </p>
      </section>

      <section className="border-y border-border/30 bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab("edit")}
            className={`flex-shrink-0 px-4 py-2 text-[11px] uppercase tracking-[0.12em] ${
              tab === "edit" ? "bg-[#111] text-white" : "bg-white border border-neutral-200 text-foreground/70"
            }`}
          >
            This edit ({editCount})
          </button>
          <button
            type="button"
            onClick={() => loadCategory("dresses")}
            className={`flex-shrink-0 px-4 py-2 text-[11px] uppercase tracking-[0.12em] ${
              tab === "dresses" ? "bg-[#111] text-white" : "bg-white border border-neutral-200 text-foreground/70"
            }`}
          >
            Linen dresses ({linenDressCount.toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => loadCategory("skirts")}
            className={`flex-shrink-0 px-4 py-2 text-[11px] uppercase tracking-[0.12em] ${
              tab === "skirts" ? "bg-[#111] text-white" : "bg-white border border-neutral-200 text-foreground/70"
            }`}
          >
            Linen skirts ({linenSkirtCount.toLocaleString()})
          </button>
        </div>
      </section>

      {tab !== "edit" && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <p className="text-[11px] text-muted-foreground">
            Browsing full catalog: linen {category} · {catalogTotal.toLocaleString()} results
          </p>
        </div>
      )}

      <section className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>
        ) : displayProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No vacation pieces loaded. Try linen dresses or skirts, or browse{" "}
            <Link href="/materials/linen" className="underline">
              all linen
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-5 md:gap-y-12">
            {displayProducts.map((product, index) => (
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
        )}

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/shop?fiber=linen&category=dresses"
            className="inline-flex items-center gap-2 border border-foreground/20 px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:border-foreground/50"
          >
            Shop all linen dresses <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            href="/shop?fiber=linen&category=skirts"
            className="inline-flex items-center gap-2 border border-foreground/20 px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:border-foreground/50"
          >
            Shop all linen skirts <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground px-2 py-3"
          >
            Main shop (all fabrics)
          </Link>
        </div>
      </section>
    </div>
  );
}
