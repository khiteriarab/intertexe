/**
 * Shared top-level navigation (website; mirrors homepage_merch_rails axes).
 */
import { COLLECTION_SECTIONS, FABRIC_SECTIONS } from "./site-architecture";

export const MERCH_NAV = [
  { name: "New In", href: "/shop?sort=new" },
  {
    name: "Shop",
    href: "/shop",
    children: FABRIC_SECTIONS.map((f) => ({ name: f.label, href: f.href })),
  },
  {
    name: "Collections",
    href: "/collections/vacation",
    children: COLLECTION_SECTIONS.map((c) => ({ name: c.label, href: c.href })),
  },
  { name: "Designers", href: "/designers" },
  { name: "Sale", href: "/sale" },
] as const;

/** Legacy field labels — prefer collection rails on homepage. */
export const HOMEPAGE_RAIL_LABELS: Record<string, { title: string; subtitle: string }> = {
  newInProducts: { title: "New In", subtitle: "Just landed" },
  vacationProducts: {
    title: "Vacation",
    subtitle: "Resort dressing for warm water and warm light. Linen that moves. Silk at sunset. Composition verified.",
  },
  eveningProducts: {
    title: "Evening",
    subtitle: "For the occasion that deserves the real thing. Silk. Wool crêpe. Verified.",
  },
  tailoringProducts: {
    title: "Tailoring",
    subtitle: "Investment dressing. The pieces that outlast every trend. Wool. Cashmere. Cotton. Verified.",
  },
  summerInCityProducts: {
    title: "Summer in the City",
    subtitle: "Downtown luxury. Lightweight. Breathable. The real thing.",
  },
  whiteEditProducts: {
    title: "The White Edit",
    subtitle: "White in every form. Ivory. Chalk. Cream. All natural.",
  },
  saleProducts: { title: "Sale", subtitle: "Natural fibers, reduced" },
};
