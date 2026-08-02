/** Homepage “Brands we love” — editorial houses (web). */
export const CURATED_BRAND_SLUGS = [
  "re-done",
  "the-attico",
  "toteme",
  "cult-gaia",
  "zimmermann",
  "isabel-marant",
] as const;

/** Display names when the designers table is slow or unavailable. */
export const CURATED_BRAND_LABELS: Record<(typeof CURATED_BRAND_SLUGS)[number], string> = {
  "re-done": "Re/Done",
  "the-attico": "The Attico",
  toteme: "Totême",
  "cult-gaia": "Cult Gaia",
  zimmermann: "Zimmermann",
  "isabel-marant": "Isabel Marant",
};
