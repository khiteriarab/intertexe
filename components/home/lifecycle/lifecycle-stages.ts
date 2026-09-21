export type LifecycleStageVisual =
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
  chips: string[];
  visualType: LifecycleStageVisual;
  image: string;
  alt: string;
};

/**
 * Exact INTERTEXE seven-stage lifecycle — do not rename or collapse.
 * Attio-style Follow the Record rail uses these labels + copy.
 */
export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "source",
    number: "01",
    title: "Source & Make",
    subtitle: "Materials, suppliers, manufacturing",
    description: "Capture how the product begins across materials, suppliers, components, and manufacturing.",
    chips: ["Style + BOM", "Supplier + PO", "Evidence", "Composition"],
    visualType: "source",
    image: "/platform/demo-source.png",
    alt: "Fragmented inputs converging into one INTERTEXE product record",
  },
  {
    id: "clean",
    number: "02",
    title: "Clean & Connect",
    subtitle: "One trusted product record",
    description:
      "Bring fragmented product information together, standardize it, and connect it into one trusted product record.",
    chips: ["Composition"],
    visualType: "clean",
    image: "/platform/demo-normalize.png",
    alt: "Messy product strings becoming a structured governed record",
  },
  {
    id: "trace",
    number: "03",
    title: "Trace & Prove",
    subtitle: "Claims linked to evidence",
    description: "Connect product and material claims to evidence across the supply chain.",
    chips: ["Traceability", "Chain of Custody", "Provenance", "Supplier Evidence"],
    visualType: "trace",
    image: "/platform/demo-validate.png",
    alt: "Claims linked to evidence on the governed product record",
  },
  {
    id: "prepare",
    number: "04",
    title: "Check & Prepare",
    subtitle: "Compliance + DPP readiness",
    description:
      "Resolve gaps, review product readiness, and prepare records for Digital Product Passport and compliance workflows.",
    chips: ["Review", "Resolved", "Ready", "Incomplete → Ready"],
    visualType: "prepare",
    image: "/platform/demo-validate.png",
    alt: "Product readiness and compliance preparation",
  },
  {
    id: "publish",
    number: "05",
    title: "Passport & Publish",
    subtitle: "Governed identity distributed",
    description:
      "Turn the governed product record into a Digital Product Passport and distribute it across consumer and operational channels.",
    chips: ["QR", "Web", "API", "Retail"],
    visualType: "publish",
    image: "/platform/demo-publish.png",
    alt: "Digital Product Passport distributed across channels",
  },
  {
    id: "learn",
    number: "06",
    title: "Use & Learn",
    subtitle: "Intelligence from every channel",
    description: "Capture signals from product use and engagement, then feed them back into the record.",
    chips: ["Higher than peer median", "Engagement", "Scan activity", "Use signals"],
    visualType: "learn",
    image: "/platform/demo-measure.png",
    alt: "Usage and engagement signals feeding back into the record",
  },
  {
    id: "recirculate",
    number: "07",
    title: "Repair & Recirculate",
    subtitle: "Beyond first sale",
    description:
      "Keep the product record useful after publish so it can support care, repair, resale, reuse, and next-life pathways.",
    chips: ["Repair", "Resale", "Reuse"],
    visualType: "recirculate",
    image: "/platform/demo-activate.png",
    alt: "Product record supporting care, repair, resale, and next life",
  },
];
