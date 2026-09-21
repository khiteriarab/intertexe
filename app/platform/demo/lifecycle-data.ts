import { marketingPath } from "../../../lib/enterprise-marketing/paths";

export type LifecycleTerm = {
  label: string;
  href?: string;
};

export type LifecycleVisualType =
  | "converge"
  | "normalize"
  | "trace"
  | "checklist"
  | "publish"
  | "signals"
  | "loop";

export type LifecycleStageId =
  | "source-make"
  | "clean-connect"
  | "trace-prove"
  | "check-prepare"
  | "passport-publish"
  | "use-learn"
  | "repair-recirculate";

/** Marker anchor in the desktop canvas (px within 1320×720 view). */
export type LifecyclePoint = { x: number; y: number };

export type LifecycleStage = {
  id: LifecycleStageId;
  number: string;
  title: string;
  shortDescription: string;
  description: string;
  terms: LifecycleTerm[];
  visualType: LifecycleVisualType;
  point: LifecyclePoint;
};

/**
 * Serpentine geometry (canvas 1320 × 720):
 * top L→R: 01 → 02 → 03
 * drop: 03 → 04
 * bottom R→L: 04 → 05 → 06 → 07
 */
export const LIFECYCLE_CANVAS = { width: 1320, height: 720 } as const;

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "source-make",
    number: "01",
    title: "Source & Make",
    shortDescription: "Materials, suppliers, manufacturing.",
    description:
      "Capture how the product begins across materials, suppliers, components and manufacturing.",
    terms: [
      { label: "Raw Materials" },
      { label: "Suppliers", href: marketingPath("supplier-data") },
      { label: "Manufacturing" },
      { label: "Supply Chain Tiers" },
    ],
    visualType: "converge",
    point: { x: 160, y: 148 },
  },
  {
    id: "clean-connect",
    number: "02",
    title: "Clean & Connect",
    shortDescription: "One trusted product record.",
    description:
      "Bring fragmented product information together, standardize it and connect it to one trusted product record.",
    terms: [
      { label: "PLM / PIM / ERP" },
      { label: "Data Normalization" },
      { label: "Material Composition" },
      { label: "Product Master Data", href: marketingPath("product-intelligence") },
    ],
    visualType: "normalize",
    point: { x: 560, y: 148 },
  },
  {
    id: "trace-prove",
    number: "03",
    title: "Trace & Prove",
    shortDescription: "Claims linked to evidence.",
    description: "Connect product and material claims to evidence across the supply chain.",
    terms: [
      { label: "Traceability", href: marketingPath("traceability") },
      { label: "Chain of Custody" },
      { label: "Provenance" },
      { label: "Supplier Evidence" },
    ],
    visualType: "trace",
    point: { x: 1060, y: 148 },
  },
  {
    id: "check-prepare",
    number: "04",
    title: "Check & Prepare",
    shortDescription: "Close gaps. Ready for DPP.",
    description:
      "Identify missing information and prepare the product for sustainability, regulatory and Digital Product Passport requirements.",
    terms: [
      { label: "ESPR" },
      { label: "Compliance" },
      { label: "DPP Readiness", href: marketingPath("digital-product-passport") },
      { label: "Audit Evidence" },
    ],
    visualType: "checklist",
    point: { x: 1060, y: 520 },
  },
  {
    id: "passport-publish",
    number: "05",
    title: "Passport & Publish",
    shortDescription: "Governed identity, published.",
    description:
      "Turn the verified record into a Digital Product Passport and distribute governed information through connected channels.",
    terms: [
      { label: "Digital Product Passport", href: marketingPath("digital-product-passport") },
      { label: "Unique Product ID" },
      { label: "QR / NFC" },
      { label: "Interoperability" },
    ],
    visualType: "publish",
    point: { x: 720, y: 520 },
  },
  {
    id: "use-learn",
    number: "06",
    title: "Use & Learn",
    shortDescription: "Intelligence from every channel.",
    description:
      "Use the same product intelligence across consumer experiences, retail and analytics and learn from the data it generates.",
    terms: [
      { label: "Consumer Experience" },
      { label: "Analytics" },
      { label: "Material Benchmark" },
      { label: "Supplier Performance", href: marketingPath("supplier-data") },
    ],
    visualType: "signals",
    point: { x: 400, y: 520 },
  },
  {
    id: "repair-recirculate",
    number: "07",
    title: "Repair & Recirculate",
    shortDescription: "Useful beyond first sale.",
    description:
      "Keep the product record useful beyond the first sale through care, repair, resale, reuse and end-of-life.",
    terms: [
      { label: "Care & Repair", href: marketingPath("solutions") },
      { label: "Resale" },
      { label: "Reuse" },
      { label: "End of Life" },
    ],
    visualType: "loop",
    point: { x: 160, y: 520 },
  },
];

/** Continuous serpentine ribbon through all marker centers. */
export function buildLifecycleRibbonPath(stages: LifecycleStage[] = LIFECYCLE_STAGES): string {
  const [a, b, c, d, e, f, g] = stages.map((s) => s.point);
  return [
    `M ${a.x} ${a.y}`,
    `C ${a.x + 120} ${a.y}, ${b.x - 120} ${b.y}, ${b.x} ${b.y}`,
    `C ${b.x + 140} ${b.y}, ${c.x - 140} ${c.y}, ${c.x} ${c.y}`,
    `C ${c.x} ${c.y + 110}, ${d.x} ${d.y - 110}, ${d.x} ${d.y}`,
    `C ${d.x - 110} ${d.y}, ${e.x + 110} ${e.y}, ${e.x} ${e.y}`,
    `C ${e.x - 100} ${e.y}, ${f.x + 100} ${f.y}, ${f.x} ${f.y}`,
    `C ${f.x - 90} ${f.y}, ${g.x + 90} ${g.y}, ${g.x} ${g.y}`,
  ].join(" ");
}

export const LIFECYCLE_RIBBON_D = buildLifecycleRibbonPath();

/** Travel duration between stages (ms). */
export const LIFECYCLE_TRAVEL_MS = 1050;
/** Dwell on an active stage (ms). */
export const LIFECYCLE_DWELL_MS = 2000;
/** Pause after manual click before autoplay resumes (ms). */
export const LIFECYCLE_RESUME_MS = 4500;
