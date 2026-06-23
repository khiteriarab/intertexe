import type { Metadata } from "next";
import Link from "next/link";
import {
  canonicalDesignerProductSlug,
  fetchDesignerBySlug,
  fetchProductsByBrand,
} from "../../../lib/supabase-server";
import { getCuratedScore } from "../../../lib/curated-quality-scores";
import { getBrandProfile } from "../../../lib/brand-profiles";
import { displayNaturalFiberPercent } from "../../../lib/display-natural-fiber";
import { DesignerShopSection } from "./DesignerShopSection";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const designer = await fetchDesignerBySlug(slug);
  const profile = getBrandProfile(slug);
  const name = designer?.name || profile?.name || slug;
  const description =
    profile?.intro || `Shop verified natural-fiber pieces from ${name} on INTERTEXE.`;
  return {
    title: `Shop ${name} | INTERTEXE`,
    description,
    openGraph: { title: `Shop ${name}`, description },
  };
}

/** Designer directory → shop grid (THE OUTNET-style). Quality review lives at /about. */
export default async function DesignerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const productSlug = canonicalDesignerProductSlug(slug);
  const [dbDesigner, brandCatalog] = await Promise.all([
    fetchDesignerBySlug(slug),
    fetchProductsByBrand(productSlug, { limit: 48, offset: 0 }),
  ]);
  const products = brandCatalog.products;
  const profile = getBrandProfile(slug);

  if (!dbDesigner && !profile) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-4 max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-serif">Designer not found</h1>
        <Link href="/designers" className="text-sm uppercase tracking-widest hover:text-muted-foreground">
          Back to Directory
        </Link>
      </div>
    );
  }

  const designer = dbDesigner || {
    name: profile!.name,
    slug: profile!.slug,
    description: profile!.intro || "",
    website: null,
    naturalFiberPercent: profile!.naturalFiberEstimate ?? null,
    logoUrl: null,
  };

  const productsWithFiber = products.filter((p) => p.naturalFiberPercent != null && p.naturalFiberPercent > 0);
  const computedFiberPercent =
    productsWithFiber.length > 0
      ? Math.round(productsWithFiber.reduce((sum, p) => sum + p.naturalFiberPercent, 0) / productsWithFiber.length)
      : null;
  const fiberPercent =
    computedFiberPercent ??
    designer.naturalFiberPercent ??
    profile?.naturalFiberEstimate ??
    getCuratedScore(designer.name);
  const scoreLabel = displayNaturalFiberPercent(fiberPercent);
  const visibleCount =
    brandCatalog.total != null && brandCatalog.total > 0
      ? brandCatalog.total
      : products.filter((p) => p.imageUrl).length;

  return (
    <div className="pb-24 md:pb-16 flex flex-col w-full">
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/designers"
              className="shrink-0 text-muted-foreground hover:text-foreground p-1"
              aria-label="Back to directory"
              data-testid="link-back"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-serif uppercase tracking-[0.04em] truncate" data-testid="text-designer-name">
                {designer.name}
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {visibleCount > 0 ? (
                  <>
                    <span className="text-foreground font-medium">{visibleCount.toLocaleString()} items</span>
                    {scoreLabel != null && (
                      <>
                        {" · "}
                        <span className="tabular-nums">{scoreLabel}% natural fibers</span>
                      </>
                    )}
                  </>
                ) : (
                  "No live pieces"
                )}
              </p>
            </div>
          </div>
          <Link
            href={`/designers/${slug}/about`}
            className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground border-b border-transparent hover:border-foreground pb-0.5"
          >
            About
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-6 md:pt-8">
        <DesignerShopSection
          products={products}
          designerName={designer.name}
          designerSlug={canonicalDesignerProductSlug(designer.slug || slug)}
          designerWebsite={designer.website}
          description={designer.description || null}
          naturalFiberPercent={fiberPercent}
          hasProfile={!!profile}
          profileMaterialStrengths={profile?.materialStrengths || []}
          initialHasMore={brandCatalog.hasMore}
          initialTotal={brandCatalog.total}
        />
      </div>
    </div>
  );
}
