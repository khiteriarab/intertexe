/**
 * Editorial campaign imagery — prefer landscape campaign files for wide heroes/panels.
 */

const BASE = "https://www.intertexe.com";

/** Landscape editorial-silk (1408×768) — safe for homepage hero + evening panel. */
const LANDSCAPE_SILK = `${BASE}/editorial-silk.png`;
const LANDSCAPE_LINEN = `${BASE}/editorial-linen.png`;

export const EDITORIAL_HERO = {
  silk: LANDSCAPE_SILK,
  linen: LANDSCAPE_LINEN,
  cashmere: `${BASE}/editorial-cashmere.jpg`,
  wool: `${BASE}/brands/theory.jpg`,
  cotton: `${BASE}/brands/l-agence.jpg`,
  "leather-suede": `${BASE}/brands/staud.jpg`,
  /** Portrait — best on mobile; cover-crops on desktop. */
  vacation: `${BASE}/editorial-vacation.jpg`,
  /** Landscape silk campaign — fills wide “Evening” panel without pillarboxing. */
  evening: LANDSCAPE_SILK,
  tailoring: `${BASE}/brands/theory.jpg`,
  "summer-in-the-city": `${BASE}/brands/isabel-marant.jpg`,
  /** Woman in white resort dress — Zimmermann campaign (not catalog SKU). */
  "white-edit":
    "https://www.zimmermann.com/media/wysiwyg/ZIM-SPRING26_CAMPAIGN_16x9-9_4.jpg",
  newIn: LANDSCAPE_SILK,
} as const;

export type EditorialHeroKey = keyof typeof EDITORIAL_HERO;

export function editorialHeroForSlug(slug: string): string {
  const key = slug as EditorialHeroKey;
  return EDITORIAL_HERO[key] ?? LANDSCAPE_SILK;
}

/**
 * Homepage hero — fashion editorial (hero-editorial-v8.png was a wrong cave asset).
 * Use landscape silk campaign until a new portrait asset is uploaded to /public.
 */
export const HOMEPAGE_HERO_IMAGE = LANDSCAPE_SILK;

export const BRAND_WE_LOVE_IMAGES: Record<string, string> = {
  "re-done": "/brands/re-done.png",
  "isabel-marant": "/brands/isabel-marant.jpg",
  "l-agence": "/brands/l-agence.jpg",
  theory: "/brands/theory.jpg",
  staud: "/brands/staud.jpg",
  diesel: "/brands/diesel.jpg",
};
