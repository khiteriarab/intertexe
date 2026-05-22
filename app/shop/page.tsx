import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { fetchShopProducts, fetchProductCount } from "../../lib/supabase-server";
import ShopClient from "./ShopClient";
import { formatListingPrice } from "../../lib/format-display-price";

export const revalidate = 60;

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

const SHOP_FIBERS = new Set(["cashmere", "silk", "wool", "cotton", "linen"]);
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
  const fiber = params?.fiber && SHOP_FIBERS.has(params.fiber) ? params.fiber : undefined;
  const category =
    params?.category && SHOP_CATEGORIES.has(params.category) ? params.category : undefined;
  const sort =
    params?.sort === "new" || params?.sort === "price-high" || params?.sort === "price-low"
      ? params.sort
      : "recommended";
  const [shopData, totalProductCount] = await Promise.all([
    fetchShopProducts({
      sort,
      limit: 32,
      offset: 0,
      market,
      fiber,
      category,
      search: params?.q?.trim() || undefined,
    }),
    fetchProductCount(),
  ]);
  const fiberCounts: Record<string, number> = {};

  const products = shopData.products || [];

  return (
    <>
      <Suspense fallback={null}>
        <ShopClient
          initialProducts={products}
          initialTotal={shopData.total || 0}
          totalProductCount={totalProductCount}
          fiberCounts={fiberCounts}
          detectedCountry={detectedCountry}
        />
      </Suspense>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-2xl md:text-3xl font-serif text-center mb-4">
          Shop Natural Fabric Clothing
        </h1>
        <p className="text-center text-muted-foreground text-sm max-w-2xl mx-auto mb-8 leading-relaxed">
          Browse {(totalProductCount || 0).toLocaleString()}+ natural-fiber clothing items. 
          Filter by fabric type — silk, cashmere, linen, wool, or cotton — and shop with confidence knowing 
          every product contains 80% or more natural fibers.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { name: "Silk", href: "/shop?fiber=silk", count: fiberCounts?.silk },
            { name: "Cotton", href: "/shop?fiber=cotton", count: fiberCounts?.cotton },
            { name: "Linen", href: "/shop?fiber=linen", count: fiberCounts?.linen },
            { name: "Wool", href: "/shop?fiber=wool", count: fiberCounts?.wool },
            { name: "Cashmere", href: "/shop?fiber=cashmere", count: fiberCounts?.cashmere },
          ].map((f) => (
            <Link key={f.name} href={f.href} className="text-center py-3 border border-border/30 hover:border-foreground/20 transition-colors">
              <span className="text-xs md:text-sm font-medium">{f.name}</span>
              {f.count != null && <span className="block text-[10px] text-muted-foreground mt-0.5">{f.count.toLocaleString()} items</span>}
            </Link>
          ))}
        </div>

        {products.length > 0 && (
          <noscript>
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
      </section>
    </>
  );
}
