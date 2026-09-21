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
  /** Desktop placement around the hub (percent of map frame) */
  position: { top?: string; left?: string; right?: string; bottom?: string; textAlign?: "left" | "right" | "center" };
};

/**
 * Exact INTERTEXE seven-stage lifecycle — do not rename or collapse.
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
    position: { top: "4%", left: "2%", textAlign: "left" },
  },
  {
    id: "clean",
    number: "02",
    title: "Clean & Connect",
    subtitle: "One trusted product record",
    description: "Bring fragmented product information together, standardize it, and connect it into one trusted product record.",
    chips: ["Composition"],
    visualType: "clean",
    position: { top: "2%", left: "38%", textAlign: "center" },
  },
  {
    id: "trace",
    number: "03",
    title: "Trace & Prove",
    subtitle: "Claims linked to evidence",
    description: "Connect product and material claims to evidence across the supply chain.",
    chips: ["Traceability", "Chain of Custody", "Provenance", "Supplier Evidence"],
    visualType: "trace",
    position: { top: "8%", right: "2%", textAlign: "right" },
  },
  {
    id: "prepare",
    number: "04",
    title: "Check & Prepare",
    subtitle: "Compliance + DPP readiness",
    description: "Resolve gaps, review product readiness, and prepare records for Digital Product Passport and compliance workflows.",
    chips: ["Review", "Resolved", "Ready", "Incomplete → Ready"],
    visualType: "prepare",
    position: { top: "42%", right: "1%", textAlign: "right" },
  },
  {
    id: "publish",
    number: "05",
    title: "Passport & Publish",
    subtitle: "Governed identity distributed",
    description: "Turn the governed product record into a Digital Product Passport and distribute it across consumer and operational channels.",
    chips: ["QR", "Web", "API", "Retail"],
    visualType: "publish",
    position: { bottom: "6%", right: "4%", textAlign: "right" },
  },
  {
    id: "learn",
    number: "06",
    title: "Use & Learn",
    subtitle: "Intelligence from every channel",
    description: "Capture signals from product use and engagement, then feed them back into the record.",
    chips: ["Higher than peer median", "Engagement", "Scan activity", "Use signals"],
    visualType: "learn",
    position: { bottom: "4%", left: "28%", textAlign: "left" },
  },
  {
    id: "recirculate",
    number: "07",
    title: "Repair & Recirculate",
    subtitle: "Beyond first sale",
    description: "Keep the product record useful after publish so it can support care, repair, resale, reuse, and next-life pathways.",
    chips: ["Repair", "Resale", "Reuse"],
    visualType: "recirculate",
    position: { bottom: "22%", left: "2%", textAlign: "left" },
  },
];
