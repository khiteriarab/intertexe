import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchFootwearCatalogPage } from "../../../lib/footwear-catalog";
import { ShoesClient } from "./ShoesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Natural Leather & Suede Shoes",
  description:
    "Shop verified natural leather and suede footwear — sandals, heels, boots and more with composition checked.",
  alternates: { canonical: "https://www.intertexe.com/shop/shoes" },
};

/** Fast shoes PLP — footwear_catalog_page / live_products_footwear only (no apparel browse). */
export default async function ShoesPage() {
  const { products, hasMore } = await fetchFootwearCatalogPage({
    region: "us",
    limit: 24,
    offset: 0,
  });

  return (
    <Suspense fallback={null}>
      <ShoesClient initialProducts={products} initialHasMore={hasMore} />
    </Suspense>
  );
}
