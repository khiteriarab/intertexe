import { marketingPath } from "../../../lib/enterprise-marketing/paths";

export type LifecycleTerm = { label: string; href?: string };

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
  number: string;
  title: string;
  /** 3–6 word descriptor on the map */
  shortDescription: string;
  description: string;
  terms: LifecycleTerm[];
  /** Alternate label placement on the horizontal track */
  labelSide: "above" | "below";
};

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "source-make",
    number: "01",
    title: "Source & Make",
    shortDescription: "Materials · suppliers · make",
    description:
      "Capture how the product begins across materials, suppliers, components and manufacturing.",
    terms: [
      { label: "Raw Materials" },
      { label: "Suppliers", href: marketingPath("supplier-data") },
      { label: "Manufacturing" },
      { label: "Supply Chain Tiers" },
    ],
    labelSide: "above",
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
    labelSide: "below",
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
    labelSide: "above",
  },
  {
    id: "check-prepare",
    number: "04",
    title: "Check & Prepare",
    shortDescription: "Ready for DPP",
    description:
      "Identify missing information and prepare the product for sustainability, regulatory and Digital Product Passport requirements.",
    terms: [
      { label: "ESPR" },
      { label: "Compliance" },
      { label: "DPP Readiness", href: marketingPath("digital-product-passport") },
      { label: "Audit Evidence" },
    ],
    labelSide: "below",
  },
  {
    id: "passport-publish",
    number: "05",
    title: "Passport & Publish",
    shortDescription: "Governed identity published",
    description:
      "Turn the verified product record into a Digital Product Passport and distribute governed information through connected channels.",
    terms: [
      { label: "Digital Product Passport", href: marketingPath("digital-product-passport") },
      { label: "Unique Product ID" },
      { label: "QR / NFC" },
      { label: "Interoperability" },
    ],
    labelSide: "above",
  },
  {
    id: "use-learn",
    number: "06",
    title: "Use & Learn",
    shortDescription: "Intelligence from use",
    description:
      "Use the same product intelligence across consumer experiences, retail and analytics and learn from the data it generates.",
    terms: [
      { label: "Consumer Experience" },
      { label: "Analytics" },
      { label: "Material Benchmark" },
      { label: "Supplier Performance", href: marketingPath("supplier-data") },
    ],
    labelSide: "below",
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
    labelSide: "above",
  },
];

/** Horizontal transit track — subtle vertical rhythm, evenly spaced anchors. */
export const LIFECYCLE_VIEW = { width: 1320, height: 280 } as const;

/** Even x positions; slight y wave for editorial rhythm (not a freeform loop). */
export function stageAnchor(index: number): { x: number; y: number } {
  const n = LIFECYCLE_STAGES.length;
  const pad = 80;
  const usable = LIFECYCLE_VIEW.width - pad * 2;
  const x = pad + (usable * index) / (n - 1);
  // Soft sine offset ±10px — keeps the track nearly horizontal
  const y = LIFECYCLE_VIEW.height / 2 + Math.sin((index / (n - 1)) * Math.PI) * -10;
  return { x, y };
}

export function buildTransitPath(): string {
  const points = LIFECYCLE_STAGES.map((_, i) => stageAnchor(i));
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export const LIFECYCLE_PATH_D = buildTransitPath();

export const LIFECYCLE_TRAVEL_MS = 900;
export const LIFECYCLE_DWELL_MS = 1800;
export const LIFECYCLE_RESUME_MS = 4500;

export function progressForStage(index: number): number {
  const n = LIFECYCLE_STAGES.length;
  if (n <= 1) return 1;
  return index / (n - 1);
}

/** Point along the polyline of anchors at progress 0..1 (for the traveler dot). */
export function pointAtProgress(progress: number): { x: number; y: number } {
  const n = LIFECYCLE_STAGES.length;
  const t = Math.min(1, Math.max(0, progress)) * (n - 1);
  const i = Math.floor(t);
  const f = t - i;
  if (i >= n - 1) return stageAnchor(n - 1);
  const a = stageAnchor(i);
  const b = stageAnchor(i + 1);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
