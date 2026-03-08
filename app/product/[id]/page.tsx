import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, ShoppingBag, Leaf, ArrowRight } from "lucide-react";
import {
  fetchProductById,
  fetchRelatedProducts,
  fetchAllProductIds,
} from "../../../lib/supabase-server";

export const revalidate = 86400;

export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProductById(id);
  if (!product) return { title: "Product Not Found" };

  const title = `${product.brandName} ${product.name}`;
  const description = `Shop ${product.brandName} ${product.name}${product.composition ? `. Composition: ${product.composition}.` : ""}${product.naturalFiberPercent != null ? ` ${product.naturalFiberPercent}% natural fiber.` : ""} Verified by INTERTEXE.`;

  return {
    title,
    description,
    alternates: { canonical: `https://www.intertexe.com/product/${id}` },
    openGraph: {
      title,
      description,
      url: `https://www.intertexe.com/product/${id}`,
      images: product.imageUrl ? [product.imageUrl] : undefined,
    },
  };
}

const FIBER_KNOWLEDGE: Record<string, { tip: string; care: string; slug: string }> = {
  silk: { tip: "Look for mulberry silk or charmeuse — they're the highest quality weaves. Silk blends under 70% often lose the lustre and drape you're paying for.", care: "Hand wash cold or dry clean. Never wring — roll in a towel to dry.", slug: "silk" },
  cotton: { tip: "Pima, Supima, and Egyptian cotton have longer staple fibres, making them softer and more durable than standard cotton.", care: "Machine wash cold, tumble dry low. Gets softer with every wash.", slug: "cotton" },
  linen: { tip: "Quality linen should feel crisp, not stiff. European flax (Belgian, French, Irish) is considered the gold standard.", care: "Machine wash gentle, air dry. Embrace the wrinkles — they're part of the character.", slug: "linen" },
  wool: { tip: "Look for 'virgin wool' or 'pure new wool' for the best quality. Merino wool is finer and softer against the skin.", care: "Hand wash cold or dry clean. Lay flat to dry — never hang, as it stretches.", slug: "wool" },
  cashmere: { tip: "Grade A cashmere uses the longest, finest fibres. Two-ply or higher means more durability. Expect to pay more for Mongolian or Inner Mongolian cashmere.", care: "Hand wash cold with cashmere shampoo. Lay flat on a towel to dry. Fold, never hang.", slug: "cashmere" },
  merino: { tip: "Superfine merino (under 18.5 microns) is the softest. Look for mulesing-free certifications for ethical sourcing.", care: "Hand wash cold or use wool cycle. Lay flat to dry.", slug: "wool" },
  mohair: { tip: "Kid mohair is the softest and most luxurious grade. It should feel fluffy, not scratchy.", care: "Dry clean or hand wash very gently in cold water.", slug: "wool" },
  alpaca: { tip: "Baby alpaca is the finest grade — softer than cashmere and naturally hypoallergenic.", care: "Hand wash cold. Air dry flat, away from direct heat.", slug: "wool" },
  hemp: { tip: "Hemp fabric gets softer with every wash and is one of the most durable natural fibres available.", care: "Machine wash warm. It's very durable — the easiest natural fibre to care for.", slug: "cotton" },
};

function parseComposition(composition: string | null | undefined): { fiber: string; percent: number }[] {
  if (!composition) return [];
  const parts: { fiber: string; percent: number }[] = [];
  const matches = Array.from(composition.matchAll(/(\d+)\s*%\s*([a-zA-ZÀ-ÿ\s/()-]+)/g));
  for (const m of matches) {
    const percent = parseInt(m[1], 10);
    const fiber = m[2].trim().replace(/[,;]+$/, "").trim();
    if (fiber && percent > 0) parts.push({ fiber, percent });
  }
  if (parts.length === 0) {
    const reverse = Array.from(composition.matchAll(/([a-zA-ZÀ-ÿ\s/()-]+?)\s*(\d+)\s*%/g));
    for (const m of reverse) {
      const fiber = m[1].trim().replace(/[,;]+$/, "").trim();
      const percent = parseInt(m[2], 10);
      if (fiber && percent > 0) parts.push({ fiber, percent });
    }
  }
  return parts.sort((a, b) => b.percent - a.percent);
}

function getPrimaryFiber(composition: string | null | undefined): string | null {
  const parts = parseComposition(composition);
  if (parts.length === 0) return null;
  const fiber = parts[0].fiber.toLowerCase();
  const NATURAL_FIBERS = ["silk", "linen", "cotton", "wool", "cashmere", "merino", "mohair", "alpaca", "hemp", "flax", "ramie"];
  for (const nf of NATURAL_FIBERS) {
    if (fiber.includes(nf)) return nf;
  }
  return parts[0].fiber;
}

function isNaturalFiber(fiberName: string): boolean {
  const natural = ["silk", "linen", "cotton", "wool", "cashmere", "merino", "mohair", "alpaca", "hemp", "flax", "ramie", "jute", "bamboo"];
  const lower = fiberName.toLowerCase();
  return natural.some((n) => lower.includes(n));
}

function CompositionBar({ parts }: { parts: { fiber: string; percent: number }[] }) {
  const colors: Record<string, string> = {
    silk: "bg-amber-400", linen: "bg-lime-500", cotton: "bg-sky-400", wool: "bg-orange-400",
    cashmere: "bg-purple-400", merino: "bg-orange-300", mohair: "bg-rose-300", alpaca: "bg-amber-300",
    hemp: "bg-green-600", flax: "bg-lime-600", polyester: "bg-gray-400", elastane: "bg-gray-300",
    nylon: "bg-gray-350", spandex: "bg-gray-300", viscose: "bg-teal-400", rayon: "bg-teal-300",
    lyocell: "bg-teal-500", modal: "bg-teal-300",
  };

  function getColor(fiber: string): string {
    const lower = fiber.toLowerCase();
    for (const [key, val] of Object.entries(colors)) {
      if (lower.includes(key)) return val;
    }
    return "bg-gray-300";
  }

  return (
    <div className="flex flex-col gap-3" data-testid="composition-breakdown">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
        {parts.map((p, i) => (
          <div key={i} className={`${getColor(p.fiber)} transition-all`} style={{ width: `${p.percent}%` }} title={`${p.fiber} ${p.percent}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {parts.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getColor(p.fiber)}`} />
            <span className="text-xs md:text-sm">
              <span className="font-medium">{p.percent}%</span>{" "}
              <span className="text-muted-foreground capitalize">{p.fiber}</span>
              {isNaturalFiber(p.fiber) && <Leaf className="inline w-3 h-3 ml-1 text-emerald-600" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) {
    notFound();
  }

  const compositionParts = parseComposition(product.composition);
  const primaryFiber = getPrimaryFiber(product.composition);
  const relatedProducts = primaryFiber
    ? (await fetchRelatedProducts(product, 8)).filter((p) => p.imageUrl)
    : [];

  const breadcrumbItems: any[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.intertexe.com/" },
    { "@type": "ListItem", position: 2, name: "Shop", item: "https://www.intertexe.com/shop" },
  ];
  if (product.brandSlug && product.brandName) {
    breadcrumbItems.push({ "@type": "ListItem", position: 3, name: product.brandName, item: `https://www.intertexe.com/designers/${product.brandSlug}` });
    breadcrumbItems.push({ "@type": "ListItem", position: 4, name: product.name });
  } else {
    breadcrumbItems.push({ "@type": "ListItem", position: 3, name: product.name });
  }

  const productJsonLd: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.composition ? `${product.name} by ${product.brandName}. Composition: ${product.composition}.` : `${product.name} by ${product.brandName}`,
    brand: { "@type": "Brand", name: product.brandName },
    category: product.category || "Clothing",
    url: `https://www.intertexe.com/product/${product.id}`,
  };
  if (product.imageUrl) productJsonLd.image = product.imageUrl;
  if (product.composition) productJsonLd.material = product.composition;
  if (product.price) {
    const numericPrice = product.price.replace(/[^0-9.]/g, "");
    if (numericPrice) {
      productJsonLd.offers = {
        "@type": "Offer",
        price: numericPrice,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: product.url,
      };
    }
  }

  return (
    <div className="min-h-screen pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumbItems }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />

      <div className="py-6 md:py-8 flex flex-col gap-8 md:gap-12">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="breadcrumb">
          <Link href="/shop" className="flex items-center gap-1 hover:text-foreground transition-colors" data-testid="link-breadcrumb-shop">
            <ChevronLeft className="w-3 h-3" />
            Shop
          </Link>
          <span>/</span>
          {product.brandSlug && (
            <>
              <Link href={`/designers/${product.brandSlug}`} className="hover:text-foreground transition-colors" data-testid="link-breadcrumb-brand">
                {product.brandName}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
          <div className="aspect-[3/4] bg-[#f5f5f5] relative overflow-hidden" data-testid="product-image-container">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={`${product.brandName} ${product.name}`} className="absolute inset-0 w-full h-full object-cover" data-testid="img-product" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ShoppingBag className="w-16 h-16 text-muted-foreground/20" />
              </div>
            )}
            {product.naturalFiberPercent != null && product.naturalFiberPercent >= 90 && (
              <div className="absolute top-3 left-3">
                <span className="bg-emerald-900/90 text-emerald-100 px-3 py-1 text-[9px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm" data-testid="badge-natural-fiber">
                  {product.naturalFiberPercent}% Natural Fiber
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5 md:gap-6">
            <div className="flex flex-col gap-2">
              <Link href={`/designers/${product.brandSlug}`} className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors" data-testid="link-brand">
                {product.brandName}
              </Link>
              <h1 className="text-xl md:text-3xl font-serif leading-snug" data-testid="text-product-name">
                {product.name}
              </h1>
              {product.price && (
                <p className="text-lg md:text-xl font-medium mt-1" data-testid="text-price">
                  {product.price}
                </p>
              )}
            </div>

            {product.category && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-[9px] uppercase tracking-[0.12em] border border-border/40 text-muted-foreground" data-testid="badge-category">
                  {product.category}
                </span>
              </div>
            )}

            {compositionParts.length > 0 && (
              <div className="flex flex-col gap-3 py-5 border-y border-border/30">
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-medium text-muted-foreground">Material Composition</h2>
                <CompositionBar parts={compositionParts} />
                {product.composition && (
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-composition-raw">{product.composition}</p>
                )}
              </div>
            )}

            {product.naturalFiberPercent != null && (
              <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 border border-border/20" data-testid="natural-fiber-indicator">
                <Leaf className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{product.naturalFiberPercent}% Natural Fiber</span>
                  <span className="text-[10px] text-muted-foreground">
                    {product.naturalFiberPercent >= 90
                      ? "Excellent — predominantly natural materials"
                      : product.naturalFiberPercent >= 70
                        ? "Good — majority natural fibers"
                        : product.naturalFiberPercent >= 50
                          ? "Moderate — mixed composition"
                          : "Low natural fiber content"}
                  </span>
                </div>
              </div>
            )}

            {primaryFiber && FIBER_KNOWLEDGE[primaryFiber] && (
              <div className="flex flex-col gap-3 py-4 border-y border-border/20 bg-[#fafaf8]" data-testid="section-fabric-knowledge">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-medium text-muted-foreground px-4">
                  About {primaryFiber.charAt(0).toUpperCase() + primaryFiber.slice(1)}
                </h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed px-4">{FIBER_KNOWLEDGE[primaryFiber].tip}</p>
                <p className="text-[11px] text-muted-foreground/70 px-4">
                  <span className="font-medium text-muted-foreground">Care:</span> {FIBER_KNOWLEDGE[primaryFiber].care}
                </p>
                <Link href={`/materials/${FIBER_KNOWLEDGE[primaryFiber].slug}`} className="text-[10px] uppercase tracking-[0.15em] text-foreground hover:text-muted-foreground transition-colors flex items-center gap-1 px-4" data-testid="link-fiber-guide">
                  Read the full {primaryFiber} guide <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>
            )}

            {product.url && (
              <a href={product.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full bg-foreground text-background px-8 py-4 uppercase tracking-[0.2em] text-xs font-medium hover:opacity-90 transition-opacity active:scale-[0.98]" data-testid="link-shop-now">
                Shop Now <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-[10px] text-muted-foreground text-center">
                Verified by INTERTEXE — composition data sourced directly from the brand.
              </p>
              {product.brandSlug && (
                <Link href={`/designers/${product.brandSlug}`} className="text-[10px] uppercase tracking-[0.12em] text-center text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1" data-testid="link-more-from-brand">
                  More from {product.brandName} <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && primaryFiber && (
          <section className="flex flex-col gap-5 border-t border-border/30 pt-8" data-testid="section-related-products">
            <h2 className="text-xs uppercase tracking-[0.2em] font-medium text-muted-foreground">
              More in {primaryFiber.charAt(0).toUpperCase() + primaryFiber.slice(1)}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {relatedProducts.map((p) => (
                <Link key={p.id} href={`/product/${p.id}`} className="group flex flex-col" data-testid={`related-product-${p.id}`}>
                  <div className="aspect-[3/4] bg-[#f5f5f5] relative overflow-hidden">
                    <img src={p.imageUrl} alt={p.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading="lazy" />
                    {p.naturalFiberPercent != null && p.naturalFiberPercent >= 90 && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
                          {p.naturalFiberPercent}% natural
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 pt-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">{p.brandName}</span>
                    <span className="text-[11px] md:text-xs text-muted-foreground line-clamp-2">{p.name}</span>
                    {p.price && <span className="text-[11px] md:text-xs">{p.price}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
