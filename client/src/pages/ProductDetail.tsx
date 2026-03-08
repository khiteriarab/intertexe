import { useEffect, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ExternalLink, ShoppingBag, Heart, Leaf } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { fetchProductById, fetchProductsByFiber } from "@/lib/supabase";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import { trackAffiliateRedirect } from "@/lib/analytics";

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
  return natural.some(n => lower.includes(n));
}

function CompositionBar({ parts }: { parts: { fiber: string; percent: number }[] }) {
  const colors: Record<string, string> = {
    silk: "bg-amber-400",
    linen: "bg-lime-500",
    cotton: "bg-sky-400",
    wool: "bg-orange-400",
    cashmere: "bg-purple-400",
    merino: "bg-orange-300",
    mohair: "bg-rose-300",
    alpaca: "bg-amber-300",
    hemp: "bg-green-600",
    flax: "bg-lime-600",
    polyester: "bg-gray-400",
    elastane: "bg-gray-300",
    nylon: "bg-gray-350",
    spandex: "bg-gray-300",
    viscose: "bg-teal-400",
    rayon: "bg-teal-300",
    lyocell: "bg-teal-500",
    modal: "bg-teal-300",
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
          <div
            key={i}
            className={`${getColor(p.fiber)} transition-all`}
            style={{ width: `${p.percent}%` }}
            title={`${p.fiber} ${p.percent}%`}
          />
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

function ProductJsonLd({ product }: { product: any }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.composition ? `${product.name} by ${product.brandName}. Composition: ${product.composition}.` : `${product.name} by ${product.brandName}`,
    image: product.imageUrl || undefined,
    brand: {
      "@type": "Brand",
      name: product.brandName,
    },
    category: product.category || "Clothing",
    url: `https://www.intertexe.com/product/${product.id}`,
    ...(product.price ? {
      offers: {
        "@type": "Offer",
        price: product.price.replace(/[^0-9.]/g, ""),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: product.url,
      },
    } : {}),
    ...(product.composition ? {
      material: product.composition,
    } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function RelatedProducts({ fiber, excludeId, brandSlug }: { fiber: string; excludeId: string; brandSlug: string }) {
  const { data: relatedProducts = [], isLoading } = useQuery({
    queryKey: ["related-products", fiber],
    queryFn: () => fetchProductsByFiber(fiber),
    staleTime: 10 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    return relatedProducts
      .filter((p: any) => String(p.id) !== String(excludeId) && (p.imageUrl || p.image_url))
      .slice(0, 8);
  }, [relatedProducts, excludeId]);

  if (isLoading || filtered.length === 0) return null;

  return (
    <section className="flex flex-col gap-5 border-t border-border/30 pt-8" data-testid="section-related-products">
      <h2 className="text-xs uppercase tracking-[0.2em] font-medium text-muted-foreground">
        More in {fiber.charAt(0).toUpperCase() + fiber.slice(1)}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {filtered.map((p: any) => (
          <Link
            key={p.id}
            href={`/product/${p.id}`}
            className="group flex flex-col"
            data-testid={`related-product-${p.id}`}
          >
            <div className="aspect-[3/4] bg-[#f5f5f5] relative overflow-hidden">
              <img
                src={p.imageUrl || p.image_url}
                alt={p.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                loading="lazy"
              />
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
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { toggle, isFavorited } = useProductFavorites();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProductById(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });

  const compositionParts = useMemo(() => parseComposition(product?.composition), [product?.composition]);
  const primaryFiber = useMemo(() => getPrimaryFiber(product?.composition), [product?.composition]);

  const seoTitle = product
    ? `${product.brandName} ${product.name} | INTERTEXE`
    : "Product | INTERTEXE";

  const seoDesc = product
    ? `Shop ${product.brandName} ${product.name}${product.composition ? `. Composition: ${product.composition}.` : ""}${product.naturalFiberPercent != null ? ` ${product.naturalFiberPercent}% natural fiber.` : ""} Verified by INTERTEXE.`
    : "Product details on INTERTEXE.";

  useSEO({
    title: seoTitle,
    description: seoDesc,
    path: id ? `/product/${id}` : undefined,
  });

  useEffect(() => {
    if (!isLoading && (!product || error)) {
      let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "robots";
        document.head.appendChild(meta);
      }
      meta.content = "noindex";
      return () => { meta.content = "index, follow"; };
    }
  }, [isLoading, product, error]);

  useEffect(() => {
    if (!product) return;
    const existing = document.getElementById("product-jsonld");
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = "product-jsonld";
    script.type = "application/ld+json";
    const jsonLd: any = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.composition ? `${product.name} by ${product.brandName}. Composition: ${product.composition}.` : `${product.name} by ${product.brandName}`,
      brand: { "@type": "Brand", name: product.brandName },
      category: product.category || "Clothing",
      url: `https://www.intertexe.com/product/${product.id}`,
    };
    if (product.imageUrl) jsonLd.image = product.imageUrl;
    if (product.composition) jsonLd.material = product.composition;
    if (product.price) {
      const numericPrice = product.price.replace(/[^0-9.]/g, "");
      if (numericPrice) {
        jsonLd.offers = {
          "@type": "Offer",
          price: numericPrice,
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: product.url,
        };
      }
    }
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [product]);

  if (isLoading) {
    return (
      <div className="min-h-screen py-10">
        <div className="animate-pulse flex flex-col gap-8">
          <div className="h-4 w-24 bg-[#f0f0ee]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-[3/4] bg-[#f0f0ee]" />
            <div className="flex flex-col gap-4">
              <div className="h-4 w-32 bg-[#f0f0ee]" />
              <div className="h-6 w-3/4 bg-[#f0f0ee]" />
              <div className="h-4 w-1/4 bg-[#f0f0ee]" />
              <div className="h-20 bg-[#f0f0ee] mt-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 py-20">
        <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
        <h1 className="text-lg font-serif" data-testid="text-not-found">Product Not Found</h1>
        <p className="text-sm text-muted-foreground">This product may no longer be available.</p>
        <Link href="/shop" className="text-xs uppercase tracking-[0.15em] border-b border-foreground pb-0.5" data-testid="link-back-shop">
          Back to Shop
        </Link>
      </div>
    );
  }

  const productId = String(product.id);
  const saved = isFavorited(productId);

  return (
    <div className="min-h-screen pb-16">
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
              <img
                src={product.imageUrl}
                alt={`${product.brandName} ${product.name}`}
                className="absolute inset-0 w-full h-full object-cover"
                data-testid="img-product"
              />
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
            <button
              onClick={() => toggle(productId, product.brandName, product.price)}
              className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
              data-testid="btn-favorite"
              aria-label={saved ? "Remove from favorites" : "Save to favorites"}
            >
              <Heart className={`w-5 h-5 transition-colors ${saved ? "fill-red-500 text-red-500" : "text-foreground/60 hover:text-foreground"}`} />
            </button>
          </div>

          <div className="flex flex-col gap-5 md:gap-6">
            <div className="flex flex-col gap-2">
              <Link
                href={`/designers/${product.brandSlug}`}
                className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-brand"
              >
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
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-medium text-muted-foreground">
                  Material Composition
                </h2>
                <CompositionBar parts={compositionParts} />
                {product.composition && (
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-composition-raw">
                    {product.composition}
                  </p>
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

            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackAffiliateRedirect(product.brandName, product.url)}
                className="flex items-center justify-center gap-3 w-full bg-foreground text-background px-8 py-4 uppercase tracking-[0.2em] text-xs font-medium hover:opacity-90 transition-opacity active:scale-[0.98]"
                data-testid="link-shop-now"
              >
                Shop Now <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              Verified by INTERTEXE — composition data sourced directly from the brand.
            </p>
          </div>
        </div>

        {primaryFiber && (
          <RelatedProducts fiber={primaryFiber} excludeId={String(product.id)} brandSlug={product.brandSlug} />
        )}
      </div>
    </div>
  );
}
