import type { Metadata } from "next";
import Link from "next/link";
import { fetchProductsByFiberAndCategory, fetchDesigners, fetchProductCount } from "../../../lib/supabase-server";
import { MATERIALS } from "../../../lib/data";

export const dynamic = "force-dynamic";

const MAIN_FIBERS = ["silk", "cotton", "linen", "wool", "cashmere"];

const FIBER_QUERIES: Record<string, string[]> = {
  cotton: ["cotton"],
  silk: ["silk"],
  linen: ["linen", "flax"],
  wool: ["wool", "merino"],
  cashmere: ["cashmere"],
};

const SEO_CONTENT: Record<string, { title: string; h1: string; intro: string; metaDesc: string; tagline: string }> = {
  silk: {
    title: "Best Silk Clothing 2026 — Verified Silk Dresses, Tops & More",
    h1: "Shop Verified Silk Clothing",
    intro: "Every silk piece verified by INTERTEXE. Real silk composition percentages, no guesswork. Browse silk dresses, silk tops, silk blouses, and more from the best brands — all checked for natural fiber content.",
    metaDesc: "Shop the best silk dresses, silk tops, silk blouses and silk clothing in 2026. Every product verified for real silk content. Compare silk compositions across 11,000+ luxury and contemporary brands.",
    tagline: "Luxurious drape, timeless",
  },
  cotton: {
    title: "Best Cotton Clothing 2026 — Verified Cotton Tops, Dresses & More",
    h1: "Shop Verified Cotton Clothing",
    intro: "Premium cotton pieces from brands that prioritize material quality. Every cotton composition verified — 100% cotton, organic cotton, and high-cotton blends from brands that don't cut corners.",
    metaDesc: "Shop the best cotton clothing in 2026. Verified cotton dresses, cotton tops, cotton shirts and more. Compare cotton compositions across 11,000+ brands. No synthetic surprises.",
    tagline: "The foundation of every wardrobe",
  },
  linen: {
    title: "Best Linen Clothing 2026 — Verified Linen Dresses, Tops & More",
    h1: "Shop Verified Linen Clothing",
    intro: "The best linen pieces for 2026, verified for actual linen content. Pure linen dresses, linen tops, linen pants, and linen blends from brands known for quality natural fibers.",
    metaDesc: "Shop the best linen dresses, linen tops, linen pants and linen clothing in 2026. Every product verified for real linen/flax content across 11,000+ curated brands.",
    tagline: "Light, airy, effortless",
  },
  wool: {
    title: "Best Wool Clothing 2026 — Verified Wool Sweaters, Coats & More",
    h1: "Shop Verified Wool Clothing",
    intro: "Premium wool and merino pieces from brands that use real wool — not synthetic imitations. Wool sweaters, wool coats, wool trousers, all verified for natural fiber content.",
    metaDesc: "Shop the best wool sweaters, wool coats, merino wool clothing in 2026. Every product verified for real wool content. Compare compositions across 11,000+ brands.",
    tagline: "Warm, structured, seasonless",
  },
  cashmere: {
    title: "Best Cashmere Clothing 2026 — Verified Cashmere Sweaters & More",
    h1: "Shop Verified Cashmere Clothing",
    intro: "Luxury cashmere from brands that use genuine cashmere — not 5% cashmere blends marketed as 'cashmere.' Every piece verified for actual cashmere content. Cashmere sweaters, cashmere scarves, and more.",
    metaDesc: "Shop the best cashmere sweaters, cashmere knits, and cashmere clothing in 2026. Verified for real cashmere content. Compare compositions across luxury and contemporary brands.",
    tagline: "The softest fiber in the world",
  },
};

const CATEGORY_LINKS: Record<string, { label: string; slug: string }[]> = {
  silk: [
    { label: "Dresses", slug: "silk-dresses" },
    { label: "Tops", slug: "silk-tops" },
    { label: "Blouses", slug: "silk-blouses" },
    { label: "Skirts", slug: "silk-skirts" },
  ],
  cotton: [
    { label: "Dresses", slug: "cotton-dresses" },
    { label: "Tops", slug: "cotton-tops" },
    { label: "Shirts", slug: "cotton-shirts" },
    { label: "Pants", slug: "cotton-pants" },
    { label: "Knitwear", slug: "cotton-knitwear" },
  ],
  linen: [
    { label: "Dresses", slug: "linen-dresses" },
    { label: "Tops", slug: "linen-tops" },
    { label: "Shirts", slug: "linen-shirts" },
    { label: "Pants", slug: "linen-pants" },
    { label: "Sets", slug: "linen-sets" },
  ],
  wool: [
    { label: "Sweaters", slug: "wool-sweaters" },
    { label: "Coats", slug: "wool-coats" },
    { label: "Pants", slug: "wool-pants" },
  ],
  cashmere: [
    { label: "Sweaters", slug: "cashmere-sweaters" },
    { label: "Knits", slug: "cashmere-knits" },
  ],
};

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

const ALL_CURATED_SLUGS = Object.keys(PAGE_CONFIGS);

function getParentFiber(slug: string): string | null {
  const config = PAGE_CONFIGS[slug];
  if (!config) return null;
  return config.fiber.toLowerCase();
}

export async function generateStaticParams() {
  const params = [
    ...MAIN_FIBERS.map(slug => ({ slug })),
    ...ALL_CURATED_SLUGS.map(slug => ({ slug })),
  ];
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const isMainFiber = MAIN_FIBERS.includes(slug);

  if (isMainFiber) {
    const seo = SEO_CONTENT[slug];
    return {
      title: seo?.title || `${slug.charAt(0).toUpperCase() + slug.slice(1)} Clothing`,
      description: seo?.metaDesc || `Shop verified ${slug} clothing. Every product checked for real ${slug} content.`,
      alternates: { canonical: `https://www.intertexe.com/materials/${slug}` },
    };
  }

  const config = PAGE_CONFIGS[slug];
  if (config) {
    return {
      title: config.title,
      description: config.intro.slice(0, 160),
      alternates: { canonical: `https://www.intertexe.com/materials/${slug}` },
    };
  }

  return {
    title: "Material",
    alternates: { canonical: `https://www.intertexe.com/materials/${slug}` },
  };
}

export default async function MaterialSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const isMainFiber = MAIN_FIBERS.includes(slug);

  if (isMainFiber) {
    return <MainFiberPage slug={slug} />;
  }

  const config = PAGE_CONFIGS[slug];
  if (config) {
    return <SubcategoryPage slug={slug} config={config} />;
  }

  return (
    <div className="py-20 text-center flex flex-col items-center gap-6">
      <h1 className="text-3xl font-serif">Material Not Found</h1>
      <Link href="/materials" className="text-xs uppercase tracking-widest border-b border-foreground pb-1">
        Back to Materials
      </Link>
    </div>
  );
}

async function MainFiberPage({ slug }: { slug: string }) {
  const material = MATERIALS.find(m => m.slug === slug);
  const seo = SEO_CONTENT[slug];
  const fiberQueries = FIBER_QUERIES[slug] || [slug];
  const categoryLinks = CATEGORY_LINKS[slug] || [];

  const [products, designers, productCount] = await Promise.all([
    (async () => {
      const allProducts: any[] = [];
      for (const fiber of fiberQueries) {
        const results = await fetchProductsByFiberAndCategory(fiber);
        allProducts.push(...results);
      }
      const seen = new Set<string>();
      return allProducts.filter((p) => {
        const id = p.productId || p.id;
        if (seen.has(id)) return false;
        if (!p.imageUrl) return false;
        seen.add(id);
        return true;
      });
    })(),
    fetchDesigners(undefined, 200),
    fetchProductCount(),
  ]);

  const brandCount = new Set(products.map((p: any) => p.brandSlug)).size;

  const relatedDesigners = designers
    .filter((d) => d.naturalFiberPercent != null && (d.naturalFiberPercent as number) > 70)
    .sort((a, b) => ((b.naturalFiberPercent || 0) - (a.naturalFiberPercent || 0)))
    .slice(0, 8);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.intertexe.com/" },
      { "@type": "ListItem", position: 2, name: "Materials", item: "https://www.intertexe.com/materials" },
      { "@type": "ListItem", position: 3, name: material?.name || slug },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: seo?.h1 || `${material?.name || slug} Clothing`,
    description: seo?.metaDesc || `Verified ${slug} clothing from top brands.`,
    url: `https://www.intertexe.com/materials/${slug}`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 50).map((product: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: product.url,
    })),
  };

  const displayProducts = products.slice(0, 48);
  const fiberName = material?.name || slug.charAt(0).toUpperCase() + slug.slice(1);

  return (
    <div className="flex flex-col gap-0" data-testid={`page-material-${slug}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <section className="pt-8 md:pt-14 pb-6 md:pb-8 max-w-5xl mx-auto w-full px-4">
        <Link href="/materials" className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors self-start py-1 mb-6" data-testid="link-back-materials">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          All Materials
        </Link>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">{seo?.tagline || ""}</p>
        <h1 className="text-3xl md:text-5xl font-serif leading-tight mb-3" data-testid="text-material-name">
          {seo?.h1 || `Shop ${fiberName}`}
        </h1>
        <p className="text-[13px] md:text-base text-muted-foreground leading-relaxed max-w-2xl">
          {seo?.intro || material?.description || ""}
        </p>
        <p className="text-[11px] text-muted-foreground mt-4">
          {products.length} verified pieces from {brandCount} brands
        </p>
      </section>

      <section className="bg-[#FAFAF8] border-y border-border/30">
        <div className="max-w-5xl mx-auto w-full px-4 py-4 md:py-5 flex items-center gap-3 overflow-x-auto">
          <Link
            href={`/materials/${slug}`}
            className="flex-shrink-0 px-4 py-2 text-[11px] uppercase tracking-[0.12em] font-medium bg-[#111] text-white"
            data-testid="filter-all"
          >
            All
          </Link>
          {categoryLinks.map((cat) => (
            <Link
              key={cat.slug}
              href={`/materials/${cat.slug}`}
              className="flex-shrink-0 px-4 py-2 text-[11px] uppercase tracking-[0.12em] font-medium bg-white border border-neutral-200 text-foreground/70 hover:border-neutral-400 transition-colors"
              data-testid={`filter-${cat.slug}`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full px-4 py-8 md:py-10" data-testid="section-shop-fabric">
        {displayProducts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">No {fiberName.toLowerCase()} products found yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {displayProducts.map((product: any, index: number) => (
                <a
                  key={product.productId || index}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col"
                  data-testid={`card-fabric-product-${index}`}
                >
                  <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={`${product.name} by ${product.brandName}`} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                      </div>
                    )}
                    {product.naturalFiberPercent > 0 && (
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm ${product.naturalFiberPercent >= 90 ? "bg-emerald-900/90 text-emerald-100" : product.naturalFiberPercent >= 70 ? "bg-emerald-800/80 text-emerald-100" : "bg-amber-800/80 text-amber-100"}`}>
                          {product.naturalFiberPercent}% natural
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{product.brandName}</span>
                    <h3 className="text-xs md:text-sm leading-snug font-medium line-clamp-2">{product.name}</h3>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{product.composition}</p>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="text-sm font-medium">{product.price}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-foreground transition-colors"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {products.length > 48 && (
              <div className="text-center mt-8">
                <p className="text-xs text-muted-foreground">Showing 48 of {products.length} verified pieces</p>
              </div>
            )}
          </>
        )}
      </section>

      {material && (
        <section className="bg-foreground text-background" data-testid="section-buying-rules">
          <div className="max-w-5xl mx-auto w-full px-4 py-10 md:py-14 flex flex-col gap-6 md:gap-8">
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-background/50">The INTERTEXE Buying Guide</p>
              <h2 className="text-2xl md:text-3xl font-serif">How to Buy {material.name} — What to Look For</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="flex flex-col gap-3" data-testid="section-look-for">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-background/70"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Look For</h3>
                </div>
                <ul className="flex flex-col gap-2">
                  {material.buyingRules.lookFor.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-background/80">
                      <span className="w-1 h-1 bg-background/40 rounded-full mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3" data-testid="section-avoid">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-background/70"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Avoid</h3>
                </div>
                <ul className="flex flex-col gap-2">
                  {material.buyingRules.avoid.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-background/80">
                      <span className="w-1 h-1 bg-background/40 rounded-full mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4 border-t border-background/10" data-testid="section-red-flags">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-background/70"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Red Flags</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {material.buyingRules.redFlags.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-background/80">
                    <span className="w-1 h-1 bg-background/40 rounded-full mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2 pt-4 border-t border-background/10" data-testid="section-price-guidance">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-background/70"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Price Guidance</h3>
              </div>
              <p className="text-sm text-background/80 leading-relaxed">{material.buyingRules.priceGuidance}</p>
            </div>
          </div>
        </section>
      )}

      {relatedDesigners.length > 0 && (
        <section className="max-w-5xl mx-auto w-full px-4 py-10 md:py-14 flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">INTERTEXE Approved</p>
            <h2 className="text-2xl md:text-3xl font-serif">Best Brands for {fiberName}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-6">
            {relatedDesigners.map((designer) => (
              <Link key={designer.id} href={`/designers/${designer.slug}`} className="group flex flex-col gap-2.5" data-testid={`card-designer-${designer.slug}`}>
                <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
                    <span className="text-lg font-serif text-neutral-500">{designer.name.charAt(0)}</span>
                  </div>
                  {designer.naturalFiberPercent != null && (
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 md:p-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                      <span className="px-2 py-0.5 text-[8px] md:text-[9px] uppercase tracking-[0.1em] font-medium bg-emerald-900/90 text-emerald-100">
                        {designer.naturalFiberPercent}% Natural
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-serif group-hover:text-muted-foreground transition-colors leading-tight">{designer.name}</h3>
                  {designer.naturalFiberPercent != null && (
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                      {designer.naturalFiberPercent}% Natural
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {material && (
        <section className="border-y border-border/40">
          <div className="max-w-5xl mx-auto w-full px-4 py-8 md:py-12 flex flex-col gap-6 md:gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">About {material.name}</h3>
                <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{material.origin}</p>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Characteristics</h3>
                <div className="flex flex-wrap gap-2">
                  {material.characteristics.map((char, i) => (
                    <span key={i} className="px-3 py-1.5 bg-secondary/60 text-xs text-foreground/70">{char}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border/30">
              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Sustainability</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{material.sustainability}</p>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">Care Instructions</h3>
                <ul className="flex flex-col gap-1.5">
                  {material.careInstructions.map((care, i) => (
                    <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                      <span className="w-1 h-1 bg-foreground/30 rounded-full mt-2 flex-shrink-0" />
                      {care}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-5xl mx-auto w-full px-4 py-10 md:py-14">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Explore Other Fabrics</h3>
        <div className="flex flex-wrap gap-2">
          {MAIN_FIBERS.filter(f => f !== slug).map((fiber) => (
            <Link
              key={fiber}
              href={`/materials/${fiber}`}
              className="px-5 py-2.5 border border-border/40 text-[11px] uppercase tracking-[0.15em] hover:border-foreground hover:text-foreground transition-colors"
              data-testid={`link-fabric-${fiber}`}
            >
              {fiber.charAt(0).toUpperCase() + fiber.slice(1)}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

async function SubcategoryPage({ slug, config }: { slug: string; config: PageConfig }) {
  const parentFiber = getParentFiber(slug);

  const allProducts: any[] = [];
  for (const fiber of config.fiberQuery) {
    const results = await fetchProductsByFiberAndCategory(fiber, config.category);
    allProducts.push(...results);
  }
  const seen = new Set<string>();
  const products = allProducts.filter((p) => {
    const id = p.productId || p.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const productsWithImages = products.filter((p: any) => p.imageUrl);

  const parentName = parentFiber ? parentFiber.charAt(0).toUpperCase() + parentFiber.slice(1) : config.fiber;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.intertexe.com/" },
      { "@type": "ListItem", position: 2, name: "Materials", item: "https://www.intertexe.com/materials" },
      ...(parentFiber ? [{ "@type": "ListItem", position: 3, name: parentName, item: `https://www.intertexe.com/materials/${parentFiber}` }] : []),
      { "@type": "ListItem", position: parentFiber ? 4 : 3, name: config.heroTitle },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: config.heroTitle,
    description: config.intro.slice(0, 200),
    url: `https://www.intertexe.com/materials/${slug}`,
    numberOfItems: productsWithImages.length,
    itemListElement: productsWithImages.slice(0, 50).map((product: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: product.url,
    })),
  };

  const relatedPages = Object.entries(PAGE_CONFIGS)
    .filter(([key]) => key !== slug)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-16" data-testid={`page-curated-${slug}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="pt-6 pb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/materials" className="hover:text-foreground transition-colors" data-testid="link-back-materials">
            Materials
          </Link>
          <span>/</span>
          {parentFiber && (
            <>
              <Link href={`/materials/${parentFiber}`} className="hover:text-foreground transition-colors" data-testid="link-back-parent">
                {parentName}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground">{config.heroTitle}</span>
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
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
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
              {productsWithImages.length} Verified Pieces
            </h2>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Every composition checked
            </span>
          </div>

          {productsWithImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {productsWithImages.map((product: any, index: number) => (
                <a
                  key={product.productId || index}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col"
                  data-testid={`card-curated-product-${index}`}
                >
                  <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      loading="lazy"
                    />
                    {product.naturalFiberPercent > 0 && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">
                          {product.naturalFiberPercent}% natural
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{product.brandName}</span>
                    <h3 className="text-xs md:text-sm leading-snug font-medium line-clamp-2">{product.name}</h3>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{product.composition}</p>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="text-sm font-medium">{product.price}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-foreground transition-colors"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground mb-2">No verified {config.fiber.toLowerCase()} pieces in this category yet.</p>
              <p className="text-xs text-muted-foreground/70">We&apos;re actively adding new verified products. Sign up below to get notified.</p>
            </div>
          )}
        </section>

        <section className="py-8 border-t border-border/20">
          <div className="flex flex-col gap-4 p-6 md:p-8 bg-secondary/30 border border-border/20">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/60"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <h3 className="text-xs uppercase tracking-[0.2em] font-medium">Get notified</h3>
            </div>
            <p className="text-sm text-foreground/70">
              We add new verified pieces every week. Get notified when we find {config.fiber.toLowerCase()} items that meet our standards.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 bg-background border border-border/40 text-sm focus:outline-none focus:border-foreground/40 transition-colors"
                data-testid="input-email-capture"
              />
              <button
                type="button"
                className="px-6 py-3 bg-foreground text-background text-xs uppercase tracking-widest hover:bg-foreground/90 transition-colors"
                data-testid="button-email-submit"
              >
                Notify Me
              </button>
            </div>
          </div>
        </section>

        {parentFiber && (
          <section className="py-8 border-t border-border/20">
            <Link
              href={`/materials/${parentFiber}`}
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] font-medium hover:gap-3 transition-all"
              data-testid="link-back-parent-bottom"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              All {parentName} Clothing
            </Link>
          </section>
        )}

        <section className="py-8 border-t border-border/20">
          <h2 className="text-xs uppercase tracking-[0.2em] font-medium mb-4">More Curated Collections</h2>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3">
            {relatedPages.map(([key, cfg]) => (
              <Link
                key={key}
                href={`/materials/${key}`}
                className="flex items-center justify-between gap-2 px-4 py-3.5 md:py-3 border border-border/30 hover:border-foreground/30 transition-colors text-sm"
                data-testid={`link-collection-${key}`}
              >
                <span className="text-xs md:text-sm">{cfg.heroTitle}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
