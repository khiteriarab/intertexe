/**
 * Editorial campaign imagery — prefer landscape campaign files for wide heroes/panels.
 */

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

/** Fall Edit — Zimmermann campaign editorial (not homepage denim or Brands We Love dress). */
export const FALL_EDIT_EDITORIAL_HERO = "/editorial-fall-edit.jpg";
export const FALL_EDIT_EDITORIAL_HERO_REMOTE =
  "https://www.zimmermann.com/media/wysiwyg/ZIM-SPRING26_CAMPAIGN_16x9-9_4.jpg";

/** Leather Edit — leather & suede hub cover. */
export const LEATHER_EDIT_EDITORIAL_HERO = FABRIC_HERO.leather;

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
  zimmermann: "https://www.zimmermann.com/media/wysiwyg/1-camp_3.jpg",
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
  "fall-edit": FALL_EDIT_EDITORIAL_HERO,
  "leather-edit": LEATHER_EDIT_EDITORIAL_HERO,
  "first-fall-edit": FABRIC_HERO.cashmere,
  "coat-edit": FABRIC_HERO.wool,
  "holiday-edit": EVENING_EDITORIAL_HERO,
  "spring-edit": FABRIC_HERO.cotton,
  newIn: SILK_EDITORIAL_HERO,
} as const;

export type EditorialHeroKey = keyof typeof EDITORIAL_HERO;

export function editorialHeroForSlug(slug: string): string {
  const key = slug as EditorialHeroKey;
  return EDITORIAL_HERO[key] ?? SILK_EDITORIAL_HERO;
}

/**
 * Homepage hero — Zimmermann brand campaign (woman in denim).
 * Edit HOMEPAGE_HERO_SLIDES below; iOS/web pull from /api/editorial-config.
 */
export const HOMEPAGE_HERO_IMAGE_ZIMMERMANN = "/brands/zimmermann.jpg";
export const HOMEPAGE_HERO_IMAGE_MOBILE = HOMEPAGE_HERO_IMAGE_ZIMMERMANN;
export const HOMEPAGE_HERO_IMAGE_DESKTOP = HOMEPAGE_HERO_IMAGE_ZIMMERMANN;
/** Native 2304px JPEG — primary desktop grotto hero (sharper than 8-bit PNG). */
export const HOMEPAGE_HERO_IMAGE_V8_DESKTOP = "/hero-editorial-v8-desktop-2400.jpg";
/** 3840px JPEG for Retina / large desktop viewports. */
export const HOMEPAGE_HERO_IMAGE_V8_DESKTOP_2X = "/hero-editorial-v8-desktop-3840.jpg";
/** Landscape crop of grotto — same 2400×1309 ratio as studio slide for matched hero alternation. */
export const HOMEPAGE_HERO_IMAGE_V8_LANDSCAPE = "/hero-editorial-v8-landscape-2400.jpg";
export const HOMEPAGE_HERO_IMAGE_V8_LANDSCAPE_2X = "/hero-editorial-v8-landscape-3840.jpg";

export type HomepageHeroSlide = {
  url: string;
  /** Optional desktop-specific source with same crop intent but higher resolution. */
  desktopUrl?: string;
  /** Optional responsive srcSet for desktop (e.g. 1x + 2x campaign art). */
  desktopSrcSet?: string;
  /** CSS object-position on mobile */
  objectPosition: string;
  /** CSS object-position on desktop (lg+) only */
  objectPositionDesktop?: string;
  /** iOS app hero anchor — parsed separately from mobile web */
  objectPositionApp?: string;
};

/** Homepage hero — single slide; change URL here, redeploy website only. */
export const HOMEPAGE_HERO_SLIDES: HomepageHeroSlide[] = [
  {
    url: HOMEPAGE_HERO_IMAGE_ZIMMERMANN,
    desktopUrl: HOMEPAGE_HERO_IMAGE_ZIMMERMANN,
    objectPosition: "center 42%",
    objectPositionDesktop: "center 14%",
    /** iOS — anchor high so portrait campaign art keeps the model's head in frame */
    objectPositionApp: "center 0%",
  },
];

export const HOMEPAGE_HERO_SWAP_MS = 5000;

/** @deprecated Use HOMEPAGE_HERO_SLIDES */
export const HOMEPAGE_HERO_IMAGE = HOMEPAGE_HERO_IMAGE_MOBILE;

export const BRAND_WE_LOVE_IMAGES: Record<string, string> = {
  "re-done": "/brands/re-done.png",
  staud: BRAND_CAMPAIGN_HEROES.staud,
  "isabel-marant": BRAND_CAMPAIGN_HEROES["isabel-marant"],
  zimmermann: BRAND_CAMPAIGN_HEROES.zimmermann,
  "l-agence":
    "https://lagence.com/cdn/shop/files/Hero-Desktop_2_7ff67339-b858-4593-99ee-6be2b035a36b.jpg?v=1752629879&width=1920",
  theory: "/brands/theory.jpg",
  staud: BRAND_CAMPAIGN_HEROES.staud,
  diesel: "/brands/diesel.jpg",
};
