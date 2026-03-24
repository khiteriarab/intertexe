import type { Metadata } from "next";
import { fetchShopProducts, fetchProductCount, fetchFiberCounts } from "../../lib/supabase-server";
import ShopClient from "./ShopClient";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Shop Verified Products — Search by Fabric",
  description: "Search any clothing item and filter by fabric. 17,000+ products verified for natural fiber quality — silk, linen, cotton, wool, cashmere across 11,000+ brands.",
  alternates: { canonical: "https://www.intertexe.com/shop" },
};

export default async function ShopPage() {
  const [shopData, totalProductCount, fiberCounts] = await Promise.all([
    fetchShopProducts({ sort: "recommended", limit: 60, offset: 0 }),
    fetchProductCount(),
    fetchFiberCounts(),
  ]);

  return (
    <ShopClient
      initialProducts={shopData.products || []}
      initialTotal={shopData.total || 0}
      totalProductCount={totalProductCount}
      fiberCounts={fiberCounts}
    />
  );
}
