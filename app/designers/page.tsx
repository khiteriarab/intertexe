import type { Metadata } from "next";
import Link from "next/link";
import { DesignerSearchClient } from "./DesignerSearchClient";
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
    <div className="py-6 md:py-12 flex flex-col gap-8 md:gap-10 max-w-2xl mx-auto px-4 w-full">
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
        <section className="flex flex-col border-t border-border/20 pt-2" data-testid="section-brands-with-products">
          <ul className="flex flex-col divide-y divide-border/20">
            {shoppableBrands.map((brand) => (
              <li key={brand.slug}>
                <Link
                  href={`/designers/${brand.slug}`}
                  className="flex items-center justify-between py-4 md:py-5 group active:opacity-70"
                  data-testid={`card-shoppable-${brand.slug}`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                    <span className="text-base md:text-lg font-serif group-hover:text-muted-foreground transition-colors truncate">
                      {brand.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {brand.count.toLocaleString()} products
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/designers/all"
            className="mt-8 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors py-3"
            data-testid="link-display-all-brands"
          >
            Display all brands A–Z
          </Link>
        </section>
      )}
    </div>
  );
}
