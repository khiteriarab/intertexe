import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { CATALOG_INITIAL_PAGE } from "../../lib/catalog-rules";
import ShopClient from "./ShopClient";
import { formatListingPrice } from "../../lib/format-display-price";
import { getShopBrands, getShopMeta } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Shop Natural Fabric Clothing — INTERTEXE",
  description: "Shop natural fabric clothing in silk, linen, cotton, wool, and cashmere across curated luxury brands.",
  keywords: "shop natural fabric clothing, silk clothing, linen clothing, cotton clothing, wool clothing, cashmere clothing, verified natural fibers, INTERTEXE shop",
  alternates: { canonical: "https://www.intertexe.com/shop" },
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
  "knitwear", "tops", "dresses", "skirts", "bottoms", "outerwear", "lingerie", "swimwear",
]);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com";

const EMPTY_CATALOG = { products: [] as any[], total: 0, hasMore: false };

async function fetchShopCatalog(catalogParams: URLSearchParams) {
  try {
    const res = await fetch(`${SITE_URL}/api/catalog?${catalogParams}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return EMPTY_CATALOG;
    const data = await res.json();
    return {
      products: data.products || [],
      total: data.total ?? 0,
      hasMore: data.hasMore ?? false,
    };
  } catch {
    return EMPTY_CATALOG;
  }
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<{ market?: string; fiber?: string; category?: string; sort?: string; q?: string }>;
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

    const catalogParams = new URLSearchParams({
      region: "us",
      limit: String(CATALOG_INITIAL_PAGE),
      offset: "0",
    });
    if (fiber) catalogParams.set("fiber", fiber);
    if (category) catalogParams.set("category", category);
    if (sort && sort !== "recommended") catalogParams.set("sort", sort);
    if (search) catalogParams.set("q", search);

    const [shopData, meta, brands] = await Promise.all([
      fetchShopCatalog(catalogParams),
      getShopMeta().catch(() => ({ totalProductCount: 0, fiberCounts: {} as Record<string, number> })),
      getShopBrands().catch(() => [] as { slug: string; name: string; count: number }[]),
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
