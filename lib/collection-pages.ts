import { MERCH_RAIL_KEYS, type MerchRailKey } from "./merch-feed";
import { EDITORIAL_HERO } from "./editorial-assets";
import { COLLECTION_EDITORIAL } from "./collection-editorial";

export type CollectionSlug =
  | "vacation"
  | "evening"
  | "tailoring"
  | "fall-edit"
  | "leather-edit";

export type CollectionPageConfig = {
  slug: CollectionSlug;
  title: string;
  kicker: string;
  description: string;
  atmosphere: string;
  themes: string[];
  railKey: MerchRailKey;
  catalogHref: string;
  catalogLabel: string;
  editorialImage: string;
};

export const COLLECTION_PAGES: Record<CollectionSlug, CollectionPageConfig> = {
  vacation: {
    slug: "vacation",
    title: "Vacation",
    kicker: "Resort",
    description:
      "Resort dressing for warm water and warm light. Linen that moves. Silk at sunset. Composition verified.",
    atmosphere: "Beach dinners · raffia · white cotton · destination energy",
    themes: COLLECTION_EDITORIAL.vacation.themes,
    railKey: MERCH_RAIL_KEYS.vacation,
    catalogHref: "/collections/vacation",
    catalogLabel: "Browse full vacation collection",
    editorialImage: EDITORIAL_HERO.vacation,
  },
  evening: {
    slug: "evening",
    title: "Evening",
    kicker: "After dark",
    description:
      "For the occasion that deserves the real thing. Silk. Wool crêpe. Verified.",
    atmosphere: "Fluid silhouettes · heels & clutches · cinematic luxury",
    themes: COLLECTION_EDITORIAL.evening.themes,
    railKey: MERCH_RAIL_KEYS.evening,
    catalogHref: "/collections/evening",
    catalogLabel: "Browse full evening collection",
    editorialImage: EDITORIAL_HERO.evening,
  },
  tailoring: {
    slug: "tailoring",
    title: "Tailoring",
    kicker: "Structure",
    description:
      "Investment dressing. The pieces that outlast every trend. Wool. Cashmere. Cotton. Verified.",
    atmosphere: "Masculine/feminine tension · refined minimalism",
    themes: COLLECTION_EDITORIAL.tailoring.themes,
    railKey: MERCH_RAIL_KEYS.tailoring,
    catalogHref: "/collections/tailoring",
    catalogLabel: "Browse full tailoring collection",
    editorialImage: EDITORIAL_HERO.tailoring,
  },
  "fall-edit": {
    slug: "fall-edit",
    title: "The Fall Edit",
    kicker: "September",
    description:
      "Transitional luxury. Cashmere that layers. Suede with weight. Verified.",
    atmosphere: "Cashmere · suede · wool · layered warmth",
    themes: COLLECTION_EDITORIAL["fall-edit"].themes,
    railKey: MERCH_RAIL_KEYS.fallEdit,
    catalogHref: "/collections/fall-edit",
    catalogLabel: "Browse full fall edit collection",
    editorialImage: EDITORIAL_HERO["fall-edit"],
  },
  "leather-edit": {
    slug: "leather-edit",
    title: "The Leather Edit",
    kicker: "Leather & suede",
    description:
      "Leather with weight. Suede with texture. Jackets, skirts, boots — verified natural fiber where it counts.",
    atmosphere: "Leather · suede · shearling · investment outerwear",
    themes: COLLECTION_EDITORIAL["leather-edit"].themes,
    railKey: MERCH_RAIL_KEYS.leatherEdit,
    catalogHref: "/collections/leather-edit",
    catalogLabel: "Browse full leather edit collection",
    editorialImage: EDITORIAL_HERO["leather-edit"],
  },
};

export const COLLECTION_SLUGS = Object.keys(COLLECTION_PAGES) as CollectionSlug[];

export function getCollectionConfig(slug: string): CollectionPageConfig | null {
  if (slug in COLLECTION_PAGES) return COLLECTION_PAGES[slug as CollectionSlug];
  return null;
}
