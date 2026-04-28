import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { fetchShopProducts, fetchProductCount, fetchFiberCounts } from "../../lib/supabase-server";
import ShopClient from "./ShopClient";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Shop Natural Fabric Clothing — INTERTEXE",
  description: "Shop 15,000+ verified natural fabric clothing items. Filter by silk, linen, cotton, wool, cashmere. Every product verified for 80%+ natural fiber content across 11,000+ brands.",
  keywords: "shop natural fabric clothing, silk clothing, linen clothing, cotton clothing, wool clothing, cashmere clothing, verified natural fibers, INTERTEXE shop",
  alternates: { canonical: "https://www.intertexe.com/shop" },
};

const EU_UK_ME_COUNTRIES = new Set([
  "GB", "IE", "FR", "ES", "IT", "DE", "NL", "PT", "BE", "AT", "DK", "SE", "NO", "FI",
  "CH", "LU", "MC", "AE", "SA", "KW", "QA", "BH", "OM",
]);

function marketFromCountry(countryCode?: string | null): "us-ca" | "eu-uk-me" | undefined {
  const code = (countryCode || "").toUpperCase();
  if (code === "US" || code === "CA") return "us-ca";
  if (EU_UK_ME_COUNTRIES.has(code)) return "eu-uk-me";
  return undefined;
}

function detectCountryFromHeaders(headerList: Headers): string | undefined {
  return headerList.get("x-vercel-ip-country")
    || headerList.get("cf-ipcountry")
    || headerList.get("x-country-code")
    || headerList.get("x-geo-country")
    || undefined;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<{ market?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const detectedCountry = detectCountryFromHeaders(await headers());
  const detectedMarket = marketFromCountry(detectedCountry);
  const market = params?.market || detectedMarket;
  const [shopData, totalProductCount, fiberCounts] = await Promise.all([
    fetchShopProducts({ sort: "recommended", limit: 40, offset: 0, market }),
    fetchProductCount(),
    fetchFiberCounts(),
  ]);

  const products = shopData.products || [];

  return (
    <>
      <ShopClient
        initialProducts={products}
        initialTotal={shopData.total || 0}
        totalProductCount={totalProductCount}
        fiberCounts={fiberCounts}
        initialMarket={market}
        detectedCountry={detectedCountry}
      />

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-2xl md:text-3xl font-serif text-center mb-4">
          Shop Natural Fabric Clothing
        </h1>
        <p className="text-center text-muted-foreground text-sm max-w-2xl mx-auto mb-8 leading-relaxed">
          Browse {(totalProductCount || 0).toLocaleString()}+ clothing items verified for natural fiber quality. 
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
                  {p.image_url && <img src={p.image_url} alt={`${p.brand_name} ${p.name}`} className="aspect-[3/4] object-cover" loading="lazy" />}
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">{p.brand_name}</span>
                  <span className="text-xs">{p.name}</span>
                  {p.price && <span className="text-xs font-medium">{p.price}</span>}
                </Link>
              ))}
            </div>
          </noscript>
        )}
      </section>
    </>
  );
}
