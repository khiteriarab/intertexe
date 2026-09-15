import { getConsumerSiteUrl } from "../platform-urls";

/**
 * Customer Zero ITX-LIVE-07 — aligned with intertexe-live-10-products.json fixture.
 * White cotton poplin shirt — composition matches product photography (not plaid/linen mismatch).
 */
export const PASSPORT_CASE_STUDY = {
  styleCode: "ITX-LIVE-07",
  sku: "66e629f4-5755-4cdf-b2fb-de69845df13a",
  publicId: "itx_5h454m6h0c673h5g0n6d",
  productName: "Cotton Poplin Shirt",
  brand: "Walter Baker",
  composition: "100% Cotton",
  category: "Shirt",
  imageUrl:
    "https://img.mytheresa.com/1000/1000/95/jpeg/catalog/product/35/P01118549.jpg",
  template: "Editorial" as const,
  lifecycleStages: [
    { stage: "Raw material", detail: "Cotton cultivation", location: "Turkey" },
    { stage: "Processing", detail: "Spinning & weaving", location: "Portugal" },
    { stage: "Fabric", detail: "Poplin mill", location: "Portugal" },
    { stage: "Manufacturing", detail: "Shirt assembly", location: "Portugal" },
    { stage: "Product", detail: "Cotton Poplin Shirt", location: "" },
    { stage: "Distribution", detail: "European distribution", location: "" },
    { stage: "Sale", detail: "Contemporary retail", location: "Barcelona" },
    { stage: "Ownership", detail: "Machine wash cold · Line dry", location: "" },
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
    facility_name: "Cotton cultivation",
    country_code: "TR",
    data_status: "provided" as const,
  },
  {
    tier: 3,
    tier_label: "Processing",
    facility_name: "Spinning & weaving",
    country_code: "PT",
    data_status: "provided" as const,
  },
  {
    tier: 2,
    tier_label: "Fabric",
    facility_name: "Poplin mill",
    country_code: "PT",
    data_status: "provided" as const,
  },
  {
    tier: 1,
    tier_label: "Manufacturing",
    facility_name: "Shirt assembly",
    country_code: "PT",
    data_status: "provided" as const,
  },
] as const;

export const CASE_STUDY_PUBLIC_FIELDS = {
  manufacturer: "Atelier Norte",
  care_instructions: "Machine wash cold · Line dry",
  distribution: "European distribution",
  retail_market: "Barcelona",
} as const;
