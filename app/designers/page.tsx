import type { Metadata } from "next";
import { DesignersDirectoryClient } from "./DesignersDirectoryClient";
import { getCachedBrandStats } from "../../lib/cached-catalog";
import {
  formatBrandCountLabel,
  resolveShoppableBrandCount,
  searchBrandsPlaceholder,
} from "../../lib/catalog-stats-labels";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const brandStats = await getCachedBrandStats();
  const listed = brandStats.filter((b) => b.count >= 2).length;
  const shoppableCount = listed;
  const brandLabel = formatBrandCountLabel(shoppableCount);
  const title = `Designers — ${brandLabel} Natural Fiber Brands`;
  const description = `Browse ${brandLabel} fashion brands with verified natural-fiber inventory — silk, linen, cotton, wool, and cashmere.`;
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function DesignersPage() {
  const brandStats = await getCachedBrandStats();
  const shoppableBrands = brandStats.filter((b) => b.count >= 2);
  const shoppableBrandCount = resolveShoppableBrandCount(0, shoppableBrands.length);

  return (
    <div className="py-8 md:py-14 flex flex-col max-w-6xl mx-auto px-4 md:px-8 w-full" data-testid="page-designers">
      <header className="flex flex-col gap-2 md:gap-3 mb-8 md:mb-10 max-w-3xl">
        <h1
          className="text-[36px] md:text-[48px] font-serif leading-[1.05]"
          style={{ fontFamily: "Playfair Display, serif" }}
          data-testid="text-directory-title"
        >
          Designers
        </h1>
        <p className="text-muted-foreground text-sm md:text-[15px]" data-testid="text-directory-stats">
          {shoppableBrandCount > 0
            ? `${shoppableBrandCount.toLocaleString()} brands with live natural-fiber inventory.`
            : "Natural fiber brands with live inventory."}
        </p>
      </header>

      {shoppableBrands.length > 0 ? (
        <DesignersDirectoryClient
          brands={shoppableBrands}
          searchPlaceholder={searchBrandsPlaceholder(shoppableBrandCount)}
        />
      ) : (
        <p className="text-muted-foreground text-sm py-12">Directory is updating — check back shortly.</p>
      )}
    </div>
  );
}
