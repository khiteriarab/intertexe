/**
 * Shared top-level navigation (website; mirrors homepage_merch_rails axes).
 */
export const MERCH_NAV = [
  { name: "New In", href: "/shop?sort=new" },
  {
    name: "Fabrics",
    href: "/materials",
    children: [
      { name: "Silk", href: "/materials/silk" },
      { name: "Linen", href: "/materials/linen" },
      { name: "Cashmere", href: "/materials/cashmere" },
      { name: "Wool", href: "/materials/wool" },
      { name: "Cotton", href: "/materials/cotton" },
    ],
  },
  {
    name: "Collections",
    href: "/materials",
    children: [
      { name: "Vacation", href: "/shop" },
      { name: "Evening", href: "/shop" },
      { name: "Tailoring", href: "/shop" },
    ],
  },
  { name: "Designers", href: "/designers" },
  { name: "Sale", href: "/sale" },
] as const;

/** Homepage section titles keyed by legacy data field */
export const HOMEPAGE_RAIL_LABELS: Record<string, { title: string; subtitle: string }> = {
  newInProducts: { title: "New In", subtitle: "Just landed" },
  silkProducts: { title: "Silk", subtitle: "The Silk Edit" },
  linenProducts: { title: "Linen", subtitle: "Linen for every day" },
  cashmereProducts: { title: "Cashmere", subtitle: "Pure luxury, verified" },
  vacationProducts: { title: "Vacation", subtitle: "Resort-ready natural fabrics" },
  saleProducts: { title: "Sale", subtitle: "Natural fibers, reduced" },
};
