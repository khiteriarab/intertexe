/**
 * Locked INTERTEXE seven-stage homepage lifecycle copy.
 * Do not rename, condense, combine, or reinterpret these stages.
 */

export type LifecycleAlign = "left" | "right";

export type LifecycleVisualType =
  | "source"
  | "clean"
  | "trace"
  | "prepare"
  | "publish"
  | "learn"
  | "recirculate";

export type LifecycleStage = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  align: LifecycleAlign;
  visualType: LifecycleVisualType;
};

export const LIFECYCLE_HEADER = {
  eyebrow: "Product lifecycle",
  headlineLines: ["From material", "to next life."] as const,
  body:
    "INTERTEXE connects fragmented product information from sourcing and manufacturing through product data, traceability, compliance and Digital Product Passports, then keeps that governed record useful through use, repair, resale and end-of-life.",
  primaryCta: { label: "See a live product", href: "/brands/demo" },
  secondaryCta: { label: "Explore how teams use it", href: "/brands/solutions" },
  topRightCta: { label: "See it live", href: "/brands/demo" },
} as const;

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "source",
    number: "01",
    title: "Source & Make",
    subtitle: "Materials, suppliers, manufacturing",
    description:
      "Capture how the product begins across materials, suppliers, components and manufacturing.",
    tags: ["Material", "Supplier", "Manufacturing", "Style + BOM", "Supplier + PO"],
    align: "left",
    visualType: "source",
  },
  {
    id: "clean",
    number: "02",
    title: "Clean & Connect",
    subtitle: "One trusted product record",
    description:
      "Bring fragmented product information together, standardize it and connect it into one trusted product record.",
    tags: ["Composition", "Product Data", "Source Systems", "Normalization", "Product Master Data"],
    align: "right",
    visualType: "clean",
  },
  {
    id: "trace",
    number: "03",
    title: "Trace & Prove",
    subtitle: "Claims linked to evidence",
    description: "Connect product and material claims to evidence across the supply chain.",
    tags: ["Traceability", "Chain of Custody", "Provenance", "Supplier Evidence"],
    align: "left",
    visualType: "trace",
  },
  {
    id: "prepare",
    number: "04",
    title: "Check & Prepare",
    subtitle: "Compliance + DPP readiness",
    description:
      "Resolve gaps, review product readiness and prepare records for Digital Product Passport and compliance workflows.",
    tags: ["Incomplete", "Review", "Resolved", "Ready", "DPP Readiness"],
    align: "right",
    visualType: "prepare",
  },
  {
    id: "publish",
    number: "05",
    title: "Passport & Publish",
    subtitle: "Governed identity distributed",
    description:
      "Turn the governed product record into a Digital Product Passport and distribute it across consumer and operational channels.",
    tags: ["Digital Product Passport", "QR", "Web", "API", "Retail"],
    align: "left",
    visualType: "publish",
  },
  {
    id: "learn",
    number: "06",
    title: "Use & Learn",
    subtitle: "Intelligence from every channel",
    description: "Capture signals from product use and engagement, then feed them back into the record.",
    tags: ["Analytics", "Engagement", "Scan Activity", "Material Benchmark", "Consumer Signals"],
    align: "right",
    visualType: "learn",
  },
  {
    id: "recirculate",
    number: "07",
    title: "Repair & Recirculate",
    subtitle: "Beyond first sale",
    description:
      "Keep the product record useful after publish so it can support care, repair, resale, reuse and next-life pathways.",
    tags: ["Repair", "Resale", "Reuse", "Care", "End of Life"],
    align: "left",
    visualType: "recirculate",
  },
];
