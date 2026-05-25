/**
 * Shared top-level navigation (website; mirrors homepage_merch_rails axes).
 */
import { COLLECTION_SECTIONS, FABRIC_SECTIONS } from "./site-architecture";

export const MERCH_NAV = [
  { name: "New In", href: "/shop?sort=new" },
  { name: "Shop", href: "/shop" },
  {
    name: "Fabrics",
    href: "/materials",
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
  vacationProducts: { title: "Vacation", subtitle: "Resort dressing · linen movement · destination energy" },
  eveningProducts: { title: "Evening", subtitle: "Silk draping · jewel tones · candlelit glamour" },
  tailoringProducts: { title: "Tailoring", subtitle: "Quiet luxury suiting · structure · investment dressing" },
  summerInCityProducts: { title: "Summer in the City", subtitle: "Downtown luxury · lightweight tailoring" },
  whiteEditProducts: { title: "The White Edit", subtitle: "Whites, creams, ivory — expensive minimalism" },
  saleProducts: { title: "Sale", subtitle: "Natural fibers, reduced" },
};
