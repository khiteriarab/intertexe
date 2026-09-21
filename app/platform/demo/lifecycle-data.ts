import { marketingPath } from "../../../lib/enterprise-marketing/paths";

export type LifecycleTerm = { label: string; href?: string };

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

export type LifecycleAnchor = {
  /** Point on the ribbon path (canvas coords) */
  x: number;
  y: number;
  /** Label placement relative to the anchor */
  label: "above" | "below" | "right" | "left";
};

export type LifecycleStage = {
  id: LifecycleStageId;
  number: string;
  title: string;
  shortDescription: string;
  description: string;
  terms: LifecycleTerm[];
  visualType: LifecycleVisualType;
  anchor: LifecycleAnchor;
};

export const LIFECYCLE_VIEW = { width: 1320, height: 560 } as const;

/**
 * Art-directed serpentine (not a flowchart grid):
 * upper L→R, soft descent, lower R→L finish.
 */
export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "source-make",
    number: "01",
    title: "Source & Make",
    shortDescription: "Materials · suppliers",
    description:
      "Capture how the product begins across materials, suppliers, components and manufacturing.",
    terms: [
      { label: "Raw Materials" },
      { label: "Suppliers", href: marketingPath("supplier-data") },
      { label: "Manufacturing" },
      { label: "Supply Chain Tiers" },
    ],
    visualType: "converge",
    anchor: { x: 120, y: 150, label: "above" },
  },
  {
    id: "clean-connect",
    number: "02",
    title: "Clean & Connect",
    shortDescription: "One trusted record",
    description:
      "Bring fragmented product information together, standardize it and connect it to one trusted product record.",
    terms: [
      { label: "PLM / PIM / ERP" },
      { label: "Data Normalization" },
      { label: "Material Composition" },
      { label: "Product Master Data", href: marketingPath("product-intelligence") },
    ],
    visualType: "normalize",
    anchor: { x: 460, y: 145, label: "above" },
  },
  {
    id: "trace-prove",
    number: "03",
    title: "Trace & Prove",
    shortDescription: "Claims linked to evidence",
    description: "Connect product and material claims to evidence across the supply chain.",
    terms: [
      { label: "Traceability", href: marketingPath("traceability") },
      { label: "Chain of Custody" },
      { label: "Provenance" },
      { label: "Supplier Evidence" },
    ],
    visualType: "trace",
    anchor: { x: 820, y: 170, label: "above" },
  },
  {
    id: "check-prepare",
    number: "04",
    title: "Check & Prepare",
    shortDescription: "DPP readiness",
    description:
      "Identify missing information and prepare the product for sustainability, regulatory and Digital Product Passport requirements.",
    terms: [
      { label: "ESPR" },
      { label: "Compliance" },
      { label: "DPP Readiness", href: marketingPath("digital-product-passport") },
      { label: "Audit Evidence" },
    ],
    visualType: "checklist",
    anchor: { x: 1040, y: 300, label: "right" },
  },
  {
    id: "passport-publish",
    number: "05",
    title: "Passport & Publish",
    shortDescription: "Governed identity",
    description:
      "Turn the verified product record into a Digital Product Passport and distribute governed information through connected channels.",
    terms: [
      { label: "Digital Product Passport", href: marketingPath("digital-product-passport") },
      { label: "Unique Product ID" },
      { label: "QR / NFC" },
      { label: "Interoperability" },
    ],
    visualType: "publish",
    anchor: { x: 820, y: 420, label: "below" },
  },
  {
    id: "use-learn",
    number: "06",
    title: "Use & Learn",
    shortDescription: "Signals return",
    description:
      "Use the same product intelligence across consumer experiences, retail and analytics and learn from the data it generates.",
    terms: [
      { label: "Consumer Experience" },
      { label: "Analytics" },
      { label: "Material Benchmark" },
      { label: "Supplier Performance", href: marketingPath("supplier-data") },
    ],
    visualType: "signals",
    anchor: { x: 460, y: 450, label: "below" },
  },
  {
    id: "repair-recirculate",
    number: "07",
    title: "Repair & Recirculate",
    shortDescription: "Beyond first sale",
    description:
      "Keep the product record useful beyond the first sale through care, repair, resale, reuse and end-of-life.",
    terms: [
      { label: "Care & Repair", href: marketingPath("solutions") },
      { label: "Resale" },
      { label: "Reuse" },
      { label: "End of Life" },
    ],
    visualType: "loop",
    anchor: { x: 160, y: 490, label: "below" },
  },
];

/** Continuous art-directed ribbon through all anchors. */
export function buildLifecyclePath(stages: LifecycleStage[] = LIFECYCLE_STAGES): string {
  const p = stages.map((s) => s.anchor);
  return [
    `M ${p[0].x} ${p[0].y}`,
    `C ${p[0].x + 110} ${p[0].y - 18}, ${p[1].x - 110} ${p[1].y - 12}, ${p[1].x} ${p[1].y}`,
    `C ${p[1].x + 130} ${p[1].y + 18}, ${p[2].x - 120} ${p[2].y + 8}, ${p[2].x} ${p[2].y}`,
    `C ${p[2].x + 90} ${p[2].y + 55}, ${p[3].x - 20} ${p[3].y - 70}, ${p[3].x} ${p[3].y}`,
    `C ${p[3].x - 70} ${p[3].y + 70}, ${p[4].x + 90} ${p[4].y - 40}, ${p[4].x} ${p[4].y}`,
    `C ${p[4].x - 120} ${p[4].y + 20}, ${p[5].x + 120} ${p[5].y - 10}, ${p[5].x} ${p[5].y}`,
    `C ${p[5].x - 100} ${p[5].y + 25}, ${p[6].x + 90} ${p[6].y - 15}, ${p[6].x} ${p[6].y}`,
  ].join(" ");
}

export const LIFECYCLE_PATH_D = buildLifecyclePath();

export const LIFECYCLE_TRAVEL_MS = 1000;
export const LIFECYCLE_DWELL_MS = 2000;
export const LIFECYCLE_RESUME_MS = 4500;

export function progressForStage(index: number): number {
  const n = LIFECYCLE_STAGES.length;
  if (n <= 1) return 1;
  return index / (n - 1);
}
