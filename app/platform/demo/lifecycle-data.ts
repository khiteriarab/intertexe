import { marketingPath } from "../../../lib/enterprise-marketing/paths";

export type LifecycleChip = {
  label: string;
  href?: string;
};

export type LifecycleStageId =
  | "source-make"
  | "clean-connect"
  | "trace-prove"
  | "check-prepare"
  | "passport-publish"
  | "use-learn"
  | "repair-recirculate";

export type LifecycleStage = {
  id: LifecycleStageId;
  title: string;
  copy: string;
  chips: LifecycleChip[];
  statusLine: string;
};

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "source-make",
    title: "Source & Make",
    copy: "Capture how the product begins: materials, suppliers, components and manufacturing.",
    chips: [
      { label: "Raw Materials" },
      { label: "Suppliers", href: marketingPath("supplier-data") },
      { label: "Manufacturing" },
      { label: "Supply Chain Tiers" },
    ],
    statusLine: "Inputs converging into one product identity",
  },
  {
    id: "clean-connect",
    title: "Clean & Connect",
    copy: "Bring fragmented product information together, clean it, standardize it and connect it to one trusted product record.",
    chips: [
      { label: "PLM / PIM / ERP" },
      { label: "Data Normalization" },
      { label: "Material Composition" },
      { label: "Product Master Data", href: marketingPath("product-intelligence") },
    ],
    statusLine: "Fragmented fields resolving into a governed record",
  },
  {
    id: "trace-prove",
    title: "Trace & Prove",
    copy: "Connect claims to evidence so teams can prove where products and materials came from.",
    chips: [
      { label: "Traceability", href: marketingPath("traceability") },
      { label: "Chain of Custody" },
      { label: "Provenance" },
      { label: "Supplier Evidence" },
    ],
    statusLine: "Evidence linked to every material claim",
  },
  {
    id: "check-prepare",
    title: "Check & Prepare",
    copy: "Identify missing information and prepare the product for sustainability, regulatory and Digital Product Passport requirements.",
    chips: [
      { label: "ESPR" },
      { label: "Compliance" },
      { label: "DPP Readiness", href: marketingPath("digital-product-passport") },
      { label: "Audit Evidence" },
    ],
    statusLine: "Gaps closing · readiness improving",
  },
  {
    id: "passport-publish",
    title: "Passport & Publish",
    copy: "Turn the verified product record into a Digital Product Passport and publish it through connected channels.",
    chips: [
      { label: "Digital Product Passport", href: marketingPath("digital-product-passport") },
      { label: "Unique Product ID" },
      { label: "QR / NFC" },
      { label: "Interoperability" },
    ],
    statusLine: "One record → QR, web, and API",
  },
  {
    id: "use-learn",
    title: "Use & Learn",
    copy: "Use the product record across consumers, retail and analytics, and learn from the intelligence it generates.",
    chips: [
      { label: "Consumer Experience" },
      { label: "Analytics" },
      { label: "Material Benchmark" },
      { label: "Supplier Performance", href: marketingPath("supplier-data") },
    ],
    statusLine: "Signals returning to the governed record",
  },
  {
    id: "repair-recirculate",
    title: "Repair & Recirculate",
    copy: "Keep the record useful after the first sale through care, repair, resale, reuse and end-of-life.",
    chips: [
      { label: "Care & Repair", href: marketingPath("solutions") },
      { label: "Resale" },
      { label: "Reuse" },
      { label: "End of Life" },
    ],
    statusLine: "The record stays alive after first sale",
  },
];

export const LIFECYCLE_STEP_MS = 1600;
