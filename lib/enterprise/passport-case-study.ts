import { getConsumerSiteUrl } from "../platform-urls";

/**
 * Customer Zero ITX-LIVE-01 — aligned with intertexe-live-10-products.json fixture.
 * Platform silk-dress demo is separate (PLATFORM_SALES_DEMO).
 */
export const PASSPORT_CASE_STUDY = {
  styleCode: "ITX-LIVE-01",
  sku: "P01152404-3",
  publicId: "itx_4p2h31174z5e4f6n6f1a",
  productName: "God's True Cashmere Brilliant Linen Shirt with Lapis Lazuli",
  brand: "God's True Cashmere",
  composition: "100% Linen",
  category: "Shirt",
  imageUrl:
    "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/33/P01152404.jpg",
  template: "Editorial" as const,
  lifecycleStages: [
    { stage: "Raw material", detail: "European flax cultivation", location: "Belgium" },
    { stage: "Processing", detail: "Flax retting & scutching", location: "Belgium" },
    { stage: "Fabric", detail: "Linen weaving mill", location: "Portugal" },
    { stage: "Manufacturing", detail: "Shirt assembly · Atelier Norte", location: "Portugal" },
    { stage: "Product", detail: "Brilliant Linen Shirt with Lapis Lazuli", location: "" },
    { stage: "Distribution", detail: "European distribution", location: "" },
    { stage: "Sale", detail: "Luxury retail", location: "Barcelona" },
    { stage: "Ownership", detail: "Machine wash cold · Line dry · Iron medium", location: "" },
    { stage: "Next life", detail: "Repair · Resell · Donate · Recycle", location: "" },
  ],
} as const;

/** Platform B2B demo only — NOT Customer Zero passport data. */
export const PLATFORM_SALES_DEMO = {
  productName: "Silk Evening Dress",
  brand: "INTERTEXE Atelier",
  composition: "92% Silk · 8% Elastane",
  imageUrl: "/platform/hero-silk-dress.png",
  publicPassportUrl: null as string | null,
} as const;

export function caseStudyPassportUrl(origin?: string): string {
  const base = (origin || getConsumerSiteUrl()).replace(/\/$/, "");
  return `${base}/p/${PASSPORT_CASE_STUDY.publicId}`;
}

export const CASE_STUDY_SUPPLY_CHAIN = [
  {
    tier: 4,
    tier_label: "Raw material",
    facility_name: "European flax cultivation",
    country_code: "BE",
    data_status: "provided" as const,
  },
  {
    tier: 3,
    tier_label: "Processing",
    facility_name: "Flax retting & scutching",
    country_code: "BE",
    data_status: "provided" as const,
  },
  {
    tier: 2,
    tier_label: "Fabric",
    facility_name: "Linen weaving mill",
    country_code: "PT",
    data_status: "provided" as const,
  },
  {
    tier: 1,
    tier_label: "Manufacturing",
    facility_name: "Shirt assembly · Atelier Norte",
    country_code: "PT",
    data_status: "provided" as const,
  },
] as const;

export const CASE_STUDY_PUBLIC_FIELDS = {
  manufacturer: "Atelier Norte",
  care_instructions: "Machine wash cold · Line dry · Iron medium",
  distribution: "European distribution",
  retail_market: "Barcelona",
} as const;
