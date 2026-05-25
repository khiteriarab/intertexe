import Link from "next/link";
import { getBrandHeroImage } from "../../lib/brand-hero-images";
import type { FeaturedDesignerCard } from "../../lib/featured-designers";

function FeaturedBrandCard({ brand }: { brand: FeaturedDesignerCard }) {
  const src = brand.heroImageUrl || getBrandHeroImage(brand.name) || "";

  return (
    <Link
      href={`/designers/${brand.slug}`}
      className="group relative block aspect-[3/4] overflow-hidden bg-[#f0ece6]"
      data-testid={`card-featured-designer-${brand.slug}`}
    >
      {src ? (
        <img
          src={src}
          alt={`${brand.name} editorial`}
          className="absolute inset-0 h-full w-full object-cover object-top editorial-cover-img editorial-cover-img--top transition-transform duration-500 group-hover:scale-[1.02]"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <span className="font-serif text-lg text-neutral-300 tracking-[0.15em] uppercase text-center">
            {brand.name}
          </span>
        </div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 via-black/20 to-transparent pointer-events-none"
        aria-hidden
      />
      <div className="absolute bottom-3 left-3 right-3 z-[1] flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white font-medium">{brand.name}</p>
        {brand.productCount > 0 && (
          <span className="text-[9px] uppercase tracking-[0.14em] text-white/75">
            {brand.productCount.toLocaleString()} pcs
          </span>
        )}
      </div>
    </Link>
  );
}

export function FeaturedDesignersGrid({ brands }: { brands: FeaturedDesignerCard[] }) {
  if (brands.length === 0) return null;

  return (
    <section className="flex flex-col gap-5" data-testid="section-featured-designers">
      <h2 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        FEATURED DESIGNERS
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {brands.map((brand) => (
          <FeaturedBrandCard key={brand.slug} brand={brand} />
        ))}
      </div>
      <a
        href="#directory-az-list"
        className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors w-fit"
        data-testid="link-view-all-designers"
      >
        View all designers
      </a>
    </section>
  );
}
