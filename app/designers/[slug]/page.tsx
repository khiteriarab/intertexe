import type { Metadata } from "next";
import Link from "next/link";
import {
  fetchDesignerBySlug,
  fetchProductsByBrand,
  fetchAllDesignerSlugs,
} from "@/../../lib/supabase-server";
import { getQualityTier, getTierColor, getTierAccent } from "@/lib/quality-tiers";
import { getCuratedScore } from "@/lib/curated-quality-scores";
import { getBrandProfile, getTierLabel } from "@/lib/brand-profiles";
import { DesignerDetailProducts } from "./DesignerDetailProducts";

export const revalidate = 3600;

export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const designer = await fetchDesignerBySlug(slug);
  const profile = getBrandProfile(slug);
  if (!designer) {
    return { title: "Designer Not Found" };
  }
  const description = profile?.intro || designer.description || `Explore ${designer.name}'s commitment to natural fibers and material quality on INTERTEXE.`;
  return {
    title: `${designer.name} Quality Review 2026`,
    description,
    openGraph: {
      title: `${designer.name} Quality Review 2026`,
      description,
    },
  };
}

export default async function DesignerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [designer, products] = await Promise.all([
    fetchDesignerBySlug(slug),
    fetchProductsByBrand(slug),
  ]);

  if (!designer) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-4 max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-serif" style={{ fontFamily: "Playfair Display, serif" }}>Designer not found</h1>
        <Link href="/designers" className="border-b border-foreground pb-1 text-sm uppercase tracking-widest hover:text-muted-foreground transition-colors">
          Back to Directory
        </Link>
      </div>
    );
  }

  const profile = getBrandProfile(slug);
  const enrichedDesigner = designer.naturalFiberPercent == null
    ? { ...designer, naturalFiberPercent: getCuratedScore(designer.name) }
    : designer;
  const tier = getQualityTier(enrichedDesigner.naturalFiberPercent);

  const aboutText = profile?.intro
    || designer.description
    || `${designer.name} is a fashion brand in our directory. Material composition details are being compiled by our editorial team.`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.intertexe.com/" },
      { "@type": "ListItem", position: 2, name: "Designers", item: "https://www.intertexe.com/designers" },
      { "@type": "ListItem", position: 3, name: designer.name },
    ],
  };

  const organizationJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: designer.name,
    url: `https://www.intertexe.com/designers/${designer.slug}`,
  };
  const desc = profile?.intro || designer.description;
  if (desc) organizationJsonLd.description = desc;
  if (designer.website) organizationJsonLd.sameAs = designer.website;
  if (profile?.headquarters) {
    organizationJsonLd.address = {
      "@type": "PostalAddress",
      addressLocality: profile.headquarters,
    };
  }
  if (profile?.foundedYear) {
    organizationJsonLd.foundingDate = String(profile.foundedYear);
  }

  return (
    <div className="py-8 md:py-12 flex flex-col gap-10 md:gap-12 max-w-4xl mx-auto w-full px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />

      <Link href="/designers" className="flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground w-fit transition-colors active:scale-95" data-testid="link-back">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back to Directory
      </Link>

      <header className="flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-start w-full gap-3">
            <h1 className="text-3xl md:text-5xl font-serif leading-tight" style={{ fontFamily: "Playfair Display, serif" }} data-testid="text-designer-name">{designer.name}</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-medium ${getTierColor(tier.tier)}`}>
              {tier.verdict}
            </span>
            {profile && (
              <span className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border border-foreground/20 text-foreground/70">
                {getTierLabel(profile.tier)}
              </span>
            )}
          </div>
        </div>

        <div className={`flex flex-col gap-4 p-5 md:p-6 border-l-[3px] ${getTierAccent(tier.tier)} bg-secondary/30`} data-testid="section-verdict">
          <div className="flex items-center gap-2">
            <h3 className="text-xs uppercase tracking-[0.2em] font-medium">The INTERTEXE Verdict</h3>
          </div>
          <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{tier.description}</p>
          <p className="text-sm text-foreground/70 italic">{tier.buyingAdvice}</p>
        </div>

        <div className="flex flex-col gap-3 py-5 md:py-6 border-y border-border/40">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Natural Fiber Score</span>
          {enrichedDesigner.naturalFiberPercent != null ? (
            <>
              <div className="flex items-baseline gap-2 md:gap-3">
                <span className="text-4xl md:text-6xl font-serif" style={{ fontFamily: "Playfair Display, serif" }}>{enrichedDesigner.naturalFiberPercent}%</span>
                <span className="text-sm text-muted-foreground font-serif italic">Natural Fibers</span>
              </div>
              <div className="w-full h-1.5 md:h-2 bg-secondary mt-1 relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-foreground transition-all duration-700"
                  style={{ width: `${enrichedDesigner.naturalFiberPercent}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-serif text-muted-foreground/60">--</span>
              <span className="text-sm text-muted-foreground">Score pending review</span>
            </div>
          )}
        </div>

        {profile && (
          <div className="flex flex-col gap-5 py-5 md:py-6 border-y border-border/40" data-testid="section-brand-profile">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.15em] font-medium bg-foreground/5 border border-border/30" data-testid="badge-brand-tier">
                {getTierLabel(profile.tier)}
              </span>
              {profile.priceRange && (
                <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.1em] text-muted-foreground border border-border/20" data-testid="text-price-range">
                  {profile.priceRange}
                </span>
              )}
              {profile.headquarters && (
                <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.1em] text-muted-foreground border border-border/20" data-testid="text-headquarters">
                  {profile.headquarters}
                </span>
              )}
              {profile.foundedYear && (
                <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.1em] text-muted-foreground border border-border/20" data-testid="text-founded">
                  Est. {profile.foundedYear}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Material Strengths</span>
              <div className="flex flex-wrap gap-2" data-testid="section-material-strengths">
                {profile.materialStrengths.map((mat) => (
                  <span
                    key={mat}
                    className="px-3 py-1.5 text-[10px] md:text-xs uppercase tracking-[0.1em] font-medium bg-foreground text-background"
                    data-testid={`tag-material-${mat.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {mat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">About {designer.name}</span>
          <p className="text-sm md:text-base text-foreground/80 leading-relaxed font-light">
            {aboutText}
          </p>
        </div>

        {designer.website && (
          <Link
            href={`/leaving?url=${encodeURIComponent(designer.website)}&brand=${encodeURIComponent(designer.name)}`}
            className="flex items-center justify-center gap-3 w-full bg-foreground text-background px-8 py-[14px] md:py-4 uppercase tracking-widest text-xs hover:bg-foreground/90 transition-colors active:scale-[0.98] mt-2"
            data-testid={`link-shop-${designer.slug}`}
          >
            Shop {designer.name}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
          </Link>
        )}
      </header>

      <DesignerDetailProducts
        products={products}
        designerName={designer.name}
        designerSlug={designer.slug}
        designerWebsite={designer.website}
        hasProfile={!!profile}
        profileMaterialStrengths={profile?.materialStrengths || []}
      />
    </div>
  );
}
