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
    slug: "leather-suede",
    label: "Leather & Suede",
    href: "/shop?fiber=leather",
    railKey: "fabrics:leather-suede",
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
    slug: "summer-in-the-city",
    label: "Summer in the City",
    href: "/collections/summer-in-the-city",
    railKey: "collections:summer-in-the-city",
    kicker: "Urban",
    subtitle: "Downtown luxury. Lightweight. Breathable. The real thing.",
  },
  {
    slug: "white-edit",
    label: "The White Edit",
    href: "/collections/white-edit",
    railKey: "collections:white-edit",
    kicker: "All white",
    subtitle: "White in every form. Ivory. Chalk. Cream. All natural.",
  },
] as const;

export type CollectionSectionConfig = (typeof COLLECTION_SECTIONS)[number];

export const HOMEPAGE_COLLECTION_SLUGS = COLLECTION_SECTIONS.map((c) => c.slug);
