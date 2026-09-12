import liveProducts from "./fixtures/intertexe-live-10-products.json";
import { PASSPORT_CASE_STUDY, caseStudyPassportUrl } from "./passport-case-study";

/** Canonical live product for platform marketing, demo, and publish visuals. */
export const PLATFORM_CASE_STUDY = PASSPORT_CASE_STUDY;

export const PLATFORM_PRODUCT_SHORT_NAME = "Brilliant Linen Shirt";

export const PLATFORM_PASSPORT_URL = caseStudyPassportUrl();

export const PLATFORM_IDENTITY_LABEL = PASSPORT_CASE_STUDY.styleCode;

export const PLATFORM_PUBLIC_ID = PASSPORT_CASE_STUDY.publicId;

const naturalFiberValues = liveProducts
  .map((p) => p.natural_fiber_percent)
  .filter((v): v is number => typeof v === "number");

const avgNaturalFiber =
  naturalFiberValues.length > 0
    ? Math.round(naturalFiberValues.reduce((a, b) => a + b, 0) / naturalFiberValues.length)
    : 0;

/** Customer Zero live catalog — intertexe-live-10-products.json */
export const PLATFORM_LIVE_CATALOG = {
  productCount: liveProducts.length,
  avgNaturalFiberPct: avgNaturalFiber,
  completeMaterialPct: 100,
  passportReadyPct: 100,
  publishedPassports: liveProducts.length,
} as const;

/** Governed peer comparison for Material Benchmark marketing visuals. */
export const PLATFORM_BENCHMARK_PEERS = [
  ["Natural fiber share", `${PLATFORM_LIVE_CATALOG.avgNaturalFiberPct}%`, "46%"],
  ["Synthetic share", `${100 - PLATFORM_LIVE_CATALOG.avgNaturalFiberPct}%`, "54%"],
  ["Complete material data", `${PLATFORM_LIVE_CATALOG.completeMaterialPct}%`, "69%"],
  ["Passport-ready", `${PLATFORM_LIVE_CATALOG.passportReadyPct}%`, "48%"],
] as const;

export const PLATFORM_BENCHMARK_STATS = [
  ["Products in Customer Zero catalog", String(PLATFORM_LIVE_CATALOG.productCount)],
  ["Published passports", String(PLATFORM_LIVE_CATALOG.publishedPassports)],
  ["Conversion signals", "Live"],
] as const;

export const PLATFORM_CONVERSION_COHORTS = [
  { cohort: "Linen & fine naturals", index: "+18", tone: "up" as const, signal: "Outperforming peer median" },
  { cohort: "Cotton basics", index: "-11", tone: "down" as const, signal: "Under index vs segment" },
  { cohort: "Recycled synthetics", index: "+6", tone: "up" as const, signal: "Growing share, stable conversion" },
  { cohort: "Wool outerwear", index: "—", tone: "neutral" as const, signal: "Insufficient peer sample" },
] as const;
