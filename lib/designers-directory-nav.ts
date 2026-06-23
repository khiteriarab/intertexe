/** Net-a-Porter–style Designers menu + directory spotlight (web only). */

export const DESIGNERS_SPOTLIGHT = {
  slug: "re-done",
  name: "Re/Done",
  headline: "Spotlight on: Re/Done",
  cta: "Shop the collection",
  imageUrl: "/brands/re-done.png",
  href: "/designers/re-done",
} as const;

export type DesignersMenuLink = {
  name: string;
  href: string;
  slug?: string | null;
};

export const DESIGNERS_MENU_FEATURED: DesignersMenuLink[] = [
  { name: "All Designers", href: "/designers", slug: null },
  { name: "The Row", href: "/designers/the-row", slug: "the-row" },
  { name: "Isabel Marant", href: "/designers/isabel-marant", slug: "isabel-marant" },
  { name: "Zimmermann", href: "/designers/zimmermann", slug: "zimmermann" },
  { name: "Totême", href: "/designers/toteme", slug: "toteme" },
  { name: "Brunello Cucinelli", href: "/designers/brunello-cucinelli", slug: "brunello-cucinelli" },
  { name: "Reformation", href: "/designers/reformation", slug: "reformation" },
  { name: "Vince", href: "/designers/vince", slug: "vince" },
  { name: "Frame", href: "/designers/frame", slug: "frame" },
  { name: "Re/Done", href: "/designers/re-done", slug: "re-done" },
];

export const DESIGNERS_MENU_OUR_PICKS: DesignersMenuLink[] = [
  { name: "Acne Studios", href: "/designers/acne-studios", slug: "acne-studios" },
  { name: "AGOLDE", href: "/designers/agolde", slug: "agolde" },
  { name: "Ganni", href: "/designers/ganni", slug: "ganni" },
  { name: "Faithfull The Brand", href: "/designers/faithfull-the-brand", slug: "faithfull-the-brand" },
  { name: "Staud", href: "/designers/staud", slug: "staud" },
  { name: "Theory", href: "/designers/theory", slug: "theory" },
  { name: "L'Agence", href: "/designers/l-agence", slug: "l-agence" },
  { name: "Citizens of Humanity", href: "/designers/citizens-of-humanity", slug: "citizens-of-humanity" },
];
