import { parseCompositionText } from "../material-intelligence/composition";
import {
  pilotProductImage,
  resolvePilotFixture,
  type PilotFixtureRow,
} from "./pilot-product-media";

export type JourneyStage = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string | null;
  location: string | null;
  status: "known" | "unavailable";
  imageUrl?: string | null;
};

export type NextLifeItem = {
  title: string;
  detail: string;
  kind: "guidance" | "program";
};

export type ConsumerPassportContent = {
  productName: string;
  brand: string | null;
  category: string | null;
  color: string | null;
  identifier: string | null;
  composition: string | null;
  materialBreakdown: Array<{ fiber: string; pct: number | null }>;
  manufacturingCountry: string | null;
  manufacturer: string | null;
  facility: string | null;
  imageUrl: string | null;
  passportStatus: string;
  careInstructions: string[] | null;
  journeyStages: JourneyStage[];
  nextLife: NextLifeItem[];
  timeline: Array<{ label: string; date: string | null }>;
  publicFields: Array<{ key: string; value: string }>;
};

type PublicField = { key?: string; value?: string };

type TraceNode = {
  tier: number;
  tier_label?: string | null;
  facility_name?: string | null;
  country_code?: string | null;
  data_status?: string | null;
};

const COUNTRY_NAMES: Record<string, string> = {
  PT: "Portugal",
  IT: "Italy",
  TR: "Turkey",
  IN: "India",
  CN: "China",
  US: "United States",
  UK: "United Kingdom",
  DE: "Germany",
  NO: "Norway",
  BE: "Belgium",
};

function fieldValue(fields: PublicField[], key: string): string | null {
  const row = fields.find((f) => f.key === key);
  return row?.value ? String(row.value).trim() : null;
}

function countryLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return COUNTRY_NAMES[normalized] || normalized;
}

function parseCare(value: string | null): string[] | null {
  if (!value) return null;
  const lines = value
    .split(/[.;|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return lines.length ? lines : null;
}

function materialBreakdownFromComposition(composition: string | null): Array<{ fiber: string; pct: number | null }> {
  if (!composition) return [];
  const parsed = parseCompositionText(composition);
  return parsed.components.map((c) => ({
    fiber: c.fiber_name || c.fiber_code,
    pct: c.percentage,
  }));
}

function tierStage(id: string, eyebrow: string, node: TraceNode | null): JourneyStage {
  const known = Boolean(node?.facility_name || node?.country_code);
  return {
    id,
    eyebrow,
    title: node?.facility_name || node?.tier_label || eyebrow,
    detail: known ? node?.tier_label || null : null,
    location: countryLabel(node?.country_code),
    status: known ? "known" : "unavailable",
  };
}

function buildJourneyStages(input: {
  composition: string | null;
  manufacturingCountry: string | null;
  manufacturer: string | null;
  facility: string | null;
  distribution: string | null;
  retailMarket: string | null;
  traceNodes: TraceNode[];
  imageUrl: string | null;
  productName: string;
  brand: string | null;
  careInstructions: string[] | null;
}): JourneyStage[] {
  const byTier = new Map(input.traceNodes.map((n) => [n.tier, n]));
  const tier1 = byTier.get(1) || null;
  const makeCountry = input.manufacturingCountry;

  const stages: JourneyStage[] = [
    tierStage("raw", "Raw material", byTier.get(4) || null),
    tierStage("process", "Processing", byTier.get(3) || null),
    tierStage("fabric", "Fabric", byTier.get(2) || null),
    {
      id: "manufacturing",
      eyebrow: "Manufacturing",
      title:
        tier1?.facility_name || input.manufacturer || input.facility || "Garment assembly",
      detail: tier1?.tier_label || input.manufacturer || null,
      location: countryLabel(tier1?.country_code || makeCountry),
      status:
        tier1?.facility_name || tier1?.country_code || input.manufacturer || input.facility || makeCountry
          ? "known"
          : "unavailable",
    },
    {
      id: "product",
      eyebrow: "Product",
      title: input.productName,
      detail: input.composition || input.brand,
      location: null,
      status: "known",
      imageUrl: input.imageUrl,
    },
  ];

  if (input.distribution) {
    stages.push({
      id: "distribution",
      eyebrow: "Distribution",
      title: input.distribution,
      detail: null,
      location: null,
      status: "known",
    });
  }

  if (input.retailMarket) {
    stages.push({
      id: "sale",
      eyebrow: "Sale",
      title: "Retail",
      detail: null,
      location: input.retailMarket,
      status: "known",
    });
  }

  if (input.careInstructions?.length) {
    stages.push({
      id: "care",
      eyebrow: "Ownership",
      title: "Care & longevity",
      detail: input.careInstructions.join(" · "),
      location: null,
      status: "known",
    });
  }

  stages.push({
    id: "next-life",
    eyebrow: "Next life",
    title: "Repair · Resell · Donate · Recycle",
    detail: "INTERTEXE circularity guidance",
    location: null,
    status: "known",
  });

  return stages;
}

function buildNextLife(): NextLifeItem[] {
  return [
    {
      title: "Repair & rewear",
      detail: "Extending wear through repair and alteration is the highest-impact circular action.",
      kind: "guidance",
    },
    {
      title: "Resell & donate",
      detail: "Quality garments can enter resale or donation channels when you no longer wear them.",
      kind: "guidance",
    },
    {
      title: "Recycling",
      detail: "Check local textile collection — fiber mix affects recyclability.",
      kind: "guidance",
    },
  ];
}

function buildTimeline(input: {
  publishedAt: string | null;
  passportCreatedAt: string | null;
  versions: Array<{ version_number: number; published_at?: string | null; created_at?: string | null }>;
}): Array<{ label: string; date: string | null }> {
  const items: Array<{ label: string; date: string | null }> = [];
  if (input.passportCreatedAt) {
    items.push({ label: "Passport created", date: input.passportCreatedAt });
  }
  const firstPublish = input.versions.find((v) => v.published_at)?.published_at || input.publishedAt;
  if (firstPublish) {
    items.push({ label: "Published", date: firstPublish });
  }
  const latest = input.versions[input.versions.length - 1];
  if (latest && latest.published_at && latest.published_at !== firstPublish) {
    items.push({ label: `Updated (v${latest.version_number})`, date: latest.published_at });
  }
  return items;
}

export function buildConsumerPassportContent(input: {
  productName?: string | null;
  sku?: string | null;
  styleCode?: string | null;
  category?: string | null;
  snapshotFields?: PublicField[];
  traceNodes?: TraceNode[];
  passportStatus?: string;
  publishedAt?: string | null;
  passportCreatedAt?: string | null;
  versions?: Array<{ version_number: number; published_at?: string | null; created_at?: string | null }>;
  fixture?: PilotFixtureRow | null;
}): ConsumerPassportContent {
  const fixture = input.fixture ?? resolvePilotFixture(input.sku, input.styleCode);
  const fields = input.snapshotFields || [];

  const composition = fieldValue(fields, "composition") || fixture?.composition || null;
  const manufacturingCountry =
    fieldValue(fields, "manufacturing_country") || fixture?.country_of_origin || null;
  const manufacturer = fieldValue(fields, "manufacturer");
  const facility = fieldValue(fields, "facility");
  const distribution = fieldValue(fields, "distribution");
  const retailMarket = fieldValue(fields, "retail_market");
  const color = fieldValue(fields, "color");
  const careInstructions = parseCare(fieldValue(fields, "care_instructions"));

  const publicFields = fields
    .filter((f) => f.key && f.value)
    .map((f) => ({ key: String(f.key), value: String(f.value) }));

  const identifier =
    fieldValue(fields, "gtin") ||
    fieldValue(fields, "sku") ||
    input.sku ||
    fixture?.gtin ||
    fixture?.sku ||
    null;

  const imageUrl = pilotProductImage(input.sku, input.styleCode);

  return {
    productName: input.productName || fixture?.name || "Product",
    brand: fixture?.brand || null,
    category: input.category || fixture?.category || null,
    color,
    identifier,
    composition,
    materialBreakdown: materialBreakdownFromComposition(composition),
    manufacturingCountry: countryLabel(manufacturingCountry),
    manufacturer,
    facility,
    imageUrl,
    passportStatus: input.passportStatus || "published",
    careInstructions,
    journeyStages: buildJourneyStages({
      composition,
      manufacturingCountry,
      manufacturer,
      facility,
      distribution,
      retailMarket,
      traceNodes: input.traceNodes || [],
      imageUrl,
      productName: input.productName || fixture?.name || "Product",
      brand: fixture?.brand || null,
      careInstructions,
    }),
    nextLife: buildNextLife(),
    timeline: buildTimeline({
      publishedAt: input.publishedAt || null,
      passportCreatedAt: input.passportCreatedAt || null,
      versions: input.versions || [],
    }),
    publicFields,
  };
}
