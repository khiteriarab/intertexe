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

/** Desktop map positions in % of the canvas (origin top-left). */
export type LifecycleMapPoint = { x: number; y: number };

export type LifecycleStage = {
  id: LifecycleStageId;
  number: string;
  title: string;
  /** Inactive / compact supporting line */
  shortDescription: string;
  /** Full active explanation */
  description: string;
  terms: LifecycleTerm[];
  visualType: LifecycleVisualType;
  /** Desktop node center */
  map: LifecycleMapPoint;
};

/**
 * Map geometry (desktop):
 * 01 → 02 → 03
 *            ↓
 * 07 ← 06 ← 05 ← 04
 */
export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "source-make",
    number: "01",
    title: "Source & Make",
    shortDescription: "Materials, suppliers, manufacturing.",
    description:
      "Capture how the product begins: materials, suppliers, components and manufacturing.",
    terms: [
      { label: "Raw Materials" },
      { label: "Suppliers", href: marketingPath("supplier-data") },
      { label: "Manufacturing" },
      { label: "Supply Chain Tiers" },
    ],
    visualType: "converge",
    map: { x: 12, y: 22 },
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
    map: { x: 42, y: 22 },
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
    map: { x: 78, y: 22 },
  },
  {
    id: "check-prepare",
    number: "04",
    title: "Check & Prepare",
    shortDescription: "Close gaps. Ready for DPP.",
    description:
      "Identify missing information and prepare products for sustainability, compliance and Digital Product Passport requirements.",
    terms: [
      { label: "ESPR" },
      { label: "Compliance" },
      { label: "DPP Readiness", href: marketingPath("digital-product-passport") },
      { label: "Audit Evidence" },
    ],
    visualType: "checklist",
    map: { x: 78, y: 72 },
  },
  {
    id: "passport-publish",
    number: "05",
    title: "Passport & Publish",
    shortDescription: "Governed identity, published.",
    description:
      "Turn the verified product record into a Digital Product Passport and distribute governed information through connected channels.",
    terms: [
      { label: "Digital Product Passport", href: marketingPath("digital-product-passport") },
      { label: "Unique Product ID" },
      { label: "QR / NFC" },
      { label: "Interoperability" },
    ],
    visualType: "publish",
    map: { x: 50, y: 72 },
  },
  {
    id: "use-learn",
    number: "06",
    title: "Use & Learn",
    shortDescription: "Intelligence from every channel.",
    description:
      "Use the same product intelligence across consumer experiences, retail and analytics, and learn from the data it generates.",
    terms: [
      { label: "Consumer Experience" },
      { label: "Analytics" },
      { label: "Material Benchmark" },
      { label: "Supplier Performance", href: marketingPath("supplier-data") },
    ],
    visualType: "signals",
    map: { x: 28, y: 72 },
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
    map: { x: 10, y: 72 },
  },
];

/** Cubic paths between consecutive map points (viewBox 0 0 100 100). */
export function lifecycleConnectorPath(from: LifecycleMapPoint, to: LifecycleMapPoint): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Vertical drop from TRACE → CHECK: mild S
  if (Math.abs(dx) < 8 && dy > 20) {
    return `M ${from.x} ${from.y} C ${from.x + 6} ${from.y + dy * 0.35}, ${to.x - 6} ${to.y - dy * 0.35}, ${to.x} ${to.y}`;
  }
  // Horizontal with slight bow
  const midY = (from.y + to.y) / 2 + (from.y < 40 ? -2 : 2);
  return `M ${from.x} ${from.y} C ${from.x + dx * 0.4} ${midY}, ${to.x - dx * 0.4} ${midY}, ${to.x} ${to.y}`;
}

export const LIFECYCLE_CONNECTORS = LIFECYCLE_STAGES.slice(0, -1).map((stage, i) => {
  const next = LIFECYCLE_STAGES[i + 1];
  return {
    id: `${stage.id}__${next.id}`,
    d: lifecycleConnectorPath(stage.map, next.map),
    fromIndex: i,
    toIndex: i + 1,
  };
});

export const LIFECYCLE_STEP_MS = 1800;
