/**
 * Editorial campaign imagery — prefer landscape campaign files for wide heroes/panels.
 */

const BASE = "https://www.intertexe.com";

/** Fabric hub covers — served from /public/fabrics. */
const FABRIC_HERO = {
  silk: "/fabrics/fabric-silk.jpg",
  linen: "/fabrics/fabric-linen.jpg",
  cashmere: "/fabrics/fabric-cashmere.jpg",
  wool: "/fabrics/fabric-wool.jpg",
  cotton: "/fabrics/fabric-cotton.jpg",
  leather: "/fabrics/fabric-leather.jpg",
} as const;

/** Rag & Bone Ann embroidered slip — hosted on intertexe.com. */
const SILK_EDITORIAL_HERO = FABRIC_HERO.silk;

/** Zimmermann resort campaign — Summer in the City collection panel. */
export const ZIMMERMANN_SUMMER_CAMPAIGN =
  "https://www.zimmermann.com/media/wysiwyg/ZIM-SPRING26_CAMPAIGN_16x9-9_4.jpg";

/** Hosted White Edit hero — bundled in /public for reliable delivery. */
export const WHITE_EDIT_EDITORIAL_HERO = "/editorial-white-edit.png";

/** Hosted tailoring hero — bundled in /public for reliable delivery. */
export const TAILORING_EDITORIAL_HERO = "/editorial-tailoring.png";

/** Evening collection — bundled in /public for reliable delivery. */
export const EVENING_EDITORIAL_HERO = "/editorial-evening.png";

/** Brand “we love” tiles — campaign art, not SKU or logo files. */
export const BRAND_CAMPAIGN_HEROES = {
  "isabel-marant":
    "https://intl.isabelmarant.com/cdn/shop/files/Isabel_Marant_FW25_look_01.jpg?v=1741306390&width=1920",
  staud:
    "https://staud.clothing/cdn/shop/files/Nav_Summer_Tommys.jpg?v=1777958857&width=1920",
} as const;

export const EDITORIAL_HERO = {
  silk: SILK_EDITORIAL_HERO,
  linen: FABRIC_HERO.linen,
  cashmere: FABRIC_HERO.cashmere,
  wool: FABRIC_HERO.wool,
  cotton: FABRIC_HERO.cotton,
  "leather-suede": FABRIC_HERO.leather,
  /** Tailoring campaign art — also used for Vacation edit cover. */
  vacation: "/editorial-vacation.jpg",
  evening: EVENING_EDITORIAL_HERO,
  tailoring: TAILORING_EDITORIAL_HERO,
  "summer-in-the-city": ZIMMERMANN_SUMMER_CAMPAIGN,
  "white-edit": WHITE_EDIT_EDITORIAL_HERO,
  newIn: SILK_EDITORIAL_HERO,
} as const;

export type EditorialHeroKey = keyof typeof EDITORIAL_HERO;

export function editorialHeroForSlug(slug: string): string {
  const key = slug as EditorialHeroKey;
  return EDITORIAL_HERO[key] ?? SILK_EDITORIAL_HERO;
}

/**
 * Homepage hero — v8 portrait (woman in grotto) + studio JPG.
 * Edit HOMEPAGE_HERO_SLIDES below; iOS/web pull from /api/editorial-config.
 */
export const HOMEPAGE_HERO_IMAGE_MOBILE = `${BASE}/hero-editorial-v8.png`;
export const HOMEPAGE_HERO_IMAGE_DESKTOP = `${BASE}/hero-editorial.jpg`;

export type HomepageHeroSlide = {
  url: string;
  /** CSS object-position, e.g. "center 75%" */
  objectPosition: string;
};

/** Rotating homepage hero — change URLs here, redeploy website only. */
export const HOMEPAGE_HERO_SLIDES: HomepageHeroSlide[] = [
  { url: HOMEPAGE_HERO_IMAGE_MOBILE, objectPosition: "center 75%" },
  { url: HOMEPAGE_HERO_IMAGE_DESKTOP, objectPosition: "center 25%" },
];

export const HOMEPAGE_HERO_SWAP_MS = 5000;

/** @deprecated Use HOMEPAGE_HERO_SLIDES */
export const HOMEPAGE_HERO_IMAGE = HOMEPAGE_HERO_IMAGE_MOBILE;

export const BRAND_WE_LOVE_IMAGES: Record<string, string> = {
  "re-done": "/brands/re-done.png",
  "isabel-marant": BRAND_CAMPAIGN_HEROES["isabel-marant"],
  "l-agence":
    "https://lagence.com/cdn/shop/files/Hero-Desktop_2_7ff67339-b858-4593-99ee-6be2b035a36b.jpg?v=1752629879&width=1920",
  theory: "/brands/theory.jpg",
  staud: BRAND_CAMPAIGN_HEROES.staud,
  diesel: "/brands/diesel.jpg",
};
