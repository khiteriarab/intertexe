import { MERCH_RAIL_KEYS, type MerchRailKey } from "./merch-feed";
import { EDITORIAL_HERO } from "./editorial-assets";

export type FabricEditSlug = "silk" | "linen" | "cashmere" | "wool" | "cotton" | "leather-suede";

export type EditSlug = FabricEditSlug | "evening" | "tailoring" | "vacation";

export type ShopFiber = "silk" | "linen" | "cashmere" | "wool" | "cotton" | "leather-suede";

export type EditPageConfig = {
  slug: EditSlug;
  title: string;
  kicker: string;
  description: string;
  railKey: MerchRailKey;
  /** Body-composition check */
  fiber?: ShopFiber;
  /** `catalog_list` / shop fiber param (defaults to fiber) */
  shopFiber?: ShopFiber;
  catalogHref: string;
  catalogLabel: string;
  materialHref?: string;
  editorialImage: string;
  /** Redirect to canonical route when different from /edits/[slug] */
  canonicalPath?: string;
};

export const FABRIC_EDIT_SLUGS: FabricEditSlug[] = [
  "silk",
  "linen",
  "cashmere",
  "wool",
  "cotton",
  "leather-suede",
];

export const EDIT_PAGES: Record<EditSlug, EditPageConfig> = {
  silk: {
    slug: "silk",
    title: "The Silk Edit",
    kicker: "In focus",
    description:
      "Fluid, luminous silk — every piece verified for natural-fiber composition. Full catalog with pagination.",
    railKey: MERCH_RAIL_KEYS.silk,
    fiber: "silk",
    catalogHref: "/shop?fiber=silk",
    catalogLabel: "Shop all silk",
    materialHref: "/materials/silk",
    editorialImage: EDITORIAL_HERO.silk,
  },
  linen: {
    slug: "linen",
    title: "The Linen Edit",
    kicker: "The edit",
    description:
      "Breathable linen for every day — dresses, tops, skirts, and pants with verified composition.",
    railKey: MERCH_RAIL_KEYS.linen,
    fiber: "linen",
    catalogHref: "/shop?fiber=linen",
    catalogLabel: "Shop all linen",
    materialHref: "/materials/linen",
    editorialImage: EDITORIAL_HERO.linen,
  },
  cashmere: {
    slug: "cashmere",
    title: "The Cashmere Edit",
    kicker: "Pure luxury",
    description:
      "Soft warmth from genuine cashmere — the full verified cashmere catalog.",
    railKey: MERCH_RAIL_KEYS.cashmere,
    fiber: "cashmere",
    catalogHref: "/shop?fiber=cashmere",
    catalogLabel: "Shop all cashmere",
    materialHref: "/materials/cashmere",
    editorialImage: EDITORIAL_HERO.cashmere,
  },
  wool: {
    slug: "wool",
    title: "The Wool Edit",
    kicker: "Structure",
    description:
      "Wool and merino with verified composition — sweaters, coats, and tailored pieces.",
    railKey: MERCH_RAIL_KEYS.wool,
    fiber: "wool",
    catalogHref: "/shop?fiber=wool",
    catalogLabel: "Shop all wool",
    materialHref: "/materials/wool",
    editorialImage: EDITORIAL_HERO.wool,
  },
  cotton: {
    slug: "cotton",
    title: "The Cotton Edit",
    kicker: "Everyday",
    description:
      "Premium cotton dresses, tops, and essentials — full catalog, composition verified.",
    railKey: MERCH_RAIL_KEYS.cotton,
    fiber: "cotton",
    catalogHref: "/shop?fiber=cotton",
    catalogLabel: "Shop all cotton",
    materialHref: "/materials/cotton",
    editorialImage: EDITORIAL_HERO.cotton,
  },
  "leather-suede": {
    slug: "leather-suede",
    title: "Leather & Suede",
    kicker: "Texture",
    description:
      "Leather and suede apparel with verified natural-fiber context — full shoppable catalog.",
    railKey: MERCH_RAIL_KEYS.leatherSuede,
    fiber: "leather-suede",
    shopFiber: "leather-suede",
    catalogHref: "/shop?fiber=leather",
    catalogLabel: "Shop leather & suede",
    materialHref: "/materials/leather-suede",
    editorialImage: EDITORIAL_HERO["leather-suede"],
  },
  evening: {
    slug: "evening",
    title: "The Evening Edit",
    kicker: "After dark",
    description:
      "Elevated night dressing — silk draping, jewel tones, and candlelit glamour.",
    railKey: MERCH_RAIL_KEYS.evening,
    catalogHref: "/collections/evening",
    catalogLabel: "Shop the Evening collection",
    canonicalPath: "/collections/evening",
    editorialImage: EDITORIAL_HERO.evening,
  },
  tailoring: {
    slug: "tailoring",
    title: "The Tailoring Edit",
    kicker: "Structure",
    description:
      "Sharp structure and quiet luxury — suiting and investment tailoring.",
    railKey: MERCH_RAIL_KEYS.tailoring,
    catalogHref: "/collections/tailoring",
    catalogLabel: "Shop the Tailoring collection",
    canonicalPath: "/collections/tailoring",
    editorialImage: EDITORIAL_HERO.tailoring,
  },
  vacation: {
    slug: "vacation",
    title: "The Vacation Edit",
    kicker: "Resort",
    description: "Mediterranean resort dressing — linen, cotton, and silk for warm destinations.",
    railKey: MERCH_RAIL_KEYS.vacation,
    catalogHref: "/collections/vacation",
    catalogLabel: "Shop the Vacation collection",
    canonicalPath: "/collections/vacation",
    editorialImage: EDITORIAL_HERO.vacation,
  },
};

export function getEditConfig(slug: string): EditPageConfig | null {
  if (slug in EDIT_PAGES) return EDIT_PAGES[slug as EditSlug];
  return null;
}

export const EDIT_SLUGS = Object.keys(EDIT_PAGES) as EditSlug[];
