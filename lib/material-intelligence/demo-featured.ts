import { DEMO_CATALOG, type DemoCatalogProduct } from "./demo-catalog";
import { DEMO_GTIN_VERIFIED } from "./demo-records";

/** Primary narrative product for /platform/demo — Silk Midi Skirt · ITX-4102 */
export const DEMO_FEATURED_ID = "silk-midi-skirt";

export const DEMO_FEATURED_PRODUCT: DemoCatalogProduct =
  DEMO_CATALOG.find((p) => p.id === DEMO_FEATURED_ID) ?? DEMO_CATALOG[0];

export const DEMO_FEATURED = {
  id: DEMO_FEATURED_ID,
  name: "Silk Midi Skirt",
  sku: "ITX-4102",
  gtin: DEMO_GTIN_VERIFIED,
  composition: "96% Silk · 4% Elastane",
  origin: "Italy",
  category: "Skirts",
  image: "/platform/hero-silk-dress.png",
  passportReady: true,
  readinessPct: 96,
  resalePotential: "High",
} as const;
