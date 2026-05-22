/** Curated editorial imagery — not product thumbnails from misclassified rails. */

const GH = "https://raw.githubusercontent.com/khiteriarab/intertexe/main/public";

export const EDITORIAL_HERO = {
  silk: `${GH}/editorial-silk.jpg`,
  linen: `${GH}/editorial-linen.jpg`,
  cashmere: `${GH}/editorial-cashmere.jpg`,
  vacation: `${GH}/editorial-linen.jpg`,
  newIn: `${GH}/hero-editorial-v8.png`,
} as const;

export const BRAND_WE_LOVE_IMAGES: Record<string, string> = {
  "re-done": `${GH}/brands/re-done.png`,
  "isabel-marant": `${GH}/brands/isabel-marant.jpg`,
  "l-agence": `${GH}/brands/lagence.jpg`,
  theory: `${GH}/brands/theory.jpg`,
  staud: `${GH}/brands/faithfull-the-brand.jpg`,
  diesel: `${GH}/brands/diesel.jpg`,
};
