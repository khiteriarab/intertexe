/**
 * Read-only Material Intelligence demo records.
 * No database, no secrets — demonstration data only.
 */

export const DPP_READINESS_NOTICE = "DPP-readiness output, not legal certification.";

export const PREFIX_COMPOSITION_NOTICE =
  "A GTIN/EAN company prefix can identify a manufacturer. It does not verify a specific product's composition. No composition was assumed.";

export type DemoFiber = {
  fiber: string;
  percentage: number;
};

export type DemoMatchType = "exact_gtin" | "sku" | "company_prefix" | "none";

export type DemoProvenanceStatus = "verified" | "reported" | "not_found";

export type DemoDppStatus = "mapped" | "partial" | "insufficient";

export type DemoCompositionRecord = {
  product: {
    gtin: string;
    brand: string | null;
    name: string | null;
    match_type: DemoMatchType;
    sku?: string | null;
  };
  composition: DemoFiber[];
  material_intelligence: {
    natural_fiber_percentage: number | null;
    primary_fiber: string | null;
  };
  provenance: {
    status: DemoProvenanceStatus;
    source_type: "garment_label" | "brand_catalog" | "retailer_feed" | "company_prefix" | "none";
    captured_at: string | null;
    reviewed: boolean;
  };
  dpp_readiness: {
    status: DemoDppStatus;
    mapped_fields: string[];
    missing_fields: string[];
  };
  notice: string;
};

export type DemoExample = {
  id: "verified" | "reported" | "not_found";
  label: string;
  subtitle: string;
  query: string;
};

export const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: "verified",
    label: "Verified",
    subtitle: "Exact barcode · reviewed label",
    query: "0123456789012",
  },
  {
    id: "reported",
    label: "Reported",
    subtitle: "Brand / retailer source",
    query: "0198765432104",
  },
  {
    id: "not_found",
    label: "Not found",
    subtitle: "Company prefix only",
    query: "0500123456789",
  },
];

const VERIFIED: DemoCompositionRecord = {
  product: {
    gtin: "0123456789012",
    brand: "Demo Brand",
    name: "Silk Midi Skirt",
    match_type: "exact_gtin",
    sku: "SILK-MIDI-SKIRT",
  },
  composition: [
    { fiber: "silk", percentage: 96 },
    { fiber: "elastane", percentage: 4 },
  ],
  material_intelligence: {
    natural_fiber_percentage: 96,
    primary_fiber: "silk",
  },
  provenance: {
    status: "verified",
    source_type: "garment_label",
    captured_at: "2026-08-18",
    reviewed: true,
  },
  dpp_readiness: {
    status: "partial",
    mapped_fields: ["product_identifier", "fiber_composition"],
    missing_fields: ["country_of_origin", "manufacturer_identifier", "repair_information"],
  },
  notice: DPP_READINESS_NOTICE,
};

const REPORTED: DemoCompositionRecord = {
  product: {
    gtin: "0198765432104",
    brand: "Demo Atelier",
    name: "Cotton Poplin Shirt",
    match_type: "exact_gtin",
    sku: "COTTON-POPLIN-SHIRT",
  },
  composition: [
    { fiber: "cotton", percentage: 100 },
  ],
  material_intelligence: {
    natural_fiber_percentage: 100,
    primary_fiber: "cotton",
  },
  provenance: {
    status: "reported",
    source_type: "retailer_feed",
    captured_at: "2026-06-02",
    reviewed: false,
  },
  dpp_readiness: {
    status: "partial",
    mapped_fields: ["product_identifier", "fiber_composition"],
    missing_fields: ["country_of_origin", "manufacturer_identifier", "repair_information"],
  },
  notice: `${DPP_READINESS_NOTICE} Composition is reported from a retailer source, not confirmed against a retained label image.`,
};

const NOT_FOUND: DemoCompositionRecord = {
  product: {
    gtin: "0500123456789",
    brand: "Demo House",
    name: null,
    match_type: "company_prefix",
    sku: "HOUSE-UNKNOWN",
  },
  composition: [],
  material_intelligence: {
    natural_fiber_percentage: null,
    primary_fiber: null,
  },
  provenance: {
    status: "not_found",
    source_type: "company_prefix",
    captured_at: null,
    reviewed: false,
  },
  dpp_readiness: {
    status: "insufficient",
    mapped_fields: ["manufacturer_identifier"],
    missing_fields: [
      "product_identifier",
      "fiber_composition",
      "country_of_origin",
      "repair_information",
    ],
  },
  notice: `${DPP_READINESS_NOTICE} ${PREFIX_COMPOSITION_NOTICE}`,
};

const BY_KEY: Record<string, DemoCompositionRecord> = {
  "0123456789012": VERIFIED,
  "123456789012": VERIFIED,
  "silk-midi-skirt": VERIFIED,
  silkmidiskirt: VERIFIED,
  "0198765432104": REPORTED,
  "198765432104": REPORTED,
  "cotton-poplin-shirt": REPORTED,
  cottonpoplinshirt: REPORTED,
  "0500123456789": NOT_FOUND,
  "500123456789": NOT_FOUND,
  "house-unknown": NOT_FOUND,
  houseunknown: NOT_FOUND,
};

export function normalizeDemoQuery(raw: string | null | undefined): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^gtin[:\s-]*/i, "")
    .replace(/^ean[:\s-]*/i, "")
    .replace(/^sku[:\s-]*/i, "");
}

function unknownRecord(query: string): DemoCompositionRecord {
  const digits = query.replace(/\D/g, "");
  const gtin = digits || query.toUpperCase() || "";
  return {
    product: {
      gtin,
      brand: null,
      name: null,
      match_type: "none",
      sku: digits ? null : query.toUpperCase() || null,
    },
    composition: [],
    material_intelligence: {
      natural_fiber_percentage: null,
      primary_fiber: null,
    },
    provenance: {
      status: "not_found",
      source_type: "none",
      captured_at: null,
      reviewed: false,
    },
    dpp_readiness: {
      status: "insufficient",
      mapped_fields: [],
      missing_fields: [
        "product_identifier",
        "fiber_composition",
        "country_of_origin",
        "manufacturer_identifier",
        "repair_information",
      ],
    },
    notice: `${DPP_READINESS_NOTICE} No demonstration record matches this identifier. Composition was not guessed.`,
  };
}

export function lookupDemoComposition(raw: string | null | undefined): DemoCompositionRecord {
  const key = normalizeDemoQuery(raw);
  if (!key) return unknownRecord("");
  const digits = key.replace(/\D/g, "");
  const hit = BY_KEY[key] || (digits ? BY_KEY[digits] : undefined);
  if (hit) {
    const record = structuredClone(hit);
    const queriedDigits = key.replace(/\D/g, "");
    if (!queriedDigits && record.product.sku) {
      record.product.match_type = "sku";
    }
    return record;
  }
  return unknownRecord(key);
}

export function compositionIsAssumedVerified(record: DemoCompositionRecord): boolean {
  if (record.provenance.status === "verified" && record.composition.length > 0) {
    return record.provenance.source_type === "garment_label" && record.provenance.reviewed === true;
  }
  return false;
}

export const SNAPSHOT_MAILTO =
  "mailto:info@intertexe.com?subject=" +
  encodeURIComponent("Material Data Snapshot — 10 products") +
  "&body=" +
  encodeURIComponent(
    [
      "Hello INTERTEXE,",
      "",
      "Please run a Material Data Snapshot on the following 10 GTINs or catalog rows:",
      "",
      "1.",
      "2.",
      "3.",
      "4.",
      "5.",
      "6.",
      "7.",
      "8.",
      "9.",
      "10.",
      "",
      "Brand / catalog:",
      "Contact:",
      "",
      "We understand the next step is the $5,000 Catalog Enrichment Pilot (500 products).",
    ].join("\n")
  );

export const PILOT_MAILTO =
  "mailto:info@intertexe.com?subject=" +
  encodeURIComponent("Catalog Enrichment Pilot — 500 products") +
  "&body=" +
  encodeURIComponent(
    [
      "Hello INTERTEXE,",
      "",
      "We would like to start the $5,000 Catalog Enrichment Pilot (500 products).",
      "",
      "Brand:",
      "Catalog size:",
      "Region (EU / US / both):",
      "Contact:",
    ].join("\n")
  );
