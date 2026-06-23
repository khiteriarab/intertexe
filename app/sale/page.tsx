import type { Metadata } from "next";
import { getCachedSalePageData } from "../../lib/cached-catalog";
import { CATALOG_STATS } from "../../lib/catalog-stats";
import SaleClient from "./SaleClient";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Natural Fiber Sale | Silk, Cashmere, Linen On Sale",
  description:
    `Shop sale pieces from ${CATALOG_STATS.brandCountFormatted} luxury brands verified to contain natural fibers. Silk, cashmere, linen, wool and cotton at reduced prices.`,
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
  const saleData = await getCachedSalePageData();
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
