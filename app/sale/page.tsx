import type { Metadata } from "next";
import { fetchSaleProducts } from "../../lib/supabase-server";
import SaleClient from "./SaleClient";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Natural Fiber Sale | Silk, Cashmere, Linen On Sale",
  description:
    "Shop sale pieces verified to contain natural fibers. Silk, cashmere, linen, wool and cotton from luxury brands at reduced prices.",
  alternates: {
    canonical: "https://www.intertexe.com/sale",
    languages: {
      en: "https://www.intertexe.com/sale",
      "en-US": "https://www.intertexe.com/sale",
      "en-GB": "https://www.intertexe.com/sale",
      "en-AU": "https://www.intertexe.com/sale",
      es: "https://www.intertexe.com/sale",
      "es-ES": "https://www.intertexe.com/sale",
      fr: "https://www.intertexe.com/sale",
      de: "https://www.intertexe.com/sale",
      it: "https://www.intertexe.com/sale",
      "x-default": "https://www.intertexe.com/sale",
    },
  },
};

export default async function SalePage() {
  const saleData = await fetchSaleProducts({ limit: 48, offset: 0, useMerchFeedPreview: false });
  const initialTotal = saleData.total ?? saleData.products?.length ?? 0;
  const initialHasMore = saleData.hasMore ?? false;

  return (
    <SaleClient
      initialProducts={saleData.products || []}
      initialTotal={initialTotal}
      initialHasMore={initialHasMore}
    />
  );
}
