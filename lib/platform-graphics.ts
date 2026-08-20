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
    alt: "Issues inbox listing composition conflicts, missing fields and invalid percentage totals.",
    width: 2000,
    height: 1200,
    placement: "/platform Understand audit counts, and demo Issues step",
    brief: "Issues Inbox UI with a notification count. Rows clickable. No 'official DPP score'. Show Dress 8721 conflict as the open issue.",
    ready: false,
  },
  compareBenchmark: {
    src: "/platform/compare-benchmark.png",
    alt: "Material position table comparing a brand to its peer group, with INTERTEXE consumer signal marked as coming.",
    width: 2000,
    height: 1200,
    placement: "/platform Compare, and demo Benchmark step",
    brief: "Your material position table (natural/synthetic/silk/completeness/passport-ready) plus INTERTEXE Consumer Signal with Coming/developing. Illustrative percents only.",
    ready: false,
  },
  actPassport: {
    src: "/platform/act-passport.png",
    alt: "Passport Studio with a product identity QR and a consumer-facing passport preview.",
    width: 2000,
    height: 1200,
    placement: "/platform Act, and demo Passports step",
    brief: "Three beats: workspace 'Ready to publish' → QR / product identity → phone passport (Materials, Manufacturing, Care). Do not require the INTERTEXE scanner.",
    ready: false,
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
