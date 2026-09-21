/** Locked Follow the Record stages — See It Live walkthrough. */

export type FollowStageId =
  | "source"
  | "normalize"
  | "validate"
  | "publish"
  | "activate"
  | "measure";

export type FollowStage = {
  id: FollowStageId;
  number: string;
  label: string;
  headline: string;
  body: string;
};

export const FOLLOW_HEADER = {
  eyebrow: "Follow the record",
  headline: "Six ways teams work the record.",
  lede: "Scroll through how teams work the Silk Midi Skirt, from messy inputs to the passport your customer scans.",
  primaryCta: { label: "See a live product", href: "/brands/request?intent=demo&cta=follow_record" },
} as const;

export const FOLLOW_STAGES: FollowStage[] = [
  {
    id: "source",
    number: "01",
    label: "SOURCE",
    headline: "Fragmented inputs, one product.",
    body: "Ingest product data from PLM, ERP, suppliers, or your existing systems, preserved as submitted.",
  },
  {
    id: "normalize",
    number: "02",
    label: "NORMALIZE",
    headline: "Messy strings become structured intelligence.",
    body: "Clean, enrich, and standardize key product attributes and material composition without overwriting source strings.",
  },
  {
    id: "validate",
    number: "03",
    label: "VALIDATE",
    headline: "Claims become evidence-backed.",
    body: "Connect material and product claims to supplier evidence, provenance, and chain-of-custody records.",
  },
  {
    id: "publish",
    number: "04",
    label: "PUBLISH",
    headline: "One governed record, published everywhere.",
    body: "Turn the verified product record into a Digital Product Passport and distribute it through connected channels.",
  },
  {
    id: "activate",
    number: "05",
    label: "ACTIVATE",
    headline: "The product becomes a live digital touchpoint.",
    body: "Use QR, NFC, or passport delivery to support transparency, care, repair, resale, and post-purchase engagement.",
  },
  {
    id: "measure",
    number: "06",
    label: "MEASURE",
    headline: "Signals return to the record.",
    body: "Use engagement, scan activity, benchmarks, and product intelligence to understand performance and improve the record over time.",
  },
];

export const PRODUCT_RECORD = {
  name: "Silk Midi Skirt",
  sku: "ITX-4102",
  composition: "96% Silk · 4% Elastane",
  origin: "Italy",
  image: "/platform/hero-silk-dress.png",
} as const;

export const SOURCE_INPUTS = [
  { id: "plm", label: "PLM", detail: "92% silk, 8% elastane", kind: "PLM" },
  { id: "erp", label: "ERP", detail: "96% silk, 4% elastane", kind: "ERP" },
  { id: "sheet", label: "Spreadsheet", detail: "100% silk", kind: "XLS" },
  { id: "supplier", label: "Supplier file", detail: "Atelier Nord · Milan", kind: "PDF" },
  { id: "retail", label: "Retailer feed", detail: "Silk Midi Skirt", kind: "CSV" },
] as const;

export const MESSY_STRINGS = ["Silk 96", "96 silk", "SILK:96%", "96% Seide"] as const;

export const EVIDENCE_NODES = [
  { id: "supplier", label: "Supplier evidence", from: "Pending", to: "Linked" },
  { id: "provenance", label: "Provenance", from: "Incomplete", to: "Verified" },
  { id: "custody", label: "Chain of custody", from: "Pending", to: "Linked" },
] as const;

export const PUBLISH_CHANNELS = ["QR", "Web", "API", "Retail"] as const;

export const ACTIVATE_TAGS = ["QR / NFC", "Digital Product Passport", "Care", "Repair", "Resale"] as const;

export const MEASURE_SIGNALS = ["Analytics", "Engagement", "Scan Activity"] as const;
