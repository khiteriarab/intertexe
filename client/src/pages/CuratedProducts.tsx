import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ShoppingBag, ExternalLink, Mail, CheckCircle2, ArrowRight, Heart } from "lucide-react";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import { useSEO } from "@/hooks/use-seo";
import { fetchProductsByFiberAndCategory } from "@/lib/supabase";
import { useState } from "react";

interface PageConfig {
  slug: string;
  title: string;
  fiber: string;
  category?: string;
  fiberQuery: string[];
  heroTitle: string;
  heroSubtitle: string;
  intro: string;
  buyingTips: string[];
  redFlags: string[];
}

const PAGE_CONFIGS: Record<string, PageConfig> = {
  "linen-dresses": {
    slug: "linen-dresses",
    title: "Best Linen Dresses in 2026",
    fiber: "Linen",
    category: "dresses",
    fiberQuery: ["linen", "flax"],
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
  },
  "linen-tops": {
    slug: "linen-tops",
    title: "Best Linen Tops & Shirts in 2026",
    fiber: "Linen",
    category: "tops",
    fiberQuery: ["linen", "flax"],
    heroTitle: "Linen Tops & Shirts",
    heroSubtitle: "Breezy, breathable, and built for warm weather. Every composition verified.",
    intro: "A linen shirt is the backbone of any summer wardrobe. The problem? Most \"linen\" tops are blended with polyester to cut costs. We checked every label to find the real thing.",
    buyingTips: [
      "100% linen shirts get softer with every wash",
      "Linen-cotton blends (70/30) offer crease resistance without synthetics",
      "Camp collars and oversized fits suit linen's natural drape",
      "French or Belgian flax is the highest quality linen fiber",
    ],
    redFlags: [
      "\"Linen look\" or \"linen style\" — usually polyester",
      "Blended with more than 20% polyester",
      "Extremely stiff linen that doesn't soften — low quality fiber",
    ],
  },
  "silk-dresses": {
    slug: "silk-dresses",
    title: "Best Silk Dresses in 2026",
    fiber: "Silk",
    category: "dresses",
    fiberQuery: ["silk"],
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
  },
  "silk-tops": {
    slug: "silk-tops",
    title: "Best Silk Tops & Blouses in 2026",
    fiber: "Silk",
    category: "tops",
    fiberQuery: ["silk"],
    heroTitle: "Silk Tops & Blouses",
    heroSubtitle: "The real thing. No poly-satin pretenders.",
    intro: "A silk blouse is a wardrobe investment that lasts decades — if it's actually silk. We verified every composition to find tops made from genuine silk, not the polyester satin sold at similar price points.",
    buyingTips: [
      "Silk charmeuse for a dressier drape, crepe de chine for everyday wear",
      "19+ momme weight for shirts that hold up to regular wear",
      "Silk twill is more structured — ideal for button-downs",
      "Hand wash or delicate cycle in cold water to preserve the fiber",
    ],
    redFlags: [
      "\"Silk touch\" or \"silk satin\" without stating 100% silk",
      "Shiny, plasticky appearance — real silk has a subtle, matte luster",
      "Under $80 for a silk top — very likely synthetic",
    ],
  },
  "cotton-dresses": {
    slug: "cotton-dresses",
    title: "Best Cotton & Denim Dresses in 2026",
    fiber: "Cotton",
    category: "dresses",
    fiberQuery: ["cotton", "denim"],
    heroTitle: "Cotton & Denim Dresses",
    heroSubtitle: "Breathable, durable, and honestly made. Every piece verified.",
    intro: "Cotton is the most versatile fabric in fashion — from crisp shirting to soft jersey to raw denim. But quality varies wildly. We found the pieces made with real cotton, organic where possible, without the synthetic shortcuts.",
    buyingTips: [
      "Organic cotton (GOTS certified) uses no synthetic pesticides",
      "Egyptian and Pima cotton have longer fibers = softer, more durable",
      "Raw/selvedge denim is 100% cotton with no stretch",
      "Poplin and chambray are lightweight cotton weaves ideal for dresses",
    ],
    redFlags: [
      "\"Cotton blend\" with more than 30% polyester",
      "Jersey dresses with no composition listed",
      "\"Denim\" pieces that are actually stretch poly-cotton",
    ],
  },
  "cotton-tops": {
    slug: "cotton-tops",
    title: "Best Cotton Tops & Shirts in 2026",
    fiber: "Cotton",
    category: "tops",
    fiberQuery: ["cotton", "denim"],
    heroTitle: "Cotton Tops & Shirts",
    heroSubtitle: "Classic cotton. No synthetic fillers. Every label checked.",
    intro: "Cotton shirts should be simple — but brands love cutting corners with polyester blends that pill, trap heat, and look cheap after a few washes. We verified every label to find the ones made from real, quality cotton.",
    buyingTips: [
      "100% cotton oxford cloth is the gold standard for casual shirts",
      "Supima and Pima cotton are softer and more durable than regular cotton",
      "Cotton poplin is lightweight and crisp — perfect for warm weather",
      "Look for selvedge denim shirts — 100% cotton with no stretch",
    ],
    redFlags: [
      "\"Cotton rich\" — usually 60% cotton, 40% polyester",
      "Jersey tees with no fabric composition listed",
      "Denim shirts with more than 5% elastane — loses shape quickly",
    ],
  },
  "cashmere-sweaters": {
    slug: "cashmere-sweaters",
    title: "Best Cashmere Sweaters in 2026",
    fiber: "Cashmere",
    category: "knitwear",
    fiberQuery: ["cashmere"],
    heroTitle: "Cashmere Sweaters",
    heroSubtitle: "The luxury knit. Verified compositions — no blended imitations.",
    intro: "Cashmere is the most coveted knitwear fiber in the world — lighter, warmer, and softer than wool. But the market is flooded with blends that use as little as 5% cashmere and call it \"cashmere.\" We checked every label.",
    buyingTips: [
      "Grade A cashmere uses the longest, finest fibers (under 15.5 microns)",
      "Inner Mongolian cashmere is considered the world's best",
      "2-ply construction is more durable than single-ply",
      "Pilling is normal for the first few wears — it decreases over time",
    ],
    redFlags: [
      "\"Cashmere blend\" with less than 70% cashmere",
      "Under $100 for a cashmere sweater — almost certainly recycled or blended",
      "\"Cashmere feel\" or \"cashmere touch\" — this is acrylic",
      "Extremely light weight — may indicate thin, low-grade fiber",
    ],
  },
  "wool-sweaters": {
    slug: "wool-sweaters",
    title: "Best Wool Sweaters & Knitwear in 2026",
    fiber: "Wool",
    category: "knitwear",
    fiberQuery: ["wool", "merino"],
    heroTitle: "Wool Sweaters & Knitwear",
    heroSubtitle: "Warm, breathable, and naturally odor-resistant. Every fiber verified.",
    intro: "Good wool knitwear lasts a lifetime. Merino, lambswool, and virgin wool are naturally temperature-regulating and antimicrobial. But cheap acrylic blends dominate the market. We found the pieces worth investing in.",
    buyingTips: [
      "Merino wool (under 18.5 microns) is the softest and least itchy",
      "Virgin wool means first-shearing fiber — strongest and most resilient",
      "Lambswool is softer than regular wool, from the first shearing of young sheep",
      "Wool naturally resists odors — you don't need to wash it after every wear",
    ],
    redFlags: [
      "\"Wool blend\" with more than 30% acrylic or polyester",
      "\"Warm and cozy\" fabric descriptions with no composition listed",
      "Very low price for \"100% wool\" — may be recycled/reclaimed wool",
    ],
  },
  "viscose-dresses": {
    slug: "viscose-dresses",
    title: "Best Viscose & Rayon Dresses in 2026",
    fiber: "Viscose",
    category: "dresses",
    fiberQuery: ["viscose", "rayon", "wood pulp", "lyocell", "tencel", "modal"],
    heroTitle: "Viscose & Rayon Dresses",
    heroSubtitle: "The semi-natural alternative to silk. Every composition checked.",
    intro: "Viscose (also called rayon) is made from plant cellulose — usually wood pulp. When done right, it drapes beautifully and breathes like silk at a fraction of the price. Lyocell and TENCEL are the premium versions with sustainable closed-loop production.",
    buyingTips: [
      "TENCEL/Lyocell is the gold standard — closed-loop, sustainable production",
      "EcoVero viscose uses sustainably sourced wood pulp",
      "Viscose drapes like silk but is more affordable and easier to care for",
      "Modal is even softer than regular viscose — excellent for everyday wear",
    ],
    redFlags: [
      "Viscose blended with polyester — defeats the purpose of the fabric",
      "\"Rayon\" with no specific type listed — quality varies enormously",
      "Very cheap viscose wrinkles badly and may shrink in the wash",
    ],
  },
  "cotton-shirts": {
    slug: "cotton-shirts",
    title: "Best Cotton Shirts in 2026 — Verified Compositions",
    fiber: "Cotton",
    category: "tops",
    fiberQuery: ["cotton"],
    heroTitle: "Cotton Shirts",
    heroSubtitle: "Oxford, poplin, chambray — every label verified for real cotton.",
    intro: "A cotton shirt is the foundation of any wardrobe. But most \"cotton\" shirts today are blended with polyester or elastane. We checked every composition to find shirts made from real, quality cotton — Pima, Supima, organic, and Egyptian.",
    buyingTips: [
      "Oxford cloth button-downs in 100% cotton are the gold standard",
      "Supima and Pima cotton are softer and more durable than standard cotton",
      "Poplin weave is lightweight and crisp — ideal for warm-weather shirts",
      "Chambray is a lighter alternative to denim — still 100% cotton",
    ],
    redFlags: [
      "\"Cotton rich\" usually means 60% cotton, 40% polyester",
      "\"Easy iron\" or \"non-iron\" shirts are coated with formaldehyde resins",
      "Under $40 for a cotton shirt — likely blended with synthetics",
    ],
  },
  "cotton-pants": {
    slug: "cotton-pants",
    title: "Best Cotton Pants & Trousers in 2026",
    fiber: "Cotton",
    category: "bottoms",
    fiberQuery: ["cotton", "denim"],
    heroTitle: "Cotton Pants & Trousers",
    heroSubtitle: "Chinos, denim, wide-leg — all verified for real cotton content.",
    intro: "From raw selvedge denim to tailored chinos, the best pants start with quality cotton. We verified every composition to find trousers made from genuine cotton — not synthetic stretch blends that lose shape after a few wears.",
    buyingTips: [
      "Raw selvedge denim is 100% cotton with no stretch additives",
      "Cotton twill chinos should be at least 97% cotton",
      "Wide-leg cotton trousers drape best in medium-weight cotton",
      "Organic cotton (GOTS certified) ensures no synthetic pesticides",
    ],
    redFlags: [
      "\"Stretch denim\" with more than 5% elastane — loses shape quickly",
      "\"Cotton blend\" pants with over 30% polyester",
      "Very cheap cotton trousers — often thin, see-through cotton",
    ],
  },
  "silk-blouses": {
    slug: "silk-blouses",
    title: "Best Silk Blouses in 2026 — Verified 100% Silk",
    fiber: "Silk",
    category: "tops",
    fiberQuery: ["silk"],
    heroTitle: "Silk Blouses",
    heroSubtitle: "The wardrobe essential. Every blouse verified for genuine silk.",
    intro: "A silk blouse is the most elegant layering piece in fashion — but the market is flooded with polyester satin sold at silk prices. We verified every label to find blouses made from real mulberry silk, silk crepe de chine, and silk charmeuse.",
    buyingTips: [
      "Silk crepe de chine is the most versatile — matte finish, breathable",
      "19+ momme weight ensures durability for everyday wear",
      "Silk charmeuse has a glossy face and matte back — more formal",
      "Silk twill is structured enough for button-down blouses",
    ],
    redFlags: [
      "\"Silk satin\" without specifying 100% silk — usually polyester",
      "\"Silky\" or \"silk-feel\" — this is marketing for polyester",
      "Under $80 for a silk blouse — almost certainly synthetic",
    ],
  },
  "silk-skirts": {
    slug: "silk-skirts",
    title: "Best Silk Skirts in 2026 — Verified Compositions",
    fiber: "Silk",
    category: "bottoms",
    fiberQuery: ["silk"],
    heroTitle: "Silk Skirts",
    heroSubtitle: "Midi, maxi, and slip skirts in verified real silk.",
    intro: "A silk skirt moves like nothing else — fluid, luminous, and cool to the touch. But most \"silk\" skirts on the market are actually polyester. We verified every composition so you get the real thing.",
    buyingTips: [
      "Silk slip skirts in charmeuse have the classic fluid drape",
      "Silk midi skirts in crepe de chine hold shape better for everyday",
      "19mm+ momme weight is ideal for skirts — heavier drape, less see-through",
      "Bias-cut silk skirts flatter most body types",
    ],
    redFlags: [
      "\"Satin skirt\" without specifying silk — this is polyester satin",
      "Shiny, plasticky finish — real silk has a subtle luster",
      "Under $100 for a silk skirt — very likely synthetic",
    ],
  },
  "linen-pants": {
    slug: "linen-pants",
    title: "Best Linen Pants & Trousers in 2026",
    fiber: "Linen",
    category: "bottoms",
    fiberQuery: ["linen", "flax"],
    heroTitle: "Linen Pants",
    heroSubtitle: "Breathable summer trousers. Every pair verified for real linen.",
    intro: "Linen pants are the ultimate warm-weather essential — naturally cooling, moisture-wicking, and they only get softer with each wash. But many brands blend linen with polyester to cut costs. We found the ones that don't.",
    buyingTips: [
      "100% linen pants soften beautifully over time",
      "Linen-cotton blends (70/30) add crease resistance without synthetics",
      "Wide-leg and relaxed fits suit linen's natural drape",
      "European flax (Belgian, French, Irish) is the highest quality",
    ],
    redFlags: [
      "\"Linen blend\" with no percentage — often mostly polyester",
      "Under $60 for linen pants — likely synthetic blend",
      "\"Linen look\" — this means polyester made to resemble linen",
    ],
  },
  "linen-shirts": {
    slug: "linen-shirts",
    title: "Best Linen Shirts in 2026 — Verified Compositions",
    fiber: "Linen",
    category: "tops",
    fiberQuery: ["linen", "flax"],
    heroTitle: "Linen Shirts",
    heroSubtitle: "Camp collars, button-downs, and blouses in real linen.",
    intro: "A linen shirt is the cornerstone of any summer wardrobe — but most brands blend linen with polyester to reduce wrinkling and cost. We verified every composition to find shirts made from genuine linen fiber.",
    buyingTips: [
      "100% linen shirts get softer and more comfortable with every wash",
      "Camp collar linen shirts are the most versatile summer piece",
      "Pre-washed or garment-dyed linen has minimal shrinkage",
      "French and Belgian flax produce the finest linen fibers",
    ],
    redFlags: [
      "\"Linen style\" or \"linen look\" — usually polyester",
      "Blended with more than 20% polyester",
      "Extremely stiff linen that doesn't soften — low quality fiber",
    ],
  },
  "linen-sets": {
    slug: "linen-sets",
    title: "Best Linen Sets & Co-ords in 2026",
    fiber: "Linen",
    fiberQuery: ["linen", "flax"],
    heroTitle: "Linen Sets",
    heroSubtitle: "Matching co-ords and resort sets in verified linen.",
    intro: "Linen sets — matching tops and bottoms — are the easiest way to look pulled-together in warm weather. We verified the composition of each piece to make sure you're getting real linen, not synthetic imitations.",
    buyingTips: [
      "Look for 100% linen or linen-cotton blends in both pieces",
      "Pre-washed linen sets won't shrink unevenly",
      "Relaxed fits in linen drape more naturally than structured cuts",
      "Neutral tones in linen show the fabric's texture beautifully",
    ],
    redFlags: [
      "Sets where the top is linen but the bottom is polyester",
      "\"Linen blend\" sets with no percentage breakdown",
      "Very cheap linen sets — often thin, see-through quality",
    ],
  },
  "wool-coats": {
    slug: "wool-coats",
    title: "Best Wool Coats & Outerwear in 2026",
    fiber: "Wool",
    category: "outerwear",
    fiberQuery: ["wool", "merino"],
    heroTitle: "Wool Coats",
    heroSubtitle: "Investment outerwear in verified real wool.",
    intro: "A wool coat is one of the most important investments in your wardrobe — it should last a decade or more. But many \"wool\" coats are blended with polyester, which pills, traps odor, and doesn't breathe. We verified every label.",
    buyingTips: [
      "Virgin wool coats are the most durable — first-shearing fiber",
      "Double-faced wool doesn't need a lining — cleaner construction",
      "Wool-cashmere blends add softness while maintaining structure",
      "Italian and British wool mills produce the finest coat fabrics",
    ],
    redFlags: [
      "\"Wool blend\" with more than 40% polyester — pills quickly",
      "Under $200 for a \"wool\" coat — almost certainly mostly synthetic",
      "Acrylic/wool blends marketed as luxury outerwear",
    ],
  },
  "wool-pants": {
    slug: "wool-pants",
    title: "Best Wool Trousers & Pants in 2026",
    fiber: "Wool",
    category: "bottoms",
    fiberQuery: ["wool", "merino"],
    heroTitle: "Wool Trousers",
    heroSubtitle: "Tailored, breathable, and naturally wrinkle-resistant.",
    intro: "Wool trousers are the foundation of smart dressing — they drape beautifully, resist wrinkles, and regulate temperature year-round. We verified every composition to find trousers made from real wool, not synthetic imitations.",
    buyingTips: [
      "Tropical wool (lighter weight) works year-round in most climates",
      "Super 100s–120s wool is the sweet spot for durability and softness",
      "Flannel wool trousers are ideal for fall and winter",
      "Merino wool trousers are the softest — minimal itch",
    ],
    redFlags: [
      "\"Wool blend\" trousers with more than 30% polyester",
      "\"Suiting fabric\" with no composition listed",
      "Very cheap wool trousers — likely recycled or blended wool",
    ],
  },
  "cashmere-knits": {
    slug: "cashmere-knits",
    title: "Best Cashmere Cardigans & Knits in 2026",
    fiber: "Cashmere",
    category: "knitwear",
    fiberQuery: ["cashmere"],
    heroTitle: "Cashmere Cardigans & Knits",
    heroSubtitle: "Beyond sweaters — cardigans, vests, and knit dresses in real cashmere.",
    intro: "Cashmere knitwear goes far beyond the classic crewneck sweater. Cardigans, knit dresses, vests, and wraps — all verified for genuine cashmere content. No acrylic blends marketed as luxury.",
    buyingTips: [
      "2-ply cashmere is more durable and pills less than single-ply",
      "Grade A Mongolian cashmere has fibers under 15.5 microns",
      "Cashmere cardigans are the most versatile — layer over anything",
      "Cashmere vests are underrated — perfect for transitional weather",
    ],
    redFlags: [
      "\"Cashmere touch\" or \"cashmere feel\" — this is acrylic",
      "Under $80 for cashmere — almost certainly blended or recycled",
      "\"Cashmere blend\" with less than 70% cashmere",
    ],
  },
  "cotton-knitwear": {
    slug: "cotton-knitwear",
    title: "Best Cotton Knitwear & Sweaters in 2026",
    fiber: "Cotton",
    category: "knitwear",
    fiberQuery: ["cotton"],
    heroTitle: "Cotton Knitwear",
    heroSubtitle: "Lightweight sweaters and knits in verified cotton.",
    intro: "Cotton knitwear is the year-round alternative to wool — lighter, machine-washable, and naturally hypoallergenic. We verified every composition to find knits made from real cotton, not acrylic or polyester blends.",
    buyingTips: [
      "Pima and Supima cotton knits are softer and more lustrous",
      "Organic cotton knitwear is free from synthetic chemical treatments",
      "Cotton-cashmere blends offer softness at a lower price point",
      "Cable-knit and ribbed cotton sweaters hold their shape well",
    ],
    redFlags: [
      "\"Cotton blend\" with more than 30% acrylic or polyester",
      "Very thin cotton knits that stretch and lose shape after washing",
      "Under $30 for a cotton sweater — likely synthetic blend",
    ],
  },
  "silk-dresses-evening": {
    slug: "silk-dresses-evening",
    title: "Best Silk Dresses for Evening in 2026",
    fiber: "Silk",
    category: "dresses",
    fiberQuery: ["silk"],
    heroTitle: "Silk Evening Dresses",
    heroSubtitle: "Slip dresses, gowns, and cocktail dresses in real silk.",
    intro: "Nothing compares to the drape of a real silk dress for evening wear. Silk charmeuse, silk satin, and silk chiffon catch light differently than any synthetic. We verified every label so you never pay silk prices for polyester.",
    buyingTips: [
      "Silk charmeuse has the classic liquid drape for slip dresses",
      "22+ momme weight for evening dresses — heavier, more luxurious",
      "Silk chiffon layered over silk lining creates beautiful movement",
      "Bias-cut silk dresses flatter the body without clinging",
    ],
    redFlags: [
      "\"Satin dress\" without specifying silk — almost always polyester",
      "Under $150 for a silk evening dress — very likely synthetic",
      "\"Silk-like\" or \"silky\" — marketing terms for polyester",
    ],
  },
};

export const ALL_CURATED_SLUGS = Object.keys(PAGE_CONFIGS);

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

function ProductCard({ product, index }: { product: any; index: number }) {
  const { toggle, isFavorited } = useProductFavorites();
  const productId = String(product.id);
  const saved = isFavorited(productId);
  const brandName = product.brand_name || product.brandName;
  const brandSlug = product.brand_slug || product.brandSlug;
  const imageUrl = product.image_url || product.imageUrl;
  const naturalPercent = product.natural_fiber_percent || product.naturalFiberPercent;

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col"
      data-testid={`card-curated-product-${index}`}
    >
      <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="w-8 h-8 opacity-30" />
          </div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId, brandName, product.price); }}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors z-10"
          data-testid={`button-heart-curated-${index}`}
        >
          <Heart className={`w-4 h-4 transition-colors ${saved ? "fill-red-500 text-red-500" : "text-foreground/60 hover:text-foreground"}`} />
        </button>
        <div className="absolute top-2 left-2">
          <span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
            {naturalPercent}% natural
          </span>
        </div>
      </div>
      <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
        <span
          className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
        >
          {brandName}
        </span>
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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["curated-products", pageSlug],
    queryFn: async () => {
      if (!config) return [];
      const allProducts: any[] = [];
      for (const fiber of config.fiberQuery) {
        const results = await fetchProductsByFiberAndCategory(fiber, config.category);
        allProducts.push(...results);
      }
      const seen = new Set<string>();
      return allProducts.filter((p) => {
        const id = p.product_id || p.productId;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    },
    enabled: !!config,
    staleTime: 10 * 60 * 1000,
  });

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

  const relatedPages = Object.entries(PAGE_CONFIGS)
    .filter(([key]) => key !== pageSlug)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-16">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="pt-6 pb-4">
          <Link href="/materials" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-materials">
            <ChevronLeft className="w-3.5 h-3.5" />
            Fabric Hub
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
              {isLoading ? "Loading..." : `${products.length} Verified Pieces`}
            </h2>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Every composition checked
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-secondary/30 animate-pulse flex flex-col">
                  <div className="aspect-[3/4]" />
                  <div className="p-3 flex flex-col gap-2">
                    <div className="h-3 bg-secondary/60 w-1/3" />
                    <div className="h-4 bg-secondary/50 w-2/3" />
                    <div className="h-3 bg-secondary/40 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.filter((p: any) => p.image_url || p.imageUrl).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {products.filter((p: any) => p.image_url || p.imageUrl).map((product: any, index: number) => (
                <ProductCard key={product.product_id || product.productId || index} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground mb-2">No verified {config.fiber.toLowerCase()} pieces in this category yet.</p>
              <p className="text-xs text-muted-foreground/70">We're actively adding new verified products. Sign up below to get notified.</p>
            </div>
          )}
        </section>

        <section className="py-8 border-t border-border/20">
          <EmailCapture fiber={config.fiber} />
        </section>

        <section className="py-8 border-t border-border/20">
          <h2 className="text-xs uppercase tracking-[0.2em] font-medium mb-4">More Curated Collections</h2>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3">
            {relatedPages.map(([key, cfg]) => (
              <Link
                key={key}
                href={`/materials/${key}`}
                className="flex items-center justify-between gap-2 px-4 py-3.5 md:py-3 border border-border/30 hover:border-foreground/30 active:bg-secondary/50 transition-colors text-sm"
                data-testid={`link-collection-${key}`}
              >
                <span className="text-xs md:text-sm">{cfg.heroTitle}</span>
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
