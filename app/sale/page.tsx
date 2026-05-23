import type { Metadata } from "next";
import { getCachedSalePageData } from "../../lib/cached-catalog";
import SaleClient from "./SaleClient";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "The Edit — On Sale | INTERTEXE",
  description: "Verified natural-fiber fashion on sale. Shop discounted silk, linen, cotton, wool, and cashmere from curated luxury brands.",
  alternates: { canonical: "https://www.intertexe.com/sale" },
};

export default async function SalePage() {
  const saleData = await getCachedSalePageData();

  return (
    <SaleClient
      initialProducts={saleData.products || []}
      initialTotal={saleData.total}
      initialHasMore={saleData.hasMore}
    />
  );
}
