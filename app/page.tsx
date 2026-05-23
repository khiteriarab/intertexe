import type { Metadata } from "next";
import Link from "next/link";
import { getCachedHomePageData } from "../lib/homepage-data";
import { getCachedBrandStats, getCachedPlatformStats } from "../lib/cached-catalog";
import {
  formatBrandCountLabel,
  formatProductCountLabel,
  GENERIC_SITE_DESCRIPTION,
  resolveShoppableBrandCount,
} from "../lib/catalog-stats-labels";
import { HomePageContent } from "./components/HomeClient";

/** Cached editorial homepage — rails precomputed in Supabase, stats cached server-side. */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [platformStats, brandStats] = await Promise.all([
    getCachedPlatformStats(),
    getCachedBrandStats(),
  ]);
  const shoppableBrands = resolveShoppableBrandCount(
    platformStats.brandCount,
    brandStats.filter((b) => b.count >= 2).length
  );
  const description =
    platformStats.productCount > 0 && shoppableBrands > 0
      ? `INTERTEXE is the luxury fashion search engine for natural fabrics. Shop ${formatProductCountLabel(platformStats.productCount)} verified silk, cashmere, linen, wool, and cotton clothing across ${formatBrandCountLabel(shoppableBrands)} brands.`
      : GENERIC_SITE_DESCRIPTION;
  return {
    title: "INTERTEXE | The Luxury Fashion Search Engine for Natural Fabrics",
    description,
    keywords: "INTERTEXE, intertexe, natural fiber fashion, shop by fabric, silk clothing, cashmere clothing, linen clothing, wool clothing, cotton clothing, luxury fashion, natural fabric clothing, sustainable fashion",
    alternates: { canonical: "https://www.intertexe.com" },
  };
}

export default async function HomePage() {
  const data = await getCachedHomePageData();

  return (
    <>
      <HomePageContent initialData={data} />

      <div className="sr-only" aria-hidden="false">
        <section>
          <h1>INTERTEXE — The Fashion Search Engine for Natural Fabrics</h1>
          <p>
            INTERTEXE makes it easy to shop luxury fashion by fabric. Browse thousands of verified clothing items across curated brands,
            all filtered by natural fiber content. Every product is verified to contain 80% or more natural fibers — silk, cashmere, linen, wool, and cotton.
          </p>

          <h2>Shop by Fabric</h2>
          <nav>
            <Link href="/materials/silk">Silk Clothing</Link>
            <Link href="/materials/cashmere">Cashmere Clothing</Link>
            <Link href="/materials/linen">Linen Clothing</Link>
            <Link href="/materials/wool">Wool Clothing</Link>
            <Link href="/materials/cotton">Cotton Clothing</Link>
          </nav>

          <h2>Shop by Category</h2>
          <nav>
            <Link href="/materials/silk-dresses">Silk Dresses</Link>
            <Link href="/materials/cashmere-sweaters">Cashmere Sweaters</Link>
            <Link href="/materials/linen-pants">Linen Pants</Link>
            <Link href="/materials/cotton-shirts">Cotton Shirts</Link>
            <Link href="/materials/wool-coats">Wool Coats</Link>
            <Link href="/materials/silk-blouses">Silk Blouses</Link>
            <Link href="/materials/linen-dresses">Linen Dresses</Link>
            <Link href="/materials/cotton-dresses">Cotton Dresses</Link>
          </nav>

          <h2>Top Natural Fiber Brands</h2>
          <p>Explore designers ranked by verified natural fiber content.</p>
          <Link href="/designers">Brand directory</Link>

          <h2>How INTERTEXE Works</h2>
          <p>Every product on INTERTEXE is verified to contain 80% or more natural fibers. We analyze fabric composition data so you can shop with confidence.</p>
          <p>Filter clothing by the fabric that matters to you — silk, cashmere, linen, wool, or cotton. Find exactly what you are looking for by material.</p>
          <p>Every brand is scored based on their average natural fiber content. See at a glance which brands prioritize quality natural materials.</p>

          <Link href="/shop">Shop All Products</Link>
          <Link href="/materials">Explore Fabrics</Link>
          <Link href="/designers">Brand Directory</Link>
        </section>
      </div>
    </>
  );
}
