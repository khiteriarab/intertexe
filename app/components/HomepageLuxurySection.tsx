"use client";

import Link from "next/link";
import { EditorialHeroImage } from "./EditorialHeroImage";
import { editorialHeroForSlug } from "../../lib/editorial-assets";
import { getBrandHeroImage } from "../../lib/brand-hero-images";
import { cfHomepageRail } from "../../lib/cloudflare-images";
import { ProductLink } from "./ProductLink";
import { CatalogProductImage } from "./CatalogProductImage";
import { formatDisplayPrice } from "../../lib/format-display-price";
import {
  HORIZONTAL_RAIL_BLEED_CLASS,
  HORIZONTAL_RAIL_BLEED_WRAPPER_CLASS,
} from "../../lib/horizontal-rail";

function LuxuryProductCard({ product, eager }: { product: any; eager?: boolean }) {
  const brandName = product.brandName || "";
  const price = formatDisplayPrice(product);
  const imageUrl = product.imageUrl ? cfHomepageRail(product.imageUrl) : "";

  return (
    <ProductLink
      href={`/product/${product.id}`}
      className="group flex w-[148px] md:w-[168px] flex-shrink-0 flex-col gap-2.5"
      data-testid={`product-home-${product.id}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#f4f4f2]">
        {imageUrl ? (
          <CatalogProductImage
            src={imageUrl}
            alt={product.name || brandName}
            category={product.category}
            name={product.name}
            eager={eager}
            sizes="168px"
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5 px-0.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-neutral-900 line-clamp-1">
          {brandName}
        </span>
        <span className="text-[12px] font-normal text-neutral-700">{price}</span>
      </div>
    </ProductLink>
  );
}

/** NAP / Mytheresa-style split: serif copy left, product rail right. */
export function HomepageNewInSection({ products }: { products: any[] }) {
  const railProducts = (products || []).slice(0, 12);

  return (
    <section
      className="border-t border-neutral-200/80 bg-white"
      data-testid="homepage-new-in-section"
    >
      <div className="mx-auto w-full max-w-7xl px-6 md:px-12 py-14 md:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,300px)_1fr] lg:gap-14 lg:items-start">
          <div className="flex flex-col gap-4 lg:pt-1">
            <p className="text-[11px] font-normal uppercase tracking-[0.2em] text-neutral-400">
              Just landed
            </p>
            <h2 className="font-serif text-[32px] md:text-[40px] font-light leading-[1.08] text-neutral-900">
              New In
            </h2>
            <p className="text-sm font-light leading-relaxed text-neutral-500 max-w-sm">
              The latest natural-fiber pieces — silk, linen, cashmere and wool — verified and added daily.
            </p>
            <Link
              href="/shop?sort=new"
              className="mt-3 inline-flex w-fit items-center justify-center bg-neutral-900 px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white transition-colors hover:bg-neutral-800"
            >
              Shop new arrivals
            </Link>
          </div>

          <div className={HORIZONTAL_RAIL_BLEED_WRAPPER_CLASS}>
            <div className={`${HORIZONTAL_RAIL_BLEED_CLASS} gap-4 md:gap-5 min-h-[220px]`}>
              {railProducts.length > 0 ? (
                railProducts.map((product: any, i: number) => (
                  <LuxuryProductCard key={product.id} product={product} eager={i < 4} />
                ))
              ) : (
                <p className="text-sm font-light text-neutral-400 py-8">
                  New arrivals are loading — visit the shop for the full edit.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Mytheresa “Finest Edit” — centered serif title, minimal cards. */
export function HomepageBrandsSection({ designers }: { designers: any[] }) {
  if (!designers.length) return null;

  return (
    <section
      className="border-t border-neutral-200/80 bg-white py-14 md:py-20"
      data-testid="homepage-brands-section"
    >
      <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-[28px] md:text-[32px] font-light text-neutral-900">
            Brands we love
          </h2>
          <Link
            href="/designers"
            className="mt-3 inline-block text-sm text-neutral-800 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-800"
            data-testid="link-brands-view-all"
          >
            See all
          </Link>
        </div>

        <div className="horizontal-rail flex gap-5 md:gap-6 overflow-x-auto pb-1 -mx-6 px-6 md:mx-0 md:px-0">
          {designers.slice(0, 6).map((designer: { id?: string; slug: string; name: string; heroImageUrl?: string }) => {
            const imageUrl = designer.heroImageUrl || getBrandHeroImage(designer.name) || "";
            return (
              <Link
                key={designer.slug}
                href={`/designers/${designer.slug}`}
                className="group flex w-[140px] md:w-[160px] flex-shrink-0 flex-col gap-3"
                data-testid={`card-designer-${designer.id ?? designer.slug}`}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#f4f4f2]">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={designer.name}
                      className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-neutral-900">
                  {designer.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Editorial collection — copy above, restrained image below. */
export function HomepageCollectionPanel({
  href,
  kicker,
  title,
  cta,
  imageUrl,
  slug,
  testId,
}: {
  href: string;
  kicker: string;
  title: string;
  cta: string;
  imageUrl: string;
  slug?: string;
  testId: string;
}) {
  return (
    <section className="border-t border-neutral-200/80 bg-white" data-testid={testId}>
      <div className="mx-auto w-full max-w-7xl px-6 md:px-12 py-12 md:py-16">
        <div className="mb-8 max-w-lg">
          <p className="text-[11px] font-normal uppercase tracking-[0.2em] text-neutral-400 mb-2">
            {kicker}
          </p>
          <h2 className="font-serif text-[28px] md:text-[36px] font-light leading-[1.1] text-neutral-900 mb-4">
            {title}
          </h2>
          <Link
            href={href}
            className="text-sm text-neutral-800 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-800"
          >
            {cta}
          </Link>
        </div>

        <Link
          href={href}
          className="group relative block w-full overflow-hidden bg-[#f0efec] aspect-[16/10] md:aspect-[2/1] max-h-[min(56vw,480px)]"
        >
          {imageUrl && (
            <EditorialHeroImage
              src={imageUrl}
              alt={title}
              variant="panel"
              slug={slug}
              title={title}
              hoverZoom
              className="absolute inset-0 h-full w-full"
            />
          )}
        </Link>
      </div>
    </section>
  );
}

export function HomepageSaleSection() {
  return (
    <HomepageCollectionPanel
      href="/sale"
      kicker="Reduced"
      title="The Edit"
      cta="Shop sale — natural fibers, now less"
      imageUrl={editorialHeroForSlug("cashmere")}
      slug="cashmere"
      testId="homepage-sale-section"
    />
  );
}
