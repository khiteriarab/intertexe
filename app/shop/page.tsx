import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { fetchShopProducts, CATALOG_INITIAL_PAGE } from "../../lib/supabase-server";
import ShopClient from "./ShopClient";
import { formatListingPrice } from "../../lib/format-display-price";

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

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<{ market?: string; fiber?: string; category?: string; sort?: string; q?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const detectedCountry = getDetectedCountry(await headers());
  const market =
    params?.market === "us-ca" || params?.market === "eu-uk-me" ? params.market : undefined;
  const fiber =
    params?.fiber && SHOP_FIBERS.has(params.fiber)
      ? params.fiber
      : !params?.fiber && !params?.category && !params?.q
        ? "silk"
        : undefined;
  const category =
    params?.category && SHOP_CATEGORIES.has(params.category) ? params.category : undefined;
  const sort =
    params?.sort === "new" || params?.sort === "price-high" || params?.sort === "price-low"
      ? params.sort
      : "recommended";
  const search = params?.q?.trim() || undefined;

  /** First page only — counts and fiber tabs load client-side (non-blocking). */
  const shopData = await fetchShopProducts({
    sort,
    limit: CATALOG_INITIAL_PAGE,
    offset: 0,
    market,
    fiber,
    category,
    search,
    skipTotal: true,
  });

  const products = shopData.products || [];

  return (
    <>
      <Suspense fallback={null}>
        <ShopClient
          initialProducts={products}
          initialHasMore={shopData.hasMore}
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
}
