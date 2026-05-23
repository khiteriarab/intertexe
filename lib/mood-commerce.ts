/**
 * Mood / editorial commerce — NET-A-PORTER style "What to Wear" destinations.
 */
import type { CollectionSlug } from "./collection-pages";

export type MoodSlug =
  | "mediterranean-luxury"
  | "resort-dressing"
  | "linen-movement"
  | "silk-at-sunset"
  | "woven-textures"
  | "raffia-accessories"
  | "beach-dinners"
  | "warm-neutrals"
  | "white-cotton"
  | "destination-energy"
  | "ibiza"
  | "amalfi"
  | "hydra"
  | "st-barths";

export type MoodConfig = {
  slug: MoodSlug;
  label: string;
  kicker: string;
  description: string;
  collection: CollectionSlug;
  /** Passed to collection relevance / shop search */
  searchTerms: string[];
};

export const MOOD_CATALOG: MoodConfig[] = [
  {
    slug: "mediterranean-luxury",
    label: "Mediterranean Luxury",
    kicker: "Coastal elegance",
    description: "Sun-washed linen, fluid silk, and warm neutrals for the Riviera state of mind.",
    collection: "vacation",
    searchTerms: ["mediterranean", "resort", "linen"],
  },
  {
    slug: "resort-dressing",
    label: "Resort Dressing",
    kicker: "Pool to dinner",
    description: "Easy layers, open weaves, and polished resort silhouettes.",
    collection: "vacation",
    searchTerms: ["resort", "vacation", "cover"],
  },
  {
    slug: "linen-movement",
    label: "Linen Movement",
    kicker: "Air & drape",
    description: "Pure linen dresses, tops, and trousers that move with heat and light.",
    collection: "vacation",
    searchTerms: ["linen", "flax"],
  },
  {
    slug: "silk-at-sunset",
    label: "Silk at Sunset",
    kicker: "Golden hour",
    description: "Liquid silk for terraces, dinners, and late coastal evenings.",
    collection: "evening",
    searchTerms: ["silk", "evening", "sunset"],
  },
  {
    slug: "woven-textures",
    label: "Woven Textures",
    kicker: "Tactile craft",
    description: "Basket weaves, crochet, and artisanal surfaces for summer depth.",
    collection: "vacation",
    searchTerms: ["woven", "crochet", "texture"],
  },
  {
    slug: "raffia-accessories",
    label: "Raffia Accessories",
    kicker: "Natural carry",
    description: "Raffia totes and beach bags that complete resort looks.",
    collection: "vacation",
    searchTerms: ["raffia", "straw", "tote"],
  },
  {
    slug: "beach-dinners",
    label: "Beach Dinners",
    kicker: "After sand",
    description: "Elevated ease for candlelit tables by the water.",
    collection: "vacation",
    searchTerms: ["beach", "dinner", "resort"],
  },
  {
    slug: "warm-neutrals",
    label: "Warm Neutrals",
    kicker: "Sand & stone",
    description: "Ecru, camel, and oatmeal tones for layered summer wardrobes.",
    collection: "vacation",
    searchTerms: ["ecru", "sand", "camel", "neutral"],
  },
  {
    slug: "white-cotton",
    label: "White Cotton",
    kicker: "Crisp summer",
    description: "Verified white and ivory cotton — not name-only matches.",
    collection: "white-edit",
    searchTerms: ["white cotton", "ivory cotton"],
  },
  {
    slug: "destination-energy",
    label: "Destination Energy",
    kicker: "Go somewhere",
    description: "Pieces that feel like a ticket to sun, sea, and slow luxury.",
    collection: "vacation",
    searchTerms: ["destination", "resort", "vacation"],
  },
  {
    slug: "ibiza",
    label: "Ibiza",
    kicker: "Island nights",
    description: "Linen, silk, and warm neutrals for Balearic rhythm.",
    collection: "vacation",
    searchTerms: ["ibiza", "resort", "linen"],
  },
  {
    slug: "amalfi",
    label: "Amalfi",
    kicker: "Italian coast",
    description: "Mediterranean polish — stripes, linen, and sunset silk.",
    collection: "vacation",
    searchTerms: ["amalfi", "italian", "linen"],
  },
  {
    slug: "hydra",
    label: "Hydra",
    kicker: "Aegean light",
    description: "Minimal silhouettes in white cotton and fluid linen.",
    collection: "vacation",
    searchTerms: ["hydra", "greek", "linen"],
  },
  {
    slug: "st-barths",
    label: "St. Barths",
    kicker: "Caribbean chic",
    description: "Resort dresses, raffia, and warm-weather tailoring.",
    collection: "vacation",
    searchTerms: ["st barths", "caribbean", "resort"],
  },
];

export function moodBySlug(slug: string): MoodConfig | undefined {
  return MOOD_CATALOG.find((m) => m.slug === slug);
}

export function moodSlugFromLabel(label: string): MoodSlug | null {
  const normalized = label.trim().toLowerCase().replace(/\s+/g, "-");
  const hit = MOOD_CATALOG.find(
    (m) => m.slug === normalized || m.label.toLowerCase() === label.trim().toLowerCase()
  );
  return hit?.slug ?? null;
}
