import type { Metadata } from "next";
import { fetchShopProducts, fetchProductCount } from "../../lib/supabase-server";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Shop Verified Products — Search by Fabric",
  description: "Search any clothing item and filter by fabric. 17,000+ products verified for natural fiber quality — silk, linen, cotton, wool, cashmere across 11,000+ brands.",
  alternates: { canonical: "https://www.intertexe.com/shop" },
};

export default async function ShopPage() {
  const [initialData, productCount] = await Promise.all([
    fetchShopProducts({ limit: 60, offset: 0, sort: "recommended" }),
    fetchProductCount(),
  ]);

  return (
    <ShopClient
      initialProducts={initialData.products}
      initialTotal={initialData.total}
      totalProductCount={productCount}
    />
  );
}
