import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { moodBySlug, MOOD_CATALOG } from "../../../lib/mood-commerce";
import { fetchCollectionPageData } from "../../../lib/supabase-server";
import { ProductLink } from "../../components/ProductLink";
import { formatDisplayPrice } from "../../../lib/format-display-price";
import { CatalogProductImage } from "../../components/CatalogProductImage";

export const revalidate = 300;

export function generateStaticParams() {
  return MOOD_CATALOG.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mood = moodBySlug(slug);
  if (!mood) return { title: "Mood" };
  return {
    title: `${mood.label} — Editorial Shopping`,
    description: mood.description,
  };
}

export default async function MoodPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mood = moodBySlug(slug);
  if (!mood) notFound();

  const data = await fetchCollectionPageData(mood.collection, { limit: 48, offset: 0 });
  const products = data?.products || [];
  const total = data?.catalogTotal || products.length;

  const terms = mood.searchTerms.map((t) => t.toLowerCase());
  const filtered = products.filter((p) => {
    const blob = `${p.name} ${p.category} ${p.composition}`.toLowerCase();
    return terms.some((t) => blob.includes(t));
  });
  const grid = filtered.length > 0 ? filtered : products;

  return (
    <div className="flex flex-col pb-24" data-testid={`page-mood-${slug}`}>
      <section className="relative -mx-4 md:-mx-8 min-h-[42vh] bg-[#111] text-white flex flex-col justify-end px-6 md:px-14 py-12 md:py-16">
        <p className="text-[10px] uppercase tracking-[0.32em] text-white/50 mb-2">{mood.kicker}</p>
        <h1 className="text-3xl md:text-5xl font-serif mb-3">{mood.label}</h1>
        <p className="text-sm md:text-base text-white/75 max-w-xl leading-relaxed">{mood.description}</p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mt-4">
          {total.toLocaleString()} pieces in {mood.collection.replace(/-/g, " ")} · mood filter applied
        </p>
      </section>

      <section className="py-8 md:py-12 px-0 md:px-0">
        <div className="flex flex-wrap gap-2 mb-8">
          {MOOD_CATALOG.slice(0, 8).map((m) => (
            <Link
              key={m.slug}
              href={`/moods/${m.slug}`}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] border ${
                m.slug === slug
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/40 text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {m.label}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {grid.map((product) => (
            <ProductLink key={product.id} href={`/product/${product.id}`} className="group flex flex-col">
              {product.imageUrl && (
                <CatalogProductImage
                  src={product.imageUrl}
                  alt={product.name || ""}
                  category={product.category || undefined}
                  name={product.name || undefined}
                />
              )}
              <div className="pt-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                  {product.brandName}
                </span>
                <h3 className="text-[11px] leading-snug text-muted-foreground line-clamp-2 mt-0.5">
                  {product.name}
                </h3>
                {product.price && (
                  <span className="text-[11px] mt-0.5 block">{formatDisplayPrice(product)}</span>
                )}
              </div>
            </ProductLink>
          ))}
        </div>

        <Link
          href={`/collections/${mood.collection}`}
          className="inline-flex items-center gap-2 mt-10 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          View full {mood.collection.replace(/-/g, " ")} collection →
        </Link>
      </section>
    </div>
  );
}
