import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { ExternalLink, ShoppingBag, ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSEO } from "@/hooks/use-seo";

type FiberTab = "all" | "cashmere" | "silk" | "wool" | "cotton" | "linen";
type CategoryFilter = "all" | "knitwear" | "tops" | "dresses" | "bottoms" | "outerwear";

const FIBER_TABS: { key: FiberTab; label: string; description: string }[] = [
  { key: "all", label: "All", description: "Every verified product" },
  { key: "cashmere", label: "Cashmere", description: "Pure cashmere knits and accessories" },
  { key: "silk", label: "Silk", description: "Silk blouses, dresses, and more" },
  { key: "wool", label: "Wool", description: "Wool tailoring, knits, and outerwear" },
  { key: "cotton", label: "Cotton", description: "Cotton essentials and denim" },
  { key: "linen", label: "Linen", description: "Linen dresses, tops, and suiting" },
];

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "knitwear", label: "Knitwear" },
  { key: "tops", label: "Tops" },
  { key: "dresses", label: "Dresses" },
  { key: "bottoms", label: "Bottoms" },
  { key: "outerwear", label: "Outerwear" },
];

function ProductCard({ product }: { product: any }) {
  const shopUrl = product.url
    ? `/leaving?url=${encodeURIComponent(product.url)}&brand=${encodeURIComponent(product.brand_name || product.brandName || "")}`
    : null;

  const name = product.name || product.productName || "";
  const brandName = product.brand_name || product.brandName || "";
  const imageUrl = product.image_url || product.imageUrl;
  const price = product.price;
  const composition = product.composition;
  const fiberPercent = product.natural_fiber_percent || product.naturalFiberPercent;

  return (
    <div className="group flex flex-col bg-background border border-border/40 hover:border-foreground/30 transition-all" data-testid={`product-card-${product.id}`}>
      {imageUrl ? (
        <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
          />
          {fiberPercent != null && fiberPercent >= 90 && (
            <div className="absolute top-2 left-2">
              <span className="flex items-center gap-1 bg-emerald-900/90 text-white px-2 py-0.5 text-[8px] uppercase tracking-wider backdrop-blur-sm">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {fiberPercent}% natural
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[3/4] bg-secondary/50 flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-muted-foreground/20" />
        </div>
      )}
      <div className="flex flex-col gap-1.5 p-3 md:p-4 flex-1">
        <span className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{brandName}</span>
        <h3 className="text-[13px] md:text-sm leading-snug line-clamp-2 font-medium" data-testid={`text-product-name-${product.id}`}>{name}</h3>
        {composition && (
          <p className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed line-clamp-1 mt-auto">{composition}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          {price && <span className="text-xs font-medium" data-testid={`text-price-${product.id}`}>{price}</span>}
          {fiberPercent != null && fiberPercent < 90 && (
            <span className="text-[9px] text-muted-foreground">{fiberPercent}% natural</span>
          )}
        </div>
      </div>
      {shopUrl && (
        <a
          href={shopUrl}
          className="flex items-center justify-center gap-2 bg-foreground text-background py-3 md:py-3.5 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-colors active:scale-[0.98]"
          data-testid={`button-shop-product-${product.id}`}
        >
          Shop Now <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function FiberHighlight({ fiber, count, onClick }: { fiber: string; count: number; onClick: () => void }) {
  const fiberImages: Record<string, string> = {
    cashmere: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&q=80",
    silk: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&q=80",
    wool: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=600&q=80",
    cotton: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80",
    linen: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80",
  };

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden aspect-[3/2] md:aspect-[4/3] bg-secondary flex items-end active:scale-[0.98] transition-transform"
      data-testid={`fiber-card-${fiber}`}
    >
      <img
        src={fiberImages[fiber] || ""}
        alt={fiber}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="relative z-10 p-3 md:p-4 flex flex-col gap-0.5 w-full">
        <span className="font-serif text-base md:text-lg text-white capitalize">{fiber}</span>
        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/70">{count} verified pieces</span>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
      </div>
    </button>
  );
}

export default function Shop() {
  const [fiberTab, setFiberTab] = useState<FiberTab>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  useSEO({
    title: "Shop Verified Products | INTERTEXE",
    description: "Browse 400+ products verified for natural fiber quality. Shop cashmere, silk, wool, cotton, and linen from brands we've vetted.",
  });

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ["all-products-shop"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) return [];
      const data = await res.json();
      return data.filter((p: any) => p.image_url);
    },
    staleTime: 5 * 60 * 1000,
  });

  const fiberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (allProducts as any[]).forEach((p: any) => {
      const comp = (p.composition || "").toLowerCase();
      if (comp.includes("cashmere")) counts.cashmere = (counts.cashmere || 0) + 1;
      if (comp.includes("silk")) counts.silk = (counts.silk || 0) + 1;
      if (comp.includes("wool") || comp.includes("merino")) counts.wool = (counts.wool || 0) + 1;
      if (comp.includes("cotton")) counts.cotton = (counts.cotton || 0) + 1;
      if (comp.includes("linen") || comp.includes("flax")) counts.linen = (counts.linen || 0) + 1;
    });
    return counts;
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    let products = allProducts as any[];

    if (fiberTab !== "all") {
      const fiberTerms: Record<string, string[]> = {
        cashmere: ["cashmere"],
        silk: ["silk"],
        wool: ["wool", "merino"],
        cotton: ["cotton"],
        linen: ["linen", "flax"],
      };
      const terms = fiberTerms[fiberTab] || [];
      products = products.filter((p: any) => {
        const comp = (p.composition || "").toLowerCase();
        return terms.some(t => comp.includes(t));
      });
    }

    if (categoryFilter !== "all") {
      products = products.filter((p: any) => p.category === categoryFilter);
    }

    return products;
  }, [allProducts, fiberTab, categoryFilter]);

  const showHighlights = fiberTab === "all" && categoryFilter === "all";

  return (
    <div className="min-h-screen pb-24 md:pb-16">
      <div className="py-6 md:py-10 flex flex-col gap-6 md:gap-10">
        <header className="flex flex-col gap-2 md:gap-3">
          <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground" data-testid="text-shop-label">
            Verified Products
          </span>
          <h1 className="text-2xl md:text-5xl font-serif" data-testid="text-shop-title">
            Shop by Material
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed">
            {(allProducts as any[]).length}+ products, every one checked for natural fiber content. Pick a material, find what you love, shop direct.
          </p>
        </header>

        {showHighlights && !isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 -mx-1 md:mx-0">
            {(["cashmere", "silk", "wool", "cotton", "linen"] as const).map(fiber => (
              <FiberHighlight
                key={fiber}
                fiber={fiber}
                count={fiberCounts[fiber] || 0}
                onClick={() => { setFiberTab(fiber); setCategoryFilter("all"); }}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {FIBER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setFiberTab(tab.key); setCategoryFilter("all"); }}
                className={`px-3.5 md:px-5 py-2.5 text-[10px] md:text-xs uppercase tracking-[0.15em] whitespace-nowrap transition-colors flex-shrink-0 min-h-[40px] ${
                  fiberTab === tab.key
                    ? "bg-foreground text-background font-medium"
                    : "bg-secondary/60 text-foreground/70 hover:bg-secondary active:bg-secondary"
                }`}
                data-testid={`tab-fiber-${tab.key}`}
              >
                {tab.label}
                {tab.key !== "all" && fiberCounts[tab.key] ? (
                  <span className="ml-1.5 opacity-60">{fiberCounts[tab.key]}</span>
                ) : null}
              </button>
            ))}
          </div>

          {fiberTab !== "all" && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {CATEGORY_FILTERS.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setCategoryFilter(cat.key)}
                  className={`px-3 py-2 text-[10px] uppercase tracking-[0.1em] whitespace-nowrap border transition-colors flex-shrink-0 min-h-[36px] ${
                    categoryFilter === cat.key
                      ? "border-foreground text-foreground font-medium"
                      : "border-border/40 text-muted-foreground hover:border-foreground/40"
                  }`}
                  data-testid={`tab-category-${cat.key}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {fiberTab !== "all" && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filteredProducts.length} {fiberTab} {categoryFilter !== "all" ? categoryFilter : "products"} verified
            </p>
            <Link
              href={`/materials/${fiberTab}`}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`link-material-guide-${fiberTab}`}
            >
              {fiberTab} buying guide <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col">
                <div className="aspect-[3/4] bg-secondary" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 bg-secondary w-1/3" />
                  <div className="h-4 bg-secondary w-3/4" />
                  <div className="h-3 bg-secondary w-1/2" />
                  <div className="h-10 bg-secondary mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center gap-3">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/20" />
            <p className="text-muted-foreground text-sm">No products match this combination yet.</p>
            <button
              onClick={() => { setFiberTab("all"); setCategoryFilter("all"); }}
              className="text-xs uppercase tracking-[0.15em] border-b border-foreground pb-0.5"
              data-testid="button-reset-filters"
            >
              View all products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {filteredProducts.slice(0, 40).map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {filteredProducts.length > 40 && (
          <p className="text-center text-xs text-muted-foreground pt-2">
            Showing 40 of {filteredProducts.length} products
          </p>
        )}

        <div className="border-t border-border/30 pt-8 md:pt-10 flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Explore by Material</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {[
              { href: "/materials/cashmere-sweaters", label: "Cashmere Sweaters" },
              { href: "/materials/silk-tops", label: "Silk Tops" },
              { href: "/materials/linen-dresses", label: "Linen Dresses" },
              { href: "/materials/cotton", label: "Cotton Guide" },
              { href: "/materials/wool", label: "Wool Guide" },
              { href: "/materials", label: "All Materials" },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between px-4 py-3.5 border border-border/30 hover:border-foreground/30 active:bg-secondary/50 transition-colors"
                data-testid={`link-explore-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="text-xs md:text-sm">{link.label}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
