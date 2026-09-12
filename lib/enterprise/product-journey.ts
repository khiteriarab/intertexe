import { formatOperatorTime } from "./reviewer-display";
import livePilotProducts from "./fixtures/intertexe-live-10-products.json";
import { pilotProductImage, resolvePilotFixture } from "./pilot-product-media";

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
};

export type ProductJourney = {
  productName: string;
  composition: string | null;
  brand: string | null;
  imageUrl: string | null;
  qrUrl: string | null;
  publicId: string | null;
  passportState: string | null;
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
};

/** Map centroids on a stylized editorial world canvas (percent x/y). */
const GEO: Record<string, { x: number; y: number; label: string }> = {
  BE: { x: 48.5, y: 19, label: "Belgium" },
  PT: { x: 46.5, y: 23, label: "Portugal" },
  IT: { x: 50.5, y: 21, label: "Italy" },
  NO: { x: 49.5, y: 13, label: "Norway" },
  IN: { x: 71, y: 27, label: "India" },
  CN: { x: 78, y: 24, label: "China" },
  MN: { x: 75, y: 19, label: "Mongolia" },
  DE: { x: 51, y: 19.5, label: "Germany" },
  US: { x: 22, y: 21, label: "United States" },
  UK: { x: 47, y: 17, label: "United Kingdom" },
  EG: { x: 54, y: 26, label: "Egypt" },
};

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

function inferFiberOrigin(composition: string | null): { code: string; label: string; detail: string } {
  const c = (composition || "").toLowerCase();
  if (c.includes("linen")) return { code: "BE", label: "Flax cultivation", detail: "European flax belt · fiber harvest" };
  if (c.includes("cashmere")) return { code: "MN", label: "Cashmere fiber", detail: "Nomadic herding · raw fiber collection" };
  if (c.includes("silk")) return { code: "CN", label: "Silk cultivation", detail: "Sericulture · raw silk filament" };
  if (c.includes("wool")) return { code: "NO", label: "Wool fiber", detail: "Scandinavian wool · scouring & grading" };
  if (c.includes("cotton")) return { code: "IN", label: "Cotton cultivation", detail: "Ginning · bale preparation" };
  return { code: "EG", label: "Raw material", detail: "Fiber source · pre-mill processing" };
}

function inferMarket(imageUrl: string | null, brand: string | null): { code: string; label: string; detail: string } {
  const url = (imageUrl || "").toLowerCase();
  if (url.includes("mytheresa")) {
    return { code: "DE", label: "Luxury retail", detail: "Mytheresa · EU omnichannel sale" };
  }
  if (url.includes("bloomingdales")) {
    return { code: "US", label: "Department retail", detail: "Bloomingdale's · US point of sale" };
  }
  if (url.includes("shopify")) {
    return { code: "US", label: "Direct-to-consumer", detail: `${brand || "Brand"} · online storefront` };
  }
  return { code: "UK", label: "Marketplace", detail: "Verified retail channel · consumer purchase" };
}

function nodeStatus(hasData: boolean, isFuture: boolean): JourneyNodeStatus {
  if (isFuture) return hasData ? "complete" : "pending";
  return hasData ? "complete" : "pending";
}

function geo(code: string) {
  return GEO[code] || GEO.PT;
}

export function buildProductJourney(record: ProductRecordInput, origin: string): ProductJourney {
  const fixture = fixtureForProduct(record.product);
  const sku = record.product.sku || null;
  const imageUrl = pilotProductImage(sku, record.product.style_code) || fixture?.image_url || null;
  const compositionField = fieldValue(record.fields, "composition");
  const originField = fieldValue(record.fields, "manufacturing_country");
  const composition =
    compositionField.value || fixture?.composition || null;
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
    record.passport?.carriers[0];
  const carrierAt = activeCarrier?.activated_at || activeCarrier?.created_at || publishedAt;

  const fiber = inferFiberOrigin(composition);
  const market = inferMarket(imageUrl, brand);
  const makeGeo = geo(importCountry);
  const fiberGeo = geo(fiber.code);
  const marketGeo = geo(market.code);

  const passportState = record.passport?.state || record.product.passport_state || null;
  const isPublished = passportState === "published" || passportState === "update_required";
  const hasPassport = Boolean(record.passport);
  const qrCarrier =
    record.passport?.carriers.find(
      (c) => (c as { carrier_type?: string }).carrier_type === "qr" && c.state !== "retired"
    ) || record.passport?.carriers.find((c) => c.state !== "retired");
  const qrUrl = record.passport?.public_id
    ? qrCarrier?.public_url?.startsWith("http")
      ? qrCarrier.public_url
      : record.passport.publicUrl?.startsWith("http")
        ? record.passport.publicUrl
        : `${origin.replace(/\/$/, "")}${record.passport.publicUrl || `/p/${record.passport.public_id}`}`
    : null;

  const nodes: JourneyNode[] = [
    {
      id: "fiber",
      stage: "01 · Source",
      label: fiber.label,
      detail: fiber.detail,
      x: fiberGeo.x,
      y: fiberGeo.y,
      timestamp: importAt ? formatOperatorTime(importAt) : null,
      status: composition ? "complete" : "pending",
    },
    {
      id: "mill",
      stage: "02 · Mill",
      label: "Textile mill",
      detail: `Spinning & weaving · ${makeGeo.label}`,
      x: makeGeo.x - 1.5,
      y: makeGeo.y - 2,
      timestamp: importAt ? formatOperatorTime(importAt) : null,
      status: composition ? "complete" : "pending",
    },
    {
      id: "make",
      stage: "03 · Make",
      label: "Garment assembly",
      detail: `${makeGeo.label} · cut & sew`,
      x: makeGeo.x,
      y: makeGeo.y,
      timestamp: originField.updatedAt ? formatOperatorTime(originField.updatedAt) : null,
      status: nodeStatus(Boolean(originField.value || fixture?.country_of_origin), false),
    },
    {
      id: "publish",
      stage: "04 · Passport",
      label: "Digital product passport",
      detail: hasPassport ? "Material truth published to resolver" : "Awaiting review & publish",
      x: 58,
      y: 18,
      timestamp: publishedAt ? formatOperatorTime(publishedAt) : null,
      status: isPublished ? "complete" : hasPassport ? "current" : "pending",
    },
    {
      id: "carrier",
      stage: "05 · Identity",
      label: "QR on product",
      detail: activeCarrier ? "Data carrier linked to passport" : "Carrier provisioned at publish",
      x: 62,
      y: 24,
      timestamp: carrierAt ? formatOperatorTime(carrierAt) : null,
      status: isPublished ? "complete" : hasPassport ? "current" : "pending",
    },
    {
      id: "market",
      stage: "06 · Sale",
      label: market.label,
      detail: market.detail,
      x: marketGeo.x,
      y: marketGeo.y,
      timestamp: isPublished ? "Live" : null,
      status: isPublished ? "complete" : "pending",
    },
  ];

  return {
    productName: String(record.product.name || fixture?.name || "Product"),
    composition,
    brand,
    imageUrl,
    qrUrl,
    publicId: record.passport?.public_id || null,
    passportState,
    nodes,
  };
}
