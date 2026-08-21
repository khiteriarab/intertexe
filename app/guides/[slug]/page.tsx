import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { guideBySlug, indexableGuides } from "../../../lib/seo-guides";
import { AFFILIATE_PAGE_DISCLOSURE, NOINDEX_FOLLOW, breadcrumbJsonLd } from "../../../lib/seo-policy";
import { fetchProductsByFiberAndCategory } from "../../../lib/supabase-server";
import { formatDisplayPrice } from "../../../lib/format-display-price";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return { title: "Guide", robots: NOINDEX_FOLLOW };
  const live = indexableGuides().some((g) => g.slug === slug);
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `https://www.intertexe.com/guides/${slug}` },
    robots: live ? undefined : NOINDEX_FOLLOW,
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `https://www.intertexe.com/guides/${slug}`,
      siteName: "INTERTEXE",
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();
  const live = indexableGuides().some((g) => g.slug === slug);
  if (!live) notFound();

  const products =
    guide.fiber
      ? (await fetchProductsByFiberAndCategory(guide.fiber, guide.category, 12, 0)).filter((p) => p.imageUrl).slice(0, 8)
      : [];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.h1,
    description: guide.description,
    datePublished: guide.publishAfter,
    dateModified: guide.lastReviewed,
    author: { "@type": "Organization", name: "INTERTEXE" },
    publisher: { "@type": "Organization", name: "INTERTEXE", url: "https://www.intertexe.com" },
    mainEntityOfPage: `https://www.intertexe.com/guides/${slug}`,
  };

  return (
    <article className="py-8 md:py-16 max-w-3xl mx-auto w-full flex flex-col gap-10 px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
        { name: guide.title },
      ])) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <header className="flex flex-col gap-4">
        <nav className="text-xs text-muted-foreground flex gap-2">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/guides" className="hover:text-foreground">Guides</Link>
          <span>/</span>
          <span className="text-foreground truncate">{guide.title}</span>
        </nav>
        <h1 className="text-3xl md:text-5xl font-serif">{guide.h1}</h1>
        <p className="text-sm text-muted-foreground">Last reviewed {guide.lastReviewed}</p>
      </header>

      <div className="flex flex-col gap-6 text-[15px] md:text-base text-foreground/80 leading-relaxed font-light">
        {guide.intro.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-serif text-foreground">What qualifies</h2>
          <p>{guide.qualifies}</p>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-serif text-foreground">Why the material matters</h2>
          <p>{guide.whyMaterial}</p>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-serif text-foreground">What to inspect</h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            {guide.inspect.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-serif text-foreground">Price and composition</h2>
          <p>{guide.priceContext}</p>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-serif text-foreground">How these pieces were selected</h2>
          <p>{guide.howSelected}</p>
        </section>
      </div>

      {products.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-serif">Examples from the catalog</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} className="flex flex-col gap-2">
                <div className="aspect-[3/4] bg-secondary overflow-hidden">
                  <img src={product.imageUrl} alt={`${product.name} by ${product.brandName}`} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{product.brandName}</p>
                <p className="text-xs font-serif line-clamp-2">{product.name}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{product.composition}</p>
                <p className="text-xs">{formatDisplayPrice(product)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Continue</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {guide.related.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="border-b border-foreground pb-0.5">{link.label}</Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-muted-foreground leading-relaxed">{AFFILIATE_PAGE_DISCLOSURE}</p>
    </article>
  );
}
