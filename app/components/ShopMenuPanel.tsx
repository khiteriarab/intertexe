"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TAILORING_EDITORIAL_HERO } from "../../lib/editorial-assets";
import { getShopHubMenu } from "../../lib/shop-hub-menu";

type TaxonomyMenuNode = {
  label: string;
  href: string;
  pathSegment: string;
};

async function fetchClothingMenu(): Promise<TaxonomyMenuNode[]> {
  const res = await fetch("/api/catalog/taxonomy?department=clothing&region=us&activeOnly=true");
  if (!res.ok) return [];
  const data = (await res.json()) as { nodes?: TaxonomyMenuNode[] };
  return Array.isArray(data.nodes) ? data.nodes : [];
}

function MenuRow({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center justify-between py-3.5 border-b border-border/15 last:border-0 group"
    >
      <span className="text-[15px] text-foreground group-hover:text-foreground/70 transition-colors">{label}</span>
      <span className="text-muted-foreground/60 text-lg leading-none" aria-hidden>
        ›
      </span>
    </Link>
  );
}

/** Desktop + mobile Shop flyout — hub links + live clothing category list (NAP-style). */
export function ShopMenuPanel({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const hub = getShopHubMenu();
  const { data: clothingRows = [] } = useQuery({
    queryKey: ["shopMenuClothingTaxonomy"],
    queryFn: fetchClothingMenu,
    staleTime: 300_000,
  });

  const quickCategories = clothingRows.filter((row) => row.pathSegment !== "all").slice(0, 10);

  return (
    <div className={compact ? "flex flex-col" : "grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 min-w-[min(92vw,720px)]"}>
      <div className="flex flex-col">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Shop</p>
        {hub.map((item) => (
          <MenuRow key={item.href} href={item.href} label={item.name} onNavigate={onNavigate} />
        ))}
        <Link
          href="/shop/clothing"
          onClick={onNavigate}
          className="mt-5 block group"
          data-testid="shop-menu-clothing-visual"
        >
          <div className="aspect-[4/3] relative overflow-hidden bg-[#f0ece6]">
            <img
              src={TAILORING_EDITORIAL_HERO}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
              draggable={false}
            />
          </div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground mt-3 group-hover:opacity-70 transition-opacity">
            Browse all clothing categories
          </p>
        </Link>
      </div>

      <div className="flex flex-col border-t md:border-t-0 md:border-l border-border/20 pt-5 md:pt-0 md:pl-8">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Clothing</p>
        {quickCategories.length === 0 ? (
          <MenuRow href="/shop/clothing" label="All categories" onNavigate={onNavigate} />
        ) : (
          quickCategories.map((row) => (
            <MenuRow key={row.href} href={row.href} label={row.label} onNavigate={onNavigate} />
          ))
        )}
        <Link
          href="/shop/clothing"
          onClick={onNavigate}
          className="mt-4 text-[11px] uppercase tracking-[0.14em] text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity"
        >
          View all categories
        </Link>
      </div>
    </div>
  );
}
