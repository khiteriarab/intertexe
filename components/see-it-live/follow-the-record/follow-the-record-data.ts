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
  /** Original stage artwork — do not replace without explicit approval. */
  image: string;
  alt: string;
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
    body: "Ingest product data from PLM, ERP, suppliers, or your existing systems — preserved as submitted.",
    image: "/platform/demo-source.png",
    alt: "Fragmented inputs from PLM, ERP, spreadsheet, supplier file, and retailer feed converging into one INTERTEXE product record",
  },
  {
    id: "normalize",
    number: "02",
    label: "NORMALIZE",
    headline: "Messy strings become structured intelligence.",
    body: "Clean, enrich, and standardize key product attributes and material composition without overwriting source strings.",
    image: "/platform/demo-normalize.png",
    alt: "INTERTEXE issues workspace resolving a composition conflict — current approved vs incoming source",
  },
  {
    id: "validate",
    number: "03",
    label: "VALIDATE",
    headline: "Claims become evidence-backed.",
    body: "Connect material and product claims to supplier evidence, provenance, and chain-of-custody records.",
    image: "/platform/demo-validate.png",
    alt: "INTERTEXE product workspace with key indicators for a ready-to-publish record",
  },
  {
    id: "publish",
    number: "04",
    label: "PUBLISH",
    headline: "One governed record, published everywhere.",
    body: "Turn the verified product record into a Digital Product Passport and distribute it through connected channels.",
    image: "/platform/demo-publish.png",
    alt: "Publish once — digital product passport powering web, QR, mobile app, API, and retail channels",
  },
  {
    id: "activate",
    number: "05",
    label: "ACTIVATE",
    headline: "The product becomes a live digital touchpoint.",
    body: "Use QR, NFC, or passport delivery to support transparency, care, repair, resale, and post-purchase engagement.",
    image: "/platform/demo-activate.png",
    alt: "INTERTEXE product record with preview QR and full source-to-next-life lifecycle",
  },
  {
    id: "measure",
    number: "06",
    label: "MEASURE",
    headline: "Signals return to the record.",
    body: "Use engagement, scan activity, benchmarks, and product intelligence to understand performance and improve the record over time.",
    image: "/platform/demo-measure.png",
    alt: "Material Benchmark dashboard — governed record coverage, peer medians, and passport performance",
  },
];
