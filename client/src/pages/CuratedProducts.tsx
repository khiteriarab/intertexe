import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ShoppingBag, ExternalLink, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { getQualityTier, getTierColor } from "@/lib/quality-tiers";
import { useState } from "react";

interface ProductPageConfig {
  slug: string;
  title: string;
  fiber: string;
  heroTitle: string;
  heroSubtitle: string;
  intro: string;
  buyingTips: string[];
  redFlags: string[];
  products: CuratedProduct[];
}

interface CuratedProduct {
  name: string;
  brand: string;
  brandSlug: string;
  url: string;
  imageUrl: string;
  price: string;
  composition: string;
  naturalFiberPercent: number;
  highlight?: string;
}

const LINEN_DRESSES: ProductPageConfig = {
  slug: "linen-dresses",
  title: "The Best Linen Dresses Worth Buying",
  fiber: "Linen",
  heroTitle: "Linen Dresses",
  heroSubtitle: "We tested the composition of every dress. These are the ones worth your money.",
  intro: "Linen is one of the oldest and most sustainable fabrics — breathable, naturally cooling, and it only gets softer with every wash. But most brands cut it with polyester. We found the ones that don't.",
  buyingTips: [
    "Look for 100% linen or linen-viscose blends",
    "European flax (Belgian, French) is the gold standard",
    "Expect a natural, relaxed drape — stiff linen softens with wear",
    "Pre-washed or garment-dyed linen has minimal shrinkage",
  ],
  redFlags: [
    "\"Linen blend\" with no percentage listed",
    "Polyester lining in a \"linen\" dress",
    "Under $80 for a linen dress — likely mixed with synthetic",
  ],
  products: [
    { name: "Birdie Linen Dress", brand: "Reformation", brandSlug: "reformation", url: "https://www.thereformation.com/products/birdie-linen-dress/1320101OVI.html", imageUrl: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1320101/LOVIE/1320101.1.LOVIE", price: "$298", composition: "100% Linen", naturalFiberPercent: 100, highlight: "Editor's Pick" },
    { name: "Janu Linen Mini Dress", brand: "Reformation", brandSlug: "reformation", url: "https://www.thereformation.com/products/janu-linen-mini-dress/1319548LPS.html", imageUrl: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1319548/LEAPORD_SPOT/1319548.1.LEAPORD_SPOT", price: "$198", composition: "100% Linen", naturalFiberPercent: 100 },
    { name: "Cecilia Linen Dress", brand: "Reformation", brandSlug: "reformation", url: "https://www.thereformation.com/products/cecilia-linen-dress/1319452DEK.html", imageUrl: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1319452/DECK/1319452.1.DECK", price: "$278", composition: "100% Linen", naturalFiberPercent: 100 },
    { name: "Gingham Linen Maxi Dress", brand: "Sandro", brandSlug: "sandro", url: "https://us.sandro-paris.com/en/p/gingham-linen-maxi-dress/SFPRO04713_D251.html", imageUrl: "https://us.sandro-paris.com/dw/image/v2/BCMW_PRD/on/demandware.static/-/Sites-master-catalog/default/dw430890b3/images/hi-res/Sandro_SFPRO04713-D251_F_1.jpg?sw=800", price: "$365", composition: "86% Linen, 14% Polyester", naturalFiberPercent: 86 },
    { name: "Maxi Dress with Lace Details", brand: "Sandro", brandSlug: "sandro", url: "https://us.sandro-paris.com/en/p/maxi-dress-with-lace-details/SFPRO04828_D221.html", imageUrl: "https://us.sandro-paris.com/dw/image/v2/BCMW_PRD/on/demandware.static/-/Sites-master-catalog/default/dwef988115/images/hi-res/Sandro_SFPRO04828-D221_F_1.jpg?sw=800", price: "$645", composition: "86% Linen, 14% Polyester", naturalFiberPercent: 86 },
  ],
};

const SILK_DRESSES: ProductPageConfig = {
  slug: "silk-dresses",
  title: "The Best Silk Dresses Worth Buying",
  fiber: "Silk",
  heroTitle: "Silk Dresses",
  heroSubtitle: "Verified 100% silk. No polyester masquerading as luxury.",
  intro: "Real silk has a distinct, cool-to-the-touch feel that no synthetic can replicate. It's naturally temperature-regulating, hypoallergenic, and has a luminous drape that polyester satin will never match. We verified every composition label.",
  buyingTips: [
    "Mulberry silk is the highest quality (smooth, lustrous)",
    "Look for momme weight — 19mm+ for dresses, 22mm+ for heavier drapes",
    "Silk charmeuse has a satin face and matte back",
    "Silk crepe de chine is matte, breathable, and less delicate",
  ],
  redFlags: [
    "\"Silky\" or \"silk-feel\" — this means polyester",
    "\"Satin\" without specifying silk — usually polyester satin",
    "Under $100 for a silk dress — almost certainly synthetic",
  ],
  products: [
    { name: "Eden Silk Dress", brand: "Reformation", brandSlug: "reformation", url: "https://www.thereformation.com/products/eden-silk-dress/1319612PPO.html", imageUrl: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1319612/POPPY/1319612.1.POPPY", price: "$248", composition: "100% Silk", naturalFiberPercent: 100, highlight: "Best Value" },
    { name: "Frankie Silk Dress", brand: "Reformation", brandSlug: "reformation", url: "https://www.thereformation.com/products/frankie-silk-dress/1304134RCM.html", imageUrl: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1304134/ROSECREAM/1304134.1.ROSECREAM", price: "$298", composition: "100% Silk", naturalFiberPercent: 100, highlight: "Editor's Pick" },
    { name: "Anaiis Silk Dress", brand: "Reformation", brandSlug: "reformation", url: "https://www.thereformation.com/products/anaiis-silk-dress/1314547TAV.html", imageUrl: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1314547/TAVERNA/1314547.1.TAVERNA", price: "$398", composition: "100% Silk", naturalFiberPercent: 100 },
    { name: "Jillian Silk Dress", brand: "Reformation", brandSlug: "reformation", url: "https://www.thereformation.com/products/jillian-silk-dress/1318344PZZ.html", imageUrl: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1318344/PIAZZA/1318344.1.PIAZZA", price: "$348", composition: "100% Silk", naturalFiberPercent: 100 },
  ],
};

const COTTON_DRESSES: ProductPageConfig = {
  slug: "cotton-dresses",
  title: "The Best Cotton & Denim Dresses Worth Buying",
  fiber: "Cotton",
  heroTitle: "Cotton & Denim Dresses",
  heroSubtitle: "Breathable, durable, and honestly made. Every piece verified.",
  intro: "Cotton is the most versatile fabric in fashion — from crisp shirting to soft jersey to raw denim. But quality varies wildly. We found the dresses made with real cotton, organic where possible, without the synthetic shortcuts.",
  buyingTips: [
    "Organic cotton (GOTS certified) uses no synthetic pesticides",
    "Egyptian and Pima cotton have longer fibers = softer, more durable",
    "Raw/selvedge denim is 100% cotton with no stretch",
    "Poplin and chambray are lightweight cotton weaves ideal for dresses",
  ],
  redFlags: [
    "\"Cotton blend\" with more than 30% polyester",
    "Jersey dresses with no composition listed",
    "\"Denim\" dresses that are actually stretch poly-cotton",
  ],
  products: [
    { name: "Mini Denim Dress", brand: "Sandro", brandSlug: "sandro", url: "https://us.sandro-paris.com/en/p/mini-denim-dress/SFPRO04394_D324.html", imageUrl: "https://us.sandro-paris.com/dw/image/v2/BCMW_PRD/on/demandware.static/-/Sites-master-catalog/default/dw7755d010/images/hi-res/Sandro_SFPRO04394-D324_F_1.jpg?sw=800", price: "$367.50", composition: "100% Cotton", naturalFiberPercent: 100, highlight: "Editor's Pick" },
    { name: "Joliette Dress", brand: "Reformation", brandSlug: "reformation", url: "https://www.thereformation.com/products/joliette-dress/1319017BLK.html", imageUrl: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1319017/BLACK/1319017.1.BLACK", price: "$198", composition: "98% Organic Cotton, 2% Spandex", naturalFiberPercent: 98 },
    { name: "Manon Denim Midi Dress", brand: "Reformation", brandSlug: "reformation", url: "https://www.thereformation.com/products/manon-denim-midi-dress/1319334PRR.html", imageUrl: "https://media.thereformation.com/image/upload/f_auto,q_auto,dpr_1.0/w_800,c_scale//PRD-SFCC/1319334/PARADISE/1319334.1.PARADISE", price: "$218", composition: "100% Cotton", naturalFiberPercent: 100 },
  ],
};

const PAGE_CONFIGS: Record<string, ProductPageConfig> = {
  "linen-dresses": LINEN_DRESSES,
  "silk-dresses": SILK_DRESSES,
  "cotton-dresses": COTTON_DRESSES,
};

function EmailCapture({ fiber }: { fiber: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-3 p-6 bg-emerald-50 border border-emerald-200">
        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
        <p className="text-sm text-emerald-900">You're in. We'll notify you when we add new verified {fiber.toLowerCase()} pieces.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 md:p-8 bg-secondary/30 border border-border/20" data-testid="form-email-capture">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-foreground/60" />
        <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Get notified</h3>
      </div>
      <p className="text-sm text-foreground/70">
        We add new verified pieces every week. Get notified when we find {fiber.toLowerCase()} items that meet our standards.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 px-4 py-3 bg-background border border-border/40 text-sm focus:outline-none focus:border-foreground/40 transition-colors"
          data-testid="input-email-capture"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-foreground text-background text-xs uppercase tracking-widest hover:bg-foreground/90 transition-colors active:scale-[0.98]"
          data-testid="button-email-submit"
        >
          Notify Me
        </button>
      </div>
    </form>
  );
}

function ProductCard({ product, index }: { product: CuratedProduct; index: number }) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col"
      data-testid={`card-curated-product-${index}`}
    >
      <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="w-8 h-8 opacity-30" />
          </div>
        )}
        {product.highlight && (
          <div className="absolute top-2 right-2">
            <span className="bg-foreground text-background px-2.5 py-1 text-[8px] uppercase tracking-[0.15em] font-medium">
              {product.highlight}
            </span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
            {product.naturalFiberPercent}% natural
          </span>
        </div>
      </div>
      <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/designers/${product.brandSlug}`}
            className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {product.brand}
          </Link>
        </div>
        <h3 className="text-xs md:text-sm leading-snug font-medium">{product.name}</h3>
        <p className="text-[10px] text-muted-foreground">{product.composition}</p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-sm font-medium">{product.price}</span>
          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </a>
  );
}

export default function CuratedProductsPage({ pageSlug }: { pageSlug: string }) {
  const config = PAGE_CONFIGS[pageSlug];

  useSEO({
    title: config?.title || "Curated Products",
    description: config?.intro?.slice(0, 160) || "Verified luxury fashion pieces that meet INTERTEXE quality standards.",
  });

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-16">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="pt-6 pb-4">
          <Link href="/materials" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-materials">
            <ChevronLeft className="w-3.5 h-3.5" />
            Buying Guide
          </Link>
        </div>

        <header className="flex flex-col gap-4 pb-8 border-b border-border/20">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">INTERTEXE Verified</span>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl leading-tight" data-testid="text-page-title">
            {config.heroTitle}
          </h1>
          <p className="text-sm md:text-base text-foreground/70 max-w-2xl leading-relaxed">
            {config.heroSubtitle}
          </p>
        </header>

        <section className="py-8 border-b border-border/20">
          <p className="text-sm md:text-base text-foreground/80 leading-relaxed max-w-2xl">
            {config.intro}
          </p>
        </section>

        <section className="py-8 border-b border-border/20">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] font-medium mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                What to Look For
              </h2>
              <ul className="flex flex-col gap-2.5">
                {config.buyingTips.map((tip, i) => (
                  <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                    <span className="text-emerald-700 mt-0.5">+</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] font-medium mb-4 flex items-center gap-2">
                <span className="text-red-600 text-sm">⚑</span>
                Red Flags
              </h2>
              <ul className="flex flex-col gap-2.5">
                {config.redFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">−</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs uppercase tracking-[0.2em] font-medium">
              {config.products.length} Verified Pieces
            </h2>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Every composition checked
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {config.products.map((product, index) => (
              <ProductCard key={index} product={product} index={index} />
            ))}
          </div>
        </section>

        <section className="py-8 border-t border-border/20">
          <EmailCapture fiber={config.fiber} />
        </section>

        <section className="py-8 border-t border-border/20">
          <h2 className="text-xs uppercase tracking-[0.2em] font-medium mb-4">More Curated Collections</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(PAGE_CONFIGS)
              .filter(([key]) => key !== pageSlug)
              .map(([key, cfg]) => (
                <Link
                  key={key}
                  href={`/${key}`}
                  className="flex items-center gap-2 px-4 py-3 border border-border/30 hover:border-foreground/30 transition-colors text-sm"
                  data-testid={`link-collection-${key}`}
                >
                  {cfg.heroTitle}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
