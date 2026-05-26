"use client";

import { useMemo, useState } from "react";
import { displayNaturalFiberPercent } from "../../../lib/display-natural-fiber";

function parsePrice(p: string | null | undefined): number {
  if (!p) return 0;
  const n = parseFloat(String(p).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function nfpColor(nfp: number | null): string {
  if (nfp == null) return "#6b7280";
  if (nfp >= 95) return "#065f46";
  if (nfp >= 80) return "#047857";
  return "#374151";
}

function topFibersFromProducts(products: { composition?: string | null }[]): string[] {
  const counts = new Map<string, number>();
  const keys = ["silk", "cashmere", "linen", "wool", "cotton", "leather", "merino"];
  for (const p of products) {
    const comp = (p.composition || "").toLowerCase();
    for (const k of keys) {
      if (comp.includes(k)) counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
}

export function BrandEditorialSections({
  description,
  naturalFiberPercent,
  products,
  onFiberFilter,
}: {
  description: string | null;
  naturalFiberPercent: number | null;
  products: { composition?: string | null; price?: string | null }[];
  onFiberFilter: (fiber: string | null) => void;
}) {
  const [activeFiber, setActiveFiber] = useState<string | null>(null);
  const topFibers = useMemo(() => topFibersFromProducts(products), [products]);

  const prices = products.map((p) => parsePrice(p.price)).filter((n) => n > 0);
  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;

  const scoreLabel = displayNaturalFiberPercent(naturalFiberPercent);

  return (
    <div className="mb-10 md:mb-12 flex flex-col gap-8">
      {description && (
        <div className="max-w-2xl" data-testid="brand-story">
          <p className="text-sm text-foreground/75 leading-relaxed">{description}</p>
        </div>
      )}

      {scoreLabel != null && (
        <div className="flex items-center gap-4" data-testid="brand-nfp">
          <div>
            <span
              className="text-4xl font-serif font-light tabular-nums"
              style={{ color: nfpColor(naturalFiberPercent) }}
            >
              {scoreLabel}%
            </span>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-1">
              Average natural fiber
            </p>
          </div>
          <div className="border-l border-border/30 pl-4">
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              {naturalFiberPercent != null && naturalFiberPercent >= 95
                ? "Exceptional commitment to natural materials."
                : naturalFiberPercent != null && naturalFiberPercent >= 80
                  ? "Strong natural fiber content across their catalog."
                  : "Natural fiber content in qualifying products."}
            </p>
          </div>
        </div>
      )}

      {priceMin != null && priceMax != null && (
        <p className="text-xs text-muted-foreground" data-testid="brand-price-range">
          Typical price range: ${priceMin.toLocaleString()} – ${priceMax.toLocaleString()}
        </p>
      )}

      {topFibers.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="brand-top-fibers">
          {topFibers.map((fiber) => (
            <button
              key={fiber}
              type="button"
              onClick={() => {
                const next = activeFiber === fiber ? null : fiber;
                setActiveFiber(next);
                onFiberFilter(next);
              }}
              className={`text-[10px] tracking-[0.15em] uppercase border px-4 py-2 transition-colors ${
                activeFiber === fiber
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/40 hover:border-foreground"
              }`}
            >
              {fiber}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
