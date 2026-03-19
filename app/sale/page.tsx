import type { Metadata } from "next";
import { fetchSaleProducts } from "../../lib/supabase-server";
import SaleClient from "./SaleClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Edit — On Sale | INTERTEXE",
  description: "Verified natural-fiber fashion on sale. Shop discounted silk, linen, cotton, wool, and cashmere from curated luxury brands.",
  alternates: { canonical: "https://www.intertexe.com/sale" },
};

export default async function SalePage() {
  const saleData = await fetchSaleProducts({ limit: 60, offset: 0 });

  return (
    <SaleClient
      initialProducts={saleData.products || []}
      initialTotal={saleData.total || 0}
    />
  );
}
