import type { Metadata } from "next";
import Link from "next/link";
import { DesignerSearchClient } from "./DesignerSearchClient";
import { ShoppableDesignersList } from "./ShoppableDesignersList";
import { getCachedBrandStats, getCachedPlatformStats } from "../../lib/cached-catalog";
import {
  directoryHeadline,
  formatBrandCountLabel,
  resolveShoppableBrandCount,
  searchBrandsPlaceholder,
} from "../../lib/catalog-stats-labels";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const [platformStats, brandStats] = await Promise.all([
    getCachedPlatformStats(),
    getCachedBrandStats(),
  ]);
  const listed = brandStats.filter((b) => b.count >= 2).length;
  const shoppableCount = resolveShoppableBrandCount(platformStats.brandCount, listed);
  const brandLabel = formatBrandCountLabel(shoppableCount);
  const title = `Brand Directory — ${brandLabel} Brands`;
  const description = `Browse ${brandLabel} fashion brands with live natural-fiber inventory. ${directoryHeadline(platformStats.productCount, shoppableCount)}`;
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function DesignersPage() {
  const [platformStats, brandStats] = await Promise.all([
    getCachedPlatformStats(),
    getCachedBrandStats(),
  ]);
  const shoppableBrands = brandStats.filter((b) => b.count >= 2);
  const shoppableBrandCount = resolveShoppableBrandCount(
    platformStats.brandCount,
    shoppableBrands.length
  );

  return (
    <div className="py-6 md:py-12 flex flex-col gap-8 md:gap-10 max-w-3xl mx-auto px-4 w-full">
      <header className="flex flex-col gap-3 md:gap-4">
        <h1
          className="text-3xl md:text-4xl font-serif"
          style={{ fontFamily: "Playfair Display, serif" }}
          data-testid="text-directory-title"
        >
          The Directory
        </h1>
        <p className="text-muted-foreground text-sm md:text-base" data-testid="text-directory-stats">
          {directoryHeadline(platformStats.productCount, shoppableBrandCount)}
        </p>
      </header>

      <DesignerSearchClient searchPlaceholder={searchBrandsPlaceholder(shoppableBrandCount)} />

      {shoppableBrands.length > 0 && (
        <section className="flex flex-col border-t border-border/20 pt-4" data-testid="section-brands-with-products">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-6">
            {shoppableBrands.length.toLocaleString()} live brands · A–Z
          </p>
          <ShoppableDesignersList brands={shoppableBrands} />
        </section>
      )}
    </div>
  );
}
