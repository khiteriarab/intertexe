/**
 * Editorial campaign imagery from carried designers (hosted on intertexe.com / brand art).
 * Not Unsplash stock or generic product thumbnails.
 */

const BASE = "https://www.intertexe.com";

export const EDITORIAL_HERO = {
  silk: `${BASE}/editorial-silk.png`,
  linen: `${BASE}/editorial-vacation.jpg`,
  cashmere: `${BASE}/editorial-cashmere.jpg`,
  wool: `${BASE}/brands/theory.jpg`,
  cotton: `${BASE}/brands/l-agence.jpg`,
  "leather-suede": `${BASE}/brands/staud.jpg`,
  vacation: `${BASE}/editorial-vacation.jpg`,
  evening: `${BASE}/brands/staud.jpg`,
  tailoring: `${BASE}/brands/theory.jpg`,
  "summer-in-the-city": `${BASE}/brands/l-agence.jpg`,
  "white-edit": `${BASE}/brands/re-done.png`,
  newIn: `${BASE}/hero-editorial-v8.png`,
} as const;

/** Homepage “Brands we love” — official site campaign / hero art. */
export const BRAND_WE_LOVE_IMAGES: Record<string, string> = {
  "re-done": "/brands/re-done.png",
  "isabel-marant": "/brands/isabel-marant.jpg",
  "l-agence": "/brands/l-agence.jpg",
  theory: "/brands/theory.jpg",
  staud: "/brands/staud.jpg",
  diesel: "/brands/diesel.jpg",
};
