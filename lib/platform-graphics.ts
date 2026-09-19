/**
 * Named graphic slots for /platform and /platform/demo.
 * Drop PNG/WebP files into public/platform/ using these filenames, then set `ready: true`.
 * Prefer dashboard-only crops (no burned-in marketing headlines) so page copy can change.
 * All figures are illustrative. Do not imply a live customer catalog or official DPP certification.
 */
export type PlatformGraphicSlot = {
  src: string;
  alt: string;
  width: number;
  height: number;
  placement: string;
  brief: string;
  ready: boolean;
};

export const PLATFORM_GRAPHICS = {
  heroWorkspace: {
    src: "/platform/hero-workspace.png",
    alt: "Illustrative INTERTEXE workspace showing catalog metrics, material mix, peer comparison and issues.",
    width: 2400,
    height: 1500,
    placement: "/platform hero, under the primary CTAs",
    brief: "Full product dashboard, app chrome only. Sidebar + metric cards + composition + brand vs peers + issues. No marketing headline burned in. Sample workspace, not a named real brand.",
    ready: false,
  },
  understandNormalize: {
    src: "/platform/understand-normalize.png",
    alt: "Messy source composition for Dress 8721 beside the normalized INTERTEXE record, with the original string retained.",
    width: 2000,
    height: 1200,
    placement: "/platform Understand, above or replacing the submitted/INTERTEXE split",
    brief: "Split screen. Left: spreadsheet/source (70 CO / 30 PA, lining viscose, supplier 65/35). Right: INTERTEXE shell/lining/conflict/missing origin. Keep original codes visible.",
    ready: false,
  },
  understandIssues: {
    src: "/platform/understand-issues.png",
    alt: "INTERTEXE Issues inbox with Dress 8721 composition conflict, filter chips, and resolution detail panel.",
    width: 2400,
    height: 1500,
    placement: "/platform Govern section, scroll Govern stage, /platform/discover Issues, demo Issues step",
    brief: "Issues Inbox UI with a notification count. Rows clickable. No 'official DPP score'. Show Dress 8721 conflict as the open issue.",
    ready: true,
  },
  compareBenchmark: {
    src: "/platform/compare-benchmark.png",
    alt: "INTERTEXE Material Benchmark dashboard — peer comparison, conversion cohorts, catalog readiness, and material mix.",
    width: 2400,
    height: 1500,
    placement: "/platform Intelligence section, scroll Measure stage, /platform/discover Benchmark, demo Benchmark step",
    brief: "Dark Material Benchmark panel — peer bars, conversion cohorts, readiness stat, material mix footer. Customer Zero · illustrative only.",
    ready: true,
  },
  actPassport: {
    src: "/platform/act-passport.png",
    alt: "INTERTEXE Publish passport screen with QR identity and consumer passport preview on mobile.",
    width: 2400,
    height: 1500,
    placement: "/platform scroll Publish stage, /platform/discover Passport studio, demo Passports step, live scan section",
    brief: "Three beats: workspace 'Ready to publish' → QR / product identity → phone passport (Materials, Manufacturing, Care). Do not require the INTERTEXE scanner.",
    ready: true,
  },
  demoSource: {
    src: "/platform/demo-source.png",
    alt: "Ten INTERTEXE sample products as messy source rows.",
    width: 1800,
    height: 1200,
    placement: "/platform/demo · Source step",
    brief: "Catalog table of the 10 sample SKUs with raw codes (CO, PA, SE, viscose, blank origin). Dress 8721 selected.",
    ready: false,
  },
  demoNormalized: {
    src: "/platform/demo-normalized.png",
    alt: "The same ten products after INTERTEXE normalization, original source retained.",
    width: 1800,
    height: 1200,
    placement: "/platform/demo · Normalized step",
    brief: "Same 10 SKUs, clean fiber names, conflict still visible on Dress 8721, 105% total flagged on the wool trouser. Do not invent missing values.",
    ready: false,
  },
  demoValidate: {
    src: "/platform/demo-validate.png",
    alt: "INTERTEXE product workspace with key indicators — traceability, compliance, recyclability, and environmental impact.",
    width: 1672,
    height: 941,
    placement: "/platform/demo · Validate step",
    brief: "Product record with KEY INDICATORS overlay: scores, supply-chain tiers, and PEFCR environmental impact. Ready-to-publish sample SKU.",
    ready: true,
  },
  demoIntelligence: {
    src: "/platform/demo-intelligence.png",
    alt: "Material intelligence overview for the ten-product sample catalog.",
    width: 1800,
    height: 1200,
    placement: "/platform/demo · Intelligence step",
    brief: "Overview cards for the 10-product catalog: products, issues, average natural fiber, passport-ready. Composition breakdown of the sample set.",
    ready: false,
  },
} as const satisfies Record<string, PlatformGraphicSlot>;

export type PlatformGraphicId = keyof typeof PLATFORM_GRAPHICS;
