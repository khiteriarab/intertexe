/**
 * Editorial campaign imagery — licensed stock (Unsplash), not product thumbnails or homepage hero reuse.
 */

const U = "https://images.unsplash.com";

export const EDITORIAL_HERO = {
  silk: `${U}/photo-1595777457583-95e059ef9437?w=1600&q=85`,
  linen: `${U}/photo-1594633312681-425c7b97ccd1?w=1600&q=85`,
  cashmere: `${U}/photo-1434389677669-e08b4cac3105?w=1600&q=85`,
  wool: `${U}/photo-1591047139829-d91aecb6caea?w=1600&q=85`,
  cotton: `${U}/photo-1496747614446-f389a2e2c6b5?w=1600&q=85`,
  "leather-suede": `${U}/photo-1551028719-00167b16eac5?w=1600&q=85`,
  vacation: `${U}/photo-1509631179647-0177331693ae?w=1600&q=85`,
  evening: `${U}/photo-1566174053879-31528523f8ae?w=1600&q=85`,
  tailoring: `${U}/photo-1594938298603-c8148c4dae35?w=1600&q=85`,
  "summer-in-the-city": `${U}/photo-1483985988354-763728e3685b?w=1600&q=85`,
  "white-edit": `${U}/photo-1515886657613-9f3515b0c78f?w=1600&q=85`,
  newIn: `${U}/photo-1469334031218-e382b34bdf82?w=1600&q=85`,
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
