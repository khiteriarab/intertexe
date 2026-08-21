import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchFootwearCatalogPage } from "../../../lib/footwear-catalog";
import { parseShoeMaterial, parseShoeType } from "../../../lib/footwear-filters";
import { ShoesClient } from "./ShoesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Natural Leather & Suede Shoes",
  description:
    "Shop verified natural leather and suede footwear — sandals, heels, boots and more with composition checked.",
  alternates: { canonical: "https://www.intertexe.com/shop/shoes" },
};

/** Fast shoes PLP — footwear_catalog_page / live_products_footwear only (no apparel browse). */
export default async function ShoesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; material?: string }>;
}) {
  const params = await searchParams;
  const type = parseShoeType(params.type);
  const material = parseShoeMaterial(params.material);
  const { products, hasMore } = await fetchFootwearCatalogPage({
    region: "us",
    limit: 24,
    offset: 0,
    type,
    material,
  });

  return (
    <Suspense fallback={null}>
      <ShoesClient
        initialProducts={products}
        initialHasMore={hasMore}
        initialType={type}
        initialMaterial={material}
      />
    </Suspense>
  );
}
