import type { Metadata } from "next";
import Link from "next/link";
import {
  fetchDesignerBySlug,
  fetchProductsByBrand,
} from "../../../../lib/supabase-server";
import { getQualityTier, getTierColor, getTierAccent } from "../../../../lib/quality-tiers";
import { getCuratedScore } from "../../../../lib/curated-quality-scores";
import { getBrandProfile, getTierLabel } from "../../../../lib/brand-profiles";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const designer = await fetchDesignerBySlug(slug);
  const profile = getBrandProfile(slug);
  const name = designer?.name || profile?.name || slug;
  return {
    title: `${name} Quality Review | INTERTEXE`,
    description: profile?.intro || `Natural fiber score and material review for ${name}.`,
  };
}

export default async function DesignerAboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [dbDesigner, brandCatalog] = await Promise.all([
    fetchDesignerBySlug(slug),
    fetchProductsByBrand(slug, { limit: 200, offset: 0 }),
  ]);
  const products = brandCatalog.products;
  const profile = getBrandProfile(slug);

  if (!dbDesigner && !profile) {
    return (
      <div className="py-20 text-center">
        <Link href="/designers">Back to Directory</Link>
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
  const enrichedDesigner = {
    ...designer,
    naturalFiberPercent:
      computedFiberPercent ?? designer.naturalFiberPercent ?? profile?.naturalFiberEstimate ?? getCuratedScore(designer.name),
  };
  const tier = getQualityTier(enrichedDesigner.naturalFiberPercent);
  const aboutText =
    profile?.intro ||
    designer.description ||
    `${designer.name} is a fashion brand in our directory. Material composition details are being compiled by our editorial team.`;

  return (
    <div className="py-8 md:py-12 flex flex-col gap-8 max-w-4xl mx-auto w-full px-4">
      <Link
        href={`/designers/${slug}`}
        className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground w-fit"
      >
        ← Shop {designer.name}
      </Link>

      <header className="flex flex-col gap-4">
        <h1 className="text-3xl md:text-4xl font-serif">{designer.name}</h1>
        <span className={`px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-medium w-fit ${getTierColor(tier.tier)}`}>
          {tier.verdict}
        </span>
      </header>

      <div className={`flex flex-col gap-4 p-5 border-l-[3px] ${getTierAccent(tier.tier)} bg-secondary/30`}>
        <h3 className="text-xs uppercase tracking-[0.2em] font-medium">The INTERTEXE Verdict</h3>
        <p className="text-sm leading-relaxed">{tier.description}</p>
        <p className="text-sm italic text-foreground/70">{tier.buyingAdvice}</p>
      </div>

      <div className="flex flex-col gap-3 py-5 border-y border-border/40">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Natural Fiber Score</span>
        {enrichedDesigner.naturalFiberPercent != null ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-serif">{enrichedDesigner.naturalFiberPercent}%</span>
              <span className="text-sm text-muted-foreground italic">Natural Fibers</span>
            </div>
            <div className="w-full h-1.5 bg-secondary relative overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-foreground" style={{ width: `${enrichedDesigner.naturalFiberPercent}%` }} />
            </div>
          </>
        ) : null}
      </div>

      <p className="text-sm leading-relaxed text-foreground/80">{aboutText}</p>

      {profile && (
        <div className="flex flex-wrap gap-2">
          {profile.materialStrengths.map((mat) => (
            <span key={mat} className="px-3 py-1 text-[10px] uppercase tracking-wider bg-foreground text-background">
              {mat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
