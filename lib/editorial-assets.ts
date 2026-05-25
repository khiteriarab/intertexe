/**
 * Editorial campaign imagery — prefer landscape campaign files for wide heroes/panels.
 */

const BASE = "https://www.intertexe.com";

/** Landscape editorial-silk (1408×768) — safe for homepage hero + evening panel. */
const LANDSCAPE_SILK = `${BASE}/editorial-silk.png`;
const LANDSCAPE_LINEN = `${BASE}/editorial-linen.png`;

/** Zimmermann resort campaign — Summer in the City collection panel. */
export const ZIMMERMANN_SUMMER_CAMPAIGN =
  "https://www.zimmermann.com/media/wysiwyg/ZIM-SPRING26_CAMPAIGN_16x9-9_4.jpg";

/** Faithfull white dress editorial — The White Edit collection panel. */
export const FAITHFULL_WHITE_EDIT_CAMPAIGN =
  "https://faithfullthebrand.com/cdn/shop/files/S40-FFC20-WHT-24635-FaithfullTheBrand-2090.webp";

/** Brand “we love” tiles — campaign art, not SKU or logo files. */
export const BRAND_CAMPAIGN_HEROES = {
  "isabel-marant":
    "https://intl.isabelmarant.com/cdn/shop/files/Isabel_Marant_FW25_look_01.jpg?v=1741306390&width=1920",
  staud:
    "https://staud.clothing/cdn/shop/files/Nav_Summer_Tommys.jpg?v=1777958857&width=1920",
} as const;

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
  "summer-in-the-city": ZIMMERMANN_SUMMER_CAMPAIGN,
  /** Woman in white — Faithfull campaign (not catalog SKU). */
  "white-edit": FAITHFULL_WHITE_EDIT_CAMPAIGN,
  newIn: LANDSCAPE_SILK,
} as const;

export type EditorialHeroKey = keyof typeof EDITORIAL_HERO;

export function editorialHeroForSlug(slug: string): string {
  const key = slug as EditorialHeroKey;
  return EDITORIAL_HERO[key] ?? LANDSCAPE_SILK;
}

/** Homepage hero — portrait editorial campaign. */
export const HOMEPAGE_HERO_IMAGE = `${BASE}/hero-editorial-v8.png`;

export const BRAND_WE_LOVE_IMAGES: Record<string, string> = {
  "re-done": "/brands/re-done.png",
  "isabel-marant": BRAND_CAMPAIGN_HEROES["isabel-marant"],
  "l-agence":
    "https://lagence.com/cdn/shop/files/Hero-Desktop_2_7ff67339-b858-4593-99ee-6be2b035a36b.jpg?v=1752629879&width=1920",
  theory: "/brands/theory.jpg",
  staud: BRAND_CAMPAIGN_HEROES.staud,
  diesel: "/brands/diesel.jpg",
};
