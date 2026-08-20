/**
 * Permanent /platform/demo catalog: 10 INTERTEXE sample products that walk
 * messy source data → normalization → issues → intelligence → benchmark → passport.
 * Illustrative only. Not a live customer catalog. Does not invent missing facts.
 */

export const DEMO_CATALOG_NOTICE =
  "Illustrative INTERTEXE sample catalog. Not a live customer catalog. Original source strings are preserved; missing fields stay missing.";

export type DemoIssueKind =
  | "conflict"
  | "invalid_total"
  | "missing_identifier"
  | "missing_origin"
  | "missing_supplier"
  | "missing_evidence"
  | "missing_composition";

export type DemoPassportStatus = "ready" | "needs_data" | "review";

export type DemoCatalogProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  source: {
    main: string;
    lining?: string;
    supplier?: string;
    origin?: string;
    identifier?: string;
    extra?: string;
  };
  normalized: {
    shell: string;
    lining?: string;
    origin?: string;
    identifier?: string;
    confidence: "high" | "review" | "missing";
  };
  issues: DemoIssueKind[];
  passport: {
    status: DemoPassportStatus;
    missing: string[];
  };
  naturalFiberShare: number | null;
  silk: boolean;
};

export const DEMO_WORKFLOW = [
  { id: "source", label: "Source" },
  { id: "normalized", label: "Normalized" },
  { id: "issues", label: "Issues" },
  { id: "intelligence", label: "Intelligence" },
  { id: "benchmark", label: "Benchmark" },
  { id: "passports", label: "Passports" },
] as const;

export type DemoWorkflowId = (typeof DEMO_WORKFLOW)[number]["id"];

export const DEMO_ISSUE_LABEL: Record<DemoIssueKind, string> = {
  conflict: "Conflicting compositions",
  invalid_total: "Invalid percentage totals",
  missing_identifier: "Missing identifiers",
  missing_origin: "Missing country of origin",
  missing_supplier: "Missing supplier information",
  missing_evidence: "Evidence required",
  missing_composition: "Missing composition",
};

export const DEMO_CATALOG: DemoCatalogProduct[] = [
  {
    id: "dress-8721",
    sku: "ITX-8721",
    name: "Dress 8721",
    category: "Dresses",
    source: {
      main: "70 CO / 30 PA",
      lining: "viscose",
      supplier: "65 cotton / 35 nylon",
      origin: "",
      identifier: "ITX-8721",
      extra: "Certification in a separate spreadsheet",
    },
    normalized: {
      shell: "Conflict · 70% Cotton / 30% Polyamide vs 65% Cotton / 35% Nylon",
      lining: "100% Viscose",
      origin: undefined,
      identifier: "ITX-8721",
      confidence: "review",
    },
    issues: ["conflict", "missing_origin"],
    passport: { status: "review", missing: ["resolved_composition", "country_of_origin"] },
    naturalFiberShare: null,
    silk: false,
  },
  {
    id: "silk-evening-dress",
    sku: "ITX-4102",
    name: "Silk Evening Dress",
    category: "Dresses",
    source: {
      main: "92 SE 8 EA",
      lining: "LINING 100 VI",
      supplier: "Portugal atelier declaration",
      origin: "PT",
      identifier: "ITX-4102",
    },
    normalized: {
      shell: "92% Silk · 8% Elastane",
      lining: "100% Viscose",
      origin: "Portugal",
      identifier: "ITX-4102",
      confidence: "high",
    },
    issues: [],
    passport: { status: "ready", missing: [] },
    naturalFiberShare: 92,
    silk: true,
  },
  {
    id: "silk-midi-skirt",
    sku: "SAMPLE-VERIFIED",
    name: "Silk Midi Skirt",
    category: "Skirts",
    source: {
      main: "96% silk 4% elastane",
      origin: "IT",
      identifier: "0200000000035",
    },
    normalized: {
      shell: "96% Silk · 4% Elastane",
      origin: "Italy",
      identifier: "0200000000035",
      confidence: "high",
    },
    issues: [],
    passport: { status: "ready", missing: [] },
    naturalFiberShare: 96,
    silk: true,
  },
  {
    id: "cotton-poplin-shirt",
    sku: "SAMPLE-REPORTED",
    name: "Cotton Poplin Shirt",
    category: "Tops",
    source: {
      main: "100% cotton",
      origin: "PT",
      identifier: "0200000000011",
      extra: "Retailer / feed claim",
    },
    normalized: {
      shell: "100% Cotton",
      origin: "Portugal",
      identifier: "0200000000011",
      confidence: "high",
    },
    issues: ["missing_evidence"],
    passport: { status: "needs_data", missing: ["evidence"] },
    naturalFiberShare: 100,
    silk: false,
  },
  {
    id: "linen-wrap-top",
    sku: "ITX-1180",
    name: "Linen Wrap Top",
    category: "Tops",
    source: {
      main: "LN 100",
      origin: "LT",
      identifier: "ITX-1180",
      extra: "Organic claim, no certificate file",
    },
    normalized: {
      shell: "100% Linen",
      origin: "Lithuania",
      identifier: "ITX-1180",
      confidence: "review",
    },
    issues: ["missing_evidence"],
    passport: { status: "needs_data", missing: ["evidence"] },
    naturalFiberShare: 100,
    silk: false,
  },
  {
    id: "wool-trouser",
    sku: "ITX-3308",
    name: "Wool Tailored Trouser",
    category: "Trousers",
    source: {
      main: "60 WO / 30 PA / 15 EL",
      origin: "RO",
      identifier: "ITX-3308",
    },
    normalized: {
      shell: "Invalid total · 60% Wool / 30% Polyamide / 15% Elastane (105%)",
      origin: "Romania",
      identifier: "ITX-3308",
      confidence: "review",
    },
    issues: ["invalid_total"],
    passport: { status: "review", missing: ["valid_composition_total"] },
    naturalFiberShare: null,
    silk: false,
  },
  {
    id: "cashmere-crew",
    sku: "ITX-2204",
    name: "Cashmere Crew",
    category: "Knitwear",
    source: {
      main: "100 WS",
      origin: "MN",
      identifier: "",
    },
    normalized: {
      shell: "100% Cashmere",
      origin: "Mongolia",
      identifier: undefined,
      confidence: "review",
    },
    issues: ["missing_identifier"],
    passport: { status: "needs_data", missing: ["product_identifier"] },
    naturalFiberShare: 100,
    silk: false,
  },
  {
    id: "viscose-slip",
    sku: "ITX-5519",
    name: "Viscose Slip Dress",
    category: "Dresses",
    source: {
      main: "100 VI",
      origin: "CN",
      identifier: "ITX-5519",
    },
    normalized: {
      shell: "100% Viscose",
      origin: "China",
      identifier: "ITX-5519",
      confidence: "review",
    },
    issues: ["missing_supplier"],
    passport: { status: "needs_data", missing: ["supplier"] },
    naturalFiberShare: 0,
    silk: false,
  },
  {
    id: "nylon-shell",
    sku: "ITX-6701",
    name: "Recycled Nylon Shell",
    category: "Outerwear",
    source: {
      main: "100 PA (recycled)",
      supplier: "Mill declaration on file",
      origin: "TW",
      identifier: "ITX-6701",
    },
    normalized: {
      shell: "100% Polyamide (recycled claim retained as source text)",
      origin: "Taiwan",
      identifier: "ITX-6701",
      confidence: "high",
    },
    issues: [],
    passport: { status: "ready", missing: [] },
    naturalFiberShare: 0,
    silk: false,
  },
  {
    id: "silk-scarf",
    sku: "ITX-0906",
    name: "Silk Scarf",
    category: "Accessories",
    source: {
      main: "100 SE",
      origin: "IT",
      identifier: "ITX-0906",
    },
    normalized: {
      shell: "100% Silk",
      origin: "Italy",
      identifier: "ITX-0906",
      confidence: "high",
    },
    issues: [],
    passport: { status: "ready", missing: [] },
    naturalFiberShare: 100,
    silk: true,
  },
];

export type DemoIssueSummary = {
  kind: DemoIssueKind;
  label: string;
  count: number;
  skus: string[];
};

export function demoIssueSummary(products: DemoCatalogProduct[] = DEMO_CATALOG): DemoIssueSummary[] {
  const kinds: DemoIssueKind[] = [
    "conflict",
    "invalid_total",
    "missing_identifier",
    "missing_origin",
    "missing_supplier",
    "missing_evidence",
    "missing_composition",
  ];
  return kinds
    .map((kind) => {
      const matches = products.filter((product) => product.issues.includes(kind));
      return {
        kind,
        label: DEMO_ISSUE_LABEL[kind],
        count: matches.length,
        skus: matches.map((product) => product.sku),
      };
    })
    .filter((row) => row.count > 0);
}

export function demoCatalogStats(products: DemoCatalogProduct[] = DEMO_CATALOG) {
  const withShare = products.filter((product) => product.naturalFiberShare != null);
  const natural =
    withShare.length === 0
      ? null
      : Math.round(withShare.reduce((sum, product) => sum + (product.naturalFiberShare || 0), 0) / withShare.length);
  const silkShare = Math.round((products.filter((product) => product.silk).length / products.length) * 100);
  const complete = Math.round(
    (products.filter((product) => product.normalized.confidence === "high").length / products.length) * 100
  );
  const ready = Math.round(
    (products.filter((product) => product.passport.status === "ready").length / products.length) * 100
  );
  const issueCount = products.filter((product) => product.issues.length > 0).length;
  return {
    products: products.length,
    issueCount,
    readyCount: products.filter((product) => product.passport.status === "ready").length,
    natural,
    synthetic: natural == null ? null : 100 - natural,
    silkShare,
    complete,
    ready,
  };
}
