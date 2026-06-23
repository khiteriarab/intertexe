import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { CATALOG_INITIAL_PAGE } from "../../lib/catalog-rules";
import { CATALOG_STATS } from "../../lib/catalog-stats";
import ShopClient from "./ShopClient";
import { formatListingPrice } from "../../lib/format-display-price";
import { getShopBrands, getShopMeta } from "./actions";
import { getCachedCatalogStatsMemo, getShopCatalogKnownTotal } from "../../lib/cached-catalog-stats";
import { queryLiveCatalog } from "../../lib/catalog-direct-query";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop Natural Fiber Clothing | Silk, Cashmere, Linen, Wool",
  description:
    `Shop ${CATALOG_STATS.productCountFormatted} verified natural fiber pieces. Silk dresses, cashmere knitwear, linen tops, wool trousers and cotton basics from Zimmermann, Isabel Marant, Toteme and ${CATALOG_STATS.brandCountFormatted} luxury brands.`,
  keywords:
    "shop natural fabric clothing, silk clothing, linen clothing, cotton clothing, wool clothing, cashmere clothing, verified natural fibers, INTERTEXE shop",
  alternates: {
    canonical: "https://www.intertexe.com/shop",
    languages: {
      en: "https://www.intertexe.com/shop",
      "en-US": "https://www.intertexe.com/shop",
      "en-GB": "https://www.intertexe.com/shop",
      "en-AU": "https://www.intertexe.com/shop",
      es: "https://www.intertexe.com/shop",
      "es-ES": "https://www.intertexe.com/shop",
      fr: "https://www.intertexe.com/shop",
      de: "https://www.intertexe.com/shop",
      it: "https://www.intertexe.com/shop",
      "x-default": "https://www.intertexe.com/shop",
    },
  },
};

function getDetectedCountry(headerList: Headers) {
  return (
    headerList.get("x-vercel-ip-country") ||
    headerList.get("cf-ipcountry") ||
    headerList.get("x-country-code") ||
    headerList.get("x-geo-country") ||
    undefined
  );
}

const SHOP_FIBERS = new Set(["cashmere", "silk", "wool", "cotton", "linen", "leather"]);
const SHOP_CATEGORIES = new Set([
  "knitwear", "tops", "dresses", "skirts", "trousers", "outerwear", "jumpsuits", "lingerie", "swimwear",
]);

const EMPTY_CATALOG = { products: [] as any[], total: 0, hasMore: false };

async function loadShopCatalog(opts: {
  fiber?: string;
  category?: string;
  sort: string;
  search?: string;
  color?: string;
  fiberSubtype?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  try {
    const result = await queryLiveCatalog({
      region: "us",
      limit: CATALOG_INITIAL_PAGE,
      offset: 0,
      fiber: opts.fiber,
      category: opts.category,
      search: opts.search,
      sort: opts.sort === "recommended" ? "new" : opts.sort,
      color: opts.color,
      fiberSubtype: opts.fiberSubtype,
      brand: opts.brand,
      minPrice: opts.minPrice,
      maxPrice: opts.maxPrice,
    });

    const isUnfiltered =
      !opts.fiber &&
      !opts.category &&
      !opts.search &&
      !opts.color &&
      !opts.fiberSubtype &&
      !opts.brand &&
      opts.minPrice == null &&
      opts.maxPrice == null;

    let total = result.total ?? 0;
    if (isUnfiltered) {
      total = await getShopCatalogKnownTotal();
    }

    return {
      products: result.products || [],
      total,
      hasMore: result.hasMore ?? false,
    };
  } catch {
    return EMPTY_CATALOG;
  }
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<{
    market?: string;
    fiber?: string;
    category?: string;
    sort?: string;
    q?: string;
    color?: string;
    fiberSubtype?: string;
    price?: string;
    brands?: string;
  }>;
}) {
  try {
    const params = searchParams ? await searchParams : {};
    const detectedCountry = getDetectedCountry(await headers());
    const fiber =
      params?.fiber && SHOP_FIBERS.has(params.fiber)
        ? params.fiber
        : undefined;
    const category =
      params?.category && SHOP_CATEGORIES.has(params.category) ? params.category : undefined;
    const sort =
      params?.sort === "new" || params?.sort === "price-high" || params?.sort === "price-low"
        ? params.sort
        : "recommended";
    const search = params?.q?.trim() || undefined;
    const color = params?.color?.trim() || undefined;
    const fiberSubtype = params?.fiberSubtype?.trim() || undefined;
    const price = params?.price?.trim() || undefined;
    const brand = params?.brands?.split(",")[0]?.trim() || undefined;

    let minPrice: number | undefined;
    let maxPrice: number | undefined;
    if (price && price !== "any") {
      if (price === "2500plus" || price === "600plus") minPrice = 2500;
      else if (price === "200") maxPrice = 200;
      else if (price === "500") {
        minPrice = 200;
        maxPrice = 500;
      } else if (price === "1000") {
        minPrice = 500;
        maxPrice = 1000;
      } else if (price === "2500") {
        minPrice = 1000;
        maxPrice = 2500;
      }
    }

    const [shopData, meta, brands, catalogStats] = await Promise.all([
      loadShopCatalog({
        fiber,
        category,
        sort,
        search,
        color,
        fiberSubtype,
        brand,
        minPrice,
        maxPrice,
      }),
      getShopMeta().catch(() => ({ totalProductCount: 0, fiberCounts: {} as Record<string, number> })),
      getShopBrands().catch(() => [] as { slug: string; name: string; count: number }[]),
      getCachedCatalogStatsMemo().catch(() => ({
        catalogProductCount: 0,
        brandCount: 0,
        updatedAt: null,
        source: "fallback" as const,
      })),
    ]);

    const products = shopData.products || [];

    return (
      <>
        <Suspense fallback={null}>
          <ShopClient
            initialProducts={products}
            initialTotal={shopData.total > 0 ? shopData.total : undefined}
            initialHasMore={shopData.hasMore ?? true}
            initialMeta={meta}
            prefetchedBrands={brands}
            detectedCountry={detectedCountry}
            catalogKnownTotal={catalogStats.catalogProductCount > 0 ? catalogStats.catalogProductCount : undefined}
          />
        </Suspense>

        {products.length > 0 && (
          <noscript className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.slice(0, 16).map((p: any) => (
                <Link key={p.id} href={`/product/${p.id}`} className="flex flex-col">
                  {p.imageUrl && <img src={p.imageUrl} alt={`${p.brandName} ${p.name}`} className="aspect-[3/4] object-cover" loading="lazy" />}
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">{p.brandName}</span>
                  <span className="text-xs">{p.name}</span>
                  {p.price && (
                    <span className="text-xs font-medium">
                      {formatListingPrice(p.price, {
                        listingRegion: p.listingRegion,
                        productId: p.productId,
                      })}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </noscript>
        )}
      </>
    );
  } catch {
    return (
      <ShopClient
        initialProducts={[]}
        initialTotal={0}
        initialHasMore={false}
        initialMeta={{ totalProductCount: 0, fiberCounts: {} }}
        prefetchedBrands={[]}
      />
    );
  }
}
