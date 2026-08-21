import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase } from "../../lib/supabase-service-client";
import { queryCatalogBrowsePageV2 } from "../../lib/catalog-browse-v2";
import { SearchInput } from "./SearchInput";
import { SearchResultsBeacon } from "./SearchResultsBeacon";
import { ProductLink } from "../components/ProductLink";
import { CatalogProductImage } from "../components/CatalogProductImage";
import { formatDisplayPrice } from "../../lib/format-display-price";
import { cfProductCard } from "../../lib/cloudflare-images";
import { NOINDEX_FOLLOW } from "../../lib/seo-policy";

export const metadata: Metadata = {
  title: "Search",
  description: "Search verified natural-fiber fashion by brand, product, or composition.",
  alternates: { canonical: "https://www.intertexe.com/search" },
  robots: NOINDEX_FOLLOW,
};

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const query = (rawQ || "").trim();
  const supabase = getServerSupabase();

  let products: any[] = [];
  let designers: any[] = [];

  if (supabase && query.length >= 2) {
    const safe = query.replace(/[%_]/g, "");
    const [browse, designerResults] = await Promise.all([
      queryCatalogBrowsePageV2({
        region: "us",
        q: safe,
        limit: 48,
        offset: 0,
        sort: "new",
        apparelOnly: true,
      }),
      supabase
        .from("designers")
        .select("name, slug, hero_image, natural_fiber_percent")
        .ilike("name", `%${safe}%`)
        .limit(6)
        .then(({ data }) => data || []),
    ]);

    products = (browse.products || []).map((p) => ({
      id: p.id,
      name: p.name,
      brand_name: p.brandName,
      brand_slug: p.brandSlug,
      price: p.price,
      image_url: p.imageUrl,
      composition: p.composition,
      natural_fiber_percent: p.naturalFiberPercent,
      currency: undefined,
      listingRegion: p.listingRegion,
      productId: p.productId,
    }));
    designers = designerResults;
  }

  const resultCount = products.length + designers.length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 w-full">
      <SearchInput defaultValue={query} resultCount={resultCount} />
      {query.length >= 2 ? (
        <SearchResultsBeacon searchTerm={query} resultCount={resultCount} />
      ) : null}

      {query.length >= 2 && (
        <p className="text-xs text-muted-foreground mt-4 mb-8" data-testid="text-search-count">
          {resultCount} results for &ldquo;{query}&rdquo;
        </p>
      )}

      {query.length > 0 && query.length < 2 && (
        <p className="text-xs text-muted-foreground mt-4">Enter at least 2 characters to search.</p>
      )}

      {designers.length > 0 && (
        <div className="mb-12">
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground mb-4 uppercase">Brands</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {designers.map((d) => (
              <Link
                key={d.slug}
                href={`/designers/${d.slug}`}
                className="flex flex-col gap-2 border border-border/30 p-3 hover:border-foreground/40 transition-colors"
                data-testid={`search-designer-${d.slug}`}
              >
                <span className="text-xs uppercase tracking-widest font-medium">{d.name}</span>
                {d.natural_fiber_percent != null && (
                  <span className="text-[10px] text-muted-foreground">{d.natural_fiber_percent}% natural</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground mb-4 uppercase">Products</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductLink
                key={p.id}
                href={`/product/${p.id}`}
                className="group flex flex-col gap-2"
              >
                <div className="aspect-[3/4] bg-secondary/30 relative overflow-hidden">
                  {p.image_url ? (
                    <CatalogProductImage
                      src={cfProductCard(p.image_url)}
                      alt={p.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#f5f5f3]" />
                  )}
                </div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.brand_name}</p>
                <p className="text-sm font-serif line-clamp-2">{p.name}</p>
                {p.price && (
                  <p className="text-xs">
                    {formatDisplayPrice({
                      price: p.price,
                      currency: p.currency,
                      listingRegion: p.listingRegion,
                      productId: p.productId,
                    } as any)}
                  </p>
                )}
              </ProductLink>
            ))}
          </div>
        </div>
      )}

      {query.length >= 2 && resultCount === 0 && (
        <div className="mt-8 flex flex-col gap-3 max-w-lg">
          <p className="text-sm text-foreground" data-testid="text-search-empty">
            No products matched &ldquo;{query}&rdquo;. We did not change your search.
          </p>
          <p className="text-sm text-muted-foreground">
            Try a brand name, a fiber such as silk or linen, or a category such as dresses.
          </p>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest">
            <Link href="/materials" className="border-b border-foreground pb-0.5">Shop by fabric</Link>
            <Link href="/designers" className="border-b border-foreground pb-0.5">Designers</Link>
            <Link href="/guides" className="border-b border-foreground pb-0.5">Material guides</Link>
          </div>
        </div>
      )}
    </div>
  );
}
