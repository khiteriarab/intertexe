import { MERCH_RAIL_KEYS, type MerchRailKey } from "./merch-feed";
import { EDITORIAL_HERO } from "./editorial-assets";

export type EditSlug =
  | "silk"
  | "linen"
  | "cashmere"
  | "evening"
  | "tailoring"
  | "vacation";

export type EditPageConfig = {
  slug: EditSlug;
  title: string;
  kicker: string;
  description: string;
  railKey: MerchRailKey;
  fiber?: "silk" | "linen" | "cashmere" | "wool" | "cotton";
  catalogHref: string;
  catalogLabel: string;
  materialHref?: string;
  editorialImage: string;
  /** Dedicated route when different from /edits/[slug] */
  canonicalPath?: string;
};

export const EDIT_PAGES: Record<EditSlug, EditPageConfig> = {
  silk: {
    slug: "silk",
    title: "The Silk Edit",
    kicker: "In focus",
    description:
      "A curated spotlight of silk pieces on the homepage — not the full silk catalog. Every piece is checked for natural-fiber composition.",
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
      "Light, airy linen for every day — a small curated rail. Browse the full linen catalog when you want every dress, top, and pant.",
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
      "Soft warmth from genuine cashmere blends — homepage curation, not the entire cashmere shop.",
    railKey: MERCH_RAIL_KEYS.cashmere,
    fiber: "cashmere",
    catalogHref: "/shop?fiber=cashmere",
    catalogLabel: "Shop all cashmere",
    materialHref: "/materials/cashmere",
    editorialImage: EDITORIAL_HERO.cashmere,
  },
  evening: {
    slug: "evening",
    title: "The Evening Edit",
    kicker: "After dark",
    description:
      "Polished silhouettes for evening — fluid silk and elevated natural fibers, hand-picked for the homepage.",
    railKey: MERCH_RAIL_KEYS.evening,
    catalogHref: "/shop?fiber=silk&category=dresses",
    catalogLabel: "Shop evening dresses",
    editorialImage: EDITORIAL_HERO.silk,
  },
  tailoring: {
    slug: "tailoring",
    title: "The Tailoring Edit",
    kicker: "Structure",
    description:
      "Sharp lines in wool, linen, and cotton — tailored pieces with verified natural-fiber content.",
    railKey: MERCH_RAIL_KEYS.tailoring,
    catalogHref: "/shop?category=outerwear",
    catalogLabel: "Shop tailoring",
    editorialImage: EDITORIAL_HERO.linen,
  },
  vacation: {
    slug: "vacation",
    title: "The Vacation Edit",
    kicker: "Resort",
    description: "Linen dresses and skirts for warm weather.",
    railKey: MERCH_RAIL_KEYS.vacation,
    fiber: "linen",
    catalogHref: "/shop?fiber=linen&category=dresses",
    catalogLabel: "Shop all linen dresses",
    canonicalPath: "/vacation",
    editorialImage: EDITORIAL_HERO.vacation,
  },
};

export function getEditConfig(slug: string): EditPageConfig | null {
  if (slug in EDIT_PAGES) return EDIT_PAGES[slug as EditSlug];
  return null;
}

export const EDIT_SLUGS = Object.keys(EDIT_PAGES) as EditSlug[];
