/** Shared scroll-story stages for desktop platform showcase (Phia / Fairly Made pattern). */

export type PlatformScrollStage = {
  id: string;
  kicker: string;
  headline: string;
  headlineEmphasis?: string;
  copy: string;
  points: readonly string[];
  dial: {
    value: string;
    unit: string;
    label: string;
  };
  card: {
    eyebrow: string;
    title: string;
    detail: string;
    tone: "amber" | "teal" | "green" | "slate";
  };
  image: string;
  imageAlt: string;
};

export const PLATFORM_SCROLL_STAGES: readonly PlatformScrollStage[] = [
  {
    id: "trace",
    kicker: "Trace",
    headline: "Connect fragmented",
    headlineEmphasis: "product sources",
    copy: "PLM, ERP, spreadsheets and supplier feeds into one workspace — provenance preserved, conflicts surfaced, never overwritten.",
    points: ["Dedicated supplier interface", "Source lineage on every row", "Conflict detection, not blind merge"],
    dial: { value: "4", unit: "sources", label: "Connected on this record" },
    card: {
      eyebrow: "Supplier feed · ERP · PLM",
      title: "Wide-leg linen trouser",
      detail: "98% Cotton / 2% Elastane vs 100% Cotton — conflict flagged",
      tone: "amber",
    },
    image: "/platform/INTERTEXE_02_Product_Data_Journey.png",
    imageAlt: "Product data journey from supplier feeds to governed record",
  },
  {
    id: "measure",
    kicker: "Measure",
    headline: "Benchmark material",
    headlineEmphasis: "strategy",
    copy: "Compare fiber mix, completeness and passport readiness against governed peer segments — with conversion signals that show what is working.",
    points: ["Peer segment medians", "Category and price-tier drill-down", "Governed datasets only"],
    dial: { value: "+11%", unit: "NFP", label: "vs governed peer median" },
    card: {
      eyebrow: "Peer segment · Ready-to-wear",
      title: "Silk-blend midi dress",
      detail: "Natural fiber share +11% vs governed peer median",
      tone: "teal",
    },
    image: "/platform/ecosystem-intelligence.jpg",
    imageAlt: "Material intelligence and benchmark dashboard",
  },
  {
    id: "govern",
    kicker: "Govern",
    headline: "One approved",
    headlineEmphasis: "product record",
    copy: "Normalization, evidence workflow, and version history — an approved canonical record your teams can trust without replacing existing systems.",
    points: ["Evidence and confidence workflow", "Issues inbox, not another spreadsheet", "Versioned product history"],
    dial: { value: "81%", unit: "complete", label: "Required fields on sample catalog" },
    card: {
      eyebrow: "Issues · Resolution",
      title: "Cashmere crew knit",
      detail: "Composition conflict resolved · provenance preserved",
      tone: "green",
    },
    image: "/platform/hero-workspace-desktop.png",
    imageAlt: "INTERTEXE enterprise workspace — illustrative sample catalog",
  },
  {
    id: "publish",
    kicker: "Publish",
    headline: "Passports and channels",
    headlineEmphasis: "from one record",
    copy: "Digital Product Passports, regulatory readiness tracking, and brand-owned product surfaces — all outputs of the same governed source.",
    points: ["QR-ready passport hosting", "Regulatory field tracking", "Public product experiences"],
    dial: { value: "12/12", unit: "fields", label: "Passport readiness on sample SKU" },
    card: {
      eyebrow: "Digital Product Passport",
      title: "Wool tailored blazer",
      detail: "QR linked · published from approved record",
      tone: "slate",
    },
    image: "/platform/INTERTEXE_03_Fashion_Ecosystem.png",
    imageAlt: "Fashion ecosystem from product record to passport and channels",
  },
] as const;

export const CARD_TONE_CLASS: Record<PlatformScrollStage["card"]["tone"], string> = {
  amber: "bg-[#f5efe6] text-[#7a5c2e] border-[#e8dcc8]",
  teal: "bg-[#e8f0ef] text-[#2c4a3e] border-[#cdded9]",
  green: "bg-[#eaf2ea] text-[#2d5a34] border-[#cfe0cf]",
  slate: "bg-[var(--platform-highlight)] text-[var(--platform-primary)] border-[var(--platform-border)]",
};
