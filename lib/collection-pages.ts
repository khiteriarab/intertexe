import { MERCH_RAIL_KEYS, type MerchRailKey } from "./merch-feed";
import { EDITORIAL_HERO } from "./editorial-assets";
import { COLLECTION_EDITORIAL } from "./collection-editorial";

export type CollectionSlug =
  | "vacation"
  | "evening"
  | "tailoring"
  | "summer-in-the-city"
  | "white-edit";

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
  "summer-in-the-city": {
    slug: "summer-in-the-city",
    title: "Summer in the City",
    kicker: "Urban",
    description:
      "Downtown luxury. Lightweight. Breathable. The real thing.",
    atmosphere: "Black · white · elevated basics · city movement",
    themes: COLLECTION_EDITORIAL["summer-in-the-city"].themes,
    railKey: MERCH_RAIL_KEYS.summerInCity,
    catalogHref: "/collections/summer-in-the-city",
    catalogLabel: "Browse full city summer collection",
    editorialImage: EDITORIAL_HERO["summer-in-the-city"],
  },
  "white-edit": {
    slug: "white-edit",
    title: "The White Edit",
    kicker: "All white",
    description:
      "White in every form. Ivory. Chalk. Cream. All natural.",
    atmosphere: "Visual calm · editorial restraint · luxury simplicity",
    themes: COLLECTION_EDITORIAL["white-edit"].themes,
    railKey: MERCH_RAIL_KEYS.whiteEdit,
    catalogHref: "/collections/white-edit",
    catalogLabel: "Browse full white edit collection",
    editorialImage: EDITORIAL_HERO["white-edit"],
  },
};

export const COLLECTION_SLUGS = Object.keys(COLLECTION_PAGES) as CollectionSlug[];

export function getCollectionConfig(slug: string): CollectionPageConfig | null {
  if (slug in COLLECTION_PAGES) return COLLECTION_PAGES[slug as CollectionSlug];
  return null;
}
