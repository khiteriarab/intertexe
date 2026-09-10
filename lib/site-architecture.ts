/**
 * Canonical INTERTEXE information architecture (web + iOS + Supabase homepage_merch_rails).
 */

export const TOP_LEVEL_NAV = [
  "New In",
  "Fabrics",
  "Collections",
  "Designers",
  "Sale",
] as const;

export const FABRIC_SECTIONS = [
  { slug: "silk", label: "Silk", href: "/materials/silk", railKey: "fabrics:silk" },
  { slug: "linen", label: "Linen", href: "/materials/linen", railKey: "fabrics:linen" },
  { slug: "cashmere", label: "Cashmere", href: "/materials/cashmere", railKey: "fabrics:cashmere" },
  { slug: "wool", label: "Wool", href: "/materials/wool", railKey: "fabrics:wool" },
  { slug: "cotton", label: "Cotton", href: "/materials/cotton", railKey: "fabrics:cotton" },
  {
    slug: "leather",
    label: "Leather",
    href: "/materials/leather",
    railKey: "fabrics:leather",
  },
] as const;

export const COLLECTION_SECTIONS = [
  {
    slug: "vacation",
    label: "Vacation",
    href: "/collections/vacation",
    railKey: "collections:vacation",
    kicker: "Resort",
    subtitle: "Resort dressing for warm water and warm light. Linen that moves. Silk at sunset. Composition verified.",
  },
  {
    slug: "evening",
    label: "Evening",
    href: "/collections/evening",
    railKey: "collections:evening",
    kicker: "After dark",
    subtitle: "For the occasion that deserves the real thing. Silk. Wool crêpe. Verified.",
  },
  {
    slug: "tailoring",
    label: "Tailoring",
    href: "/collections/tailoring",
    railKey: "collections:tailoring",
    kicker: "Structure",
    subtitle: "Investment dressing. The pieces that outlast every trend. Wool. Cashmere. Cotton. Verified.",
  },
  {
    slug: "fall-edit",
    label: "The Fall Edit",
    href: "/collections/fall-edit",
    railKey: "collections:fall-edit",
    kicker: "September",
    subtitle: "Transitional luxury. Cashmere that layers. Suede with weight. Verified.",
  },
  {
    slug: "leather-edit",
    label: "The Leather Edit",
    href: "/collections/leather-edit",
    railKey: "collections:leather-edit",
    kicker: "Leather & suede",
    subtitle: "Leather with weight. Suede with texture. Jackets, skirts, boots — verified.",
  },
] as const;

export type CollectionSectionConfig = (typeof COLLECTION_SECTIONS)[number];

export const HOMEPAGE_COLLECTION_SLUGS = COLLECTION_SECTIONS.map((c) => c.slug);
