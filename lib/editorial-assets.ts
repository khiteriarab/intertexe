/**
 * Editorial campaign imagery from carried designers (hosted on intertexe.com).
 * Use dedicated editorial art — not logos or unrelated brand stills.
 */

const BASE = "https://www.intertexe.com";

export const EDITORIAL_HERO = {
  silk: `${BASE}/editorial-silk.png`,
  linen: `${BASE}/editorial-linen.png`,
  cashmere: `${BASE}/editorial-cashmere.jpg`,
  wool: `${BASE}/brands/theory.jpg`,
  cotton: `${BASE}/brands/l-agence.jpg`,
  "leather-suede": `${BASE}/brands/staud.jpg`,
  vacation: `${BASE}/editorial-vacation.jpg`,
  evening: `${BASE}/editorial-silk.png`,
  tailoring: `${BASE}/brands/theory.jpg`,
  "summer-in-the-city": `${BASE}/brands/isabel-marant.jpg`,
  /** Linen / ivory resort — woman in white natural-fiber dress (not a logo). */
  "white-edit": `${BASE}/editorial-linen.png`,
  newIn: `${BASE}/hero-editorial-v8.png`,
} as const;

export type EditorialHeroKey = keyof typeof EDITORIAL_HERO;

export function editorialHeroForSlug(slug: string): string {
  const key = slug as EditorialHeroKey;
  return EDITORIAL_HERO[key] ?? EDITORIAL_HERO.newIn;
}

/** Homepage “Brands we love” — official campaign photography from site /brand art. */
export const BRAND_WE_LOVE_IMAGES: Record<string, string> = {
  "re-done": "/brands/re-done.png",
  "isabel-marant": "/brands/isabel-marant.jpg",
  "l-agence": "/brands/l-agence.jpg",
  theory: "/brands/theory.jpg",
  staud: "/brands/staud.jpg",
  diesel: "/brands/diesel.jpg",
};
