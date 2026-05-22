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
    subtitle: "Resort dressing · linen movement · destination energy",
  },
  {
    slug: "evening",
    label: "Evening",
    href: "/collections/evening",
    railKey: "collections:evening",
    kicker: "After dark",
    subtitle: "Silk draping · jewel tones · candlelit glamour",
  },
  {
    slug: "tailoring",
    label: "Tailoring",
    href: "/collections/tailoring",
    railKey: "collections:tailoring",
    kicker: "Structure",
    subtitle: "Quiet luxury suiting · structure · investment dressing",
  },
  {
    slug: "summer-in-the-city",
    label: "Summer in the City",
    href: "/collections/summer-in-the-city",
    railKey: "collections:summer-in-the-city",
    kicker: "Urban",
    subtitle: "Downtown luxury — lightweight tailoring, elevated basics.",
  },
  {
    slug: "white-edit",
    label: "The White Edit",
    href: "/collections/white-edit",
    railKey: "collections:white-edit",
    kicker: "All white",
    subtitle: "Whites, creams, ivory — expensive minimalism",
  },
] as const;

export const HOMEPAGE_COLLECTION_SLUGS = COLLECTION_SECTIONS.map((c) => c.slug);
