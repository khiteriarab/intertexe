import { formatOperatorTime } from "./reviewer-display";
import { pilotProductImage, resolvePilotFixture } from "./pilot-product-media";
import { publicResolverUrl } from "./carriers";

export type JourneyNodeStatus = "complete" | "current" | "pending";

export type JourneyNode = {
  id: string;
  stage: string;
  label: string;
  detail: string;
  /** Normalized map coordinates (0–100) */
  x: number;
  y: number;
  timestamp: string | null;
  status: JourneyNodeStatus;
  /** Label sits above or below the node dot to reduce overlap */
  labelAnchor: "above" | "below";
};

export type ProductJourney = {
  productName: string;
  composition: string | null;
  brand: string | null;
  imageUrl: string | null;
  qrUrl: string | null;
  publicId: string | null;
  passportState: string | null;
  isPublished: boolean;
  nodes: JourneyNode[];
};

type FixtureRow = {
  sku?: string;
  style?: string;
  name?: string;
  composition?: string;
  brand?: string;
  image_url?: string | null;
  country_of_origin?: string | null;
};

type ProductRecordInput = {
  product: {
    name?: string | null;
    sku?: string | null;
    style_code?: string | null;
    passport_state?: string | null;
  };
  fields: Array<{
    field_key: string;
    normalized_value?: string | null;
    original_value?: string | null;
    updated_at?: string | null;
    state?: string | null;
  }>;
  sourceRecords: Array<{
    retrieved_at?: string | null;
    created_at?: string | null;
    original_payload?: unknown;
  }>;
  passport: {
    public_id: string;
    state: string;
    publicUrl?: string;
    versions: Array<{ published_at?: string | null; created_at?: string | null }>;
    carriers: Array<{
      carrier_type?: string;
      public_url?: string | null;
      activated_at?: string | null;
      created_at?: string | null;
      state?: string | null;
    }>;
  } | null;
  identityPublicId?: string | null;
};

/** Horizontal line-map layout — origin → end of life, spaced to avoid label collisions. */
const MAP_LAYOUT: Array<{ id: string; x: number; y: number; labelAnchor: "above" | "below" }> = [
  { id: "fiber", x: 8, y: 48, labelAnchor: "above" },
  { id: "mill", x: 22, y: 62, labelAnchor: "below" },
  { id: "make", x: 36, y: 48, labelAnchor: "above" },
  { id: "publish", x: 50, y: 62, labelAnchor: "below" },
  { id: "carrier", x: 64, y: 48, labelAnchor: "above" },
  { id: "market", x: 78, y: 62, labelAnchor: "below" },
  { id: "ownership", x: 88, y: 48, labelAnchor: "above" },
  { id: "nextlife", x: 96, y: 62, labelAnchor: "below" },
];

function layoutFor(id: string) {
  return MAP_LAYOUT.find((slot) => slot.id === id) || { x: 50, y: 50, labelAnchor: "above" as const };
}

function fixtureForProduct(product: ProductRecordInput["product"]): FixtureRow | null {
  return resolvePilotFixture(product.sku, product.style_code) as FixtureRow | null;
}

function fieldValue(
  fields: ProductRecordInput["fields"],
  key: string
): { value: string | null; updatedAt: string | null; state: string | null } {
  const row = fields.find((f) => f.field_key === key);
  return {
    value: row?.normalized_value || row?.original_value || null,
    updatedAt: row?.updated_at || null,
    state: row?.state || null,
  };
}

function payloadCountry(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const raw =
    p.country_of_origin ||
    p["Country of Origin"] ||
    p.manufacturing_country ||
    p["Manufacturing Country"];
  return raw ? String(raw).trim().toUpperCase().slice(0, 2) : null;
}

function inferFiberOrigin(composition: string | null): { label: string; detail: string } {
  const c = (composition || "").toLowerCase();
  if (c.includes("linen")) return { label: "Flax cultivation", detail: "European flax belt · fiber harvest" };
  if (c.includes("cashmere")) return { label: "Cashmere fiber", detail: "Nomadic herding · raw fiber collection" };
  if (c.includes("silk")) return { label: "Silk cultivation", detail: "Sericulture · raw silk filament" };
  if (c.includes("wool")) return { label: "Wool fiber", detail: "Scandinavian wool · scouring & grading" };
  if (c.includes("cotton")) return { label: "Cotton cultivation", detail: "Ginning · bale preparation" };
  return { label: "Raw material", detail: "Fiber source · pre-mill processing" };
}

function inferMarket(imageUrl: string | null, brand: string | null): { label: string; detail: string } {
  const url = (imageUrl || "").toLowerCase();
  if (url.includes("mytheresa")) return { label: "Luxury retail", detail: "Mytheresa · EU omnichannel sale" };
  if (url.includes("bloomingdales")) return { label: "Department retail", detail: "Bloomingdale's · US point of sale" };
  if (url.includes("shopify")) return { label: "Direct-to-consumer", detail: `${brand || "Brand"} · online storefront` };
  return { label: "Retail", detail: "Verified retail channel · consumer purchase" };
}

function node(
  id: string,
  stage: string,
  label: string,
  detail: string,
  status: JourneyNodeStatus,
  timestamp: string | null
): JourneyNode {
  const slot = layoutFor(id);
  return {
    id,
    stage,
    label,
    detail,
    x: slot.x,
    y: slot.y,
    timestamp,
    status,
    labelAnchor: slot.labelAnchor,
  };
}

export function buildProductJourney(record: ProductRecordInput, origin: string): ProductJourney {
  const fixture = fixtureForProduct(record.product);
  const sku = record.product.sku || null;
  const imageUrl = pilotProductImage(sku, record.product.style_code) || fixture?.image_url || null;
  const compositionField = fieldValue(record.fields, "composition");
  const originField = fieldValue(record.fields, "manufacturing_country");
  const careField = fieldValue(record.fields, "care_instructions");
  const distributionField = fieldValue(record.fields, "distribution");
  const composition = compositionField.value || fixture?.composition || null;
  const brand = fixture?.brand || null;

  const importRecord = record.sourceRecords[0];
  const importAt = importRecord?.retrieved_at || importRecord?.created_at || null;
  const importCountry =
    payloadCountry(importRecord?.original_payload) ||
    originField.value?.toUpperCase().slice(0, 2) ||
    fixture?.country_of_origin?.toUpperCase() ||
    "PT";

  const publishedVersion = record.passport?.versions.find((v) => v.published_at);
  const publishedAt = publishedVersion?.published_at || null;
  const activeCarrier =
    record.passport?.carriers.find((c) => c.state === "active") ||
    record.passport?.carriers.find((c) => c.state === "draft") ||
    record.passport?.carriers[0];

  const fiber = inferFiberOrigin(composition);
  const market = inferMarket(imageUrl, brand);
  const makeCountry = importCountry;

  const passportState = record.passport?.state || record.product.passport_state || null;
  const isPublished = passportState === "published" || passportState === "update_required";
  const hasPassport = Boolean(record.passport?.public_id || record.identityPublicId);
  const publicId = record.passport?.public_id || record.identityPublicId || null;

  const qrCarrier =
    record.passport?.carriers.find(
      (c) => (c as { carrier_type?: string }).carrier_type === "qr" && c.state !== "retired"
    ) || record.passport?.carriers.find((c) => c.state !== "retired");

  const qrUrl = publicId
    ? qrCarrier?.public_url?.startsWith("http")
      ? qrCarrier.public_url
      : record.passport?.publicUrl?.startsWith("http")
        ? record.passport.publicUrl
        : publicResolverUrl(publicId)
    : null;

  const nodes: JourneyNode[] = [
    node(
      "fiber",
      "01 · Source",
      fiber.label,
      fiber.detail,
      composition ? "complete" : "pending",
      importAt ? formatOperatorTime(importAt) : null
    ),
    node(
      "mill",
      "02 · Mill",
      "Textile mill",
      "Spinning & weaving · pre-garment processing",
      composition ? "complete" : "pending",
      importAt ? formatOperatorTime(importAt) : null
    ),
    node(
      "make",
      "03 · Make",
      "Garment assembly",
      `${makeCountry} · cut & sew`,
      originField.value || fixture?.country_of_origin ? "complete" : "pending",
      originField.updatedAt ? formatOperatorTime(originField.updatedAt) : null
    ),
    node(
      "publish",
      "04 · Passport",
      "Digital product passport",
      hasPassport ? "Material truth linked to resolver" : "Awaiting review & publish",
      isPublished ? "complete" : hasPassport ? "current" : "pending",
      publishedAt ? formatOperatorTime(publishedAt) : null
    ),
    node(
      "carrier",
      "05 · Identity",
      "QR on product",
      publicId ? "Scannable carrier → consumer page" : "Carrier provisioned at publish",
      publicId ? (isPublished ? "complete" : "current") : "pending",
      activeCarrier?.activated_at || activeCarrier?.created_at
        ? formatOperatorTime(activeCarrier.activated_at || activeCarrier.created_at || "")
        : null
    ),
    node(
      "market",
      "06 · Sale",
      market.label,
      distributionField.value || market.detail,
      isPublished ? "complete" : "pending",
      isPublished ? "Live" : null
    ),
    node(
      "ownership",
      "07 · Ownership",
      "Care & longevity",
      careField.value || "Care guidance published on passport when approved",
      careField.value ? "complete" : "pending",
      careField.updatedAt ? formatOperatorTime(careField.updatedAt) : null
    ),
    node(
      "nextlife",
      "08 · Next life",
      "Repair · resell · recycle",
      "Circularity guidance on consumer passport — not a brand-operated program unless verified",
      isPublished ? "complete" : "pending",
      null
    ),
  ];

  return {
    productName: String(record.product.name || fixture?.name || "Product"),
    composition,
    brand,
    imageUrl,
    qrUrl,
    publicId,
    passportState,
    isPublished,
    nodes,
  };
}
