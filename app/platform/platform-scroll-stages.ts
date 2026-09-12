/** Shared scroll-story stages for desktop platform showcase (Phia / Fairly Made pattern). */

import {
  PLATFORM_CASE_STUDY,
  PLATFORM_LIVE_CATALOG,
  PLATFORM_PRODUCT_SHORT_NAME,
} from "../../lib/enterprise/platform-showcase";

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
    tone: "amber" | "teal" | "green" | "slate" | "rose";
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
    dial: { value: "4", unit: "sources", label: "Connected on ITX-LIVE-01" },
    card: {
      eyebrow: "Supplier feed · ERP · PLM",
      title: PLATFORM_PRODUCT_SHORT_NAME,
      detail: "100% Linen · European flax · Portugal assembly",
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
    dial: {
      value: `${PLATFORM_LIVE_CATALOG.avgNaturalFiberPct}%`,
      unit: "NFP",
      label: "Customer Zero catalog · vs 46% peer median",
    },
    card: {
      eyebrow: "Peer segment · Shirts",
      title: PLATFORM_CASE_STUDY.productName,
      detail: `${PLATFORM_CASE_STUDY.composition} · ${PLATFORM_LIVE_CATALOG.avgNaturalFiberPct}% natural fiber catalog average`,
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
    dial: {
      value: `${PLATFORM_LIVE_CATALOG.completeMaterialPct}%`,
      unit: "complete",
      label: "Required fields · Customer Zero catalog",
    },
    card: {
      eyebrow: "Issues · Resolution",
      title: PLATFORM_CASE_STUDY.styleCode,
      detail: `${PLATFORM_CASE_STUDY.composition} · provenance preserved · v4 published`,
      tone: "green",
    },
    image: "/platform/hero-workspace-desktop.png",
    imageAlt: "INTERTEXE enterprise workspace — Customer Zero catalog",
  },
  {
    id: "publish",
    kicker: "Publish",
    headline: "Passports and channels",
    headlineEmphasis: "from one record",
    copy: "Digital Product Passports, regulatory readiness tracking, and brand-owned product surfaces — all outputs of the same governed source.",
    points: ["QR-ready passport hosting", "Regulatory field tracking", "Public product experiences"],
    dial: {
      value: String(PLATFORM_LIVE_CATALOG.publishedPassports),
      unit: "live",
      label: "Published passports · Customer Zero",
    },
    card: {
      eyebrow: "Digital Product Passport",
      title: PLATFORM_PRODUCT_SHORT_NAME,
      detail: `${PLATFORM_CASE_STUDY.template} template · QR linked · scan to open`,
      tone: "slate",
    },
    image: "/platform/INTERTEXE_03_Fashion_Ecosystem.png",
    imageAlt: "Fashion ecosystem from product record to passport and channels",
  },
  {
    id: "next-life",
    kicker: "Next life",
    headline: "Resale and ownership",
    headlineEmphasis: "after first sale",
    copy: "When a garment moves on, the passport stays useful — list on connected marketplaces, transfer ownership, and keep circular options attached to the same product identity.",
    points: ["Multi-marketplace resale orchestration", "Ownership transfer on sold", "Repair · resell · donate · recycle"],
    dial: { value: "3", unit: "channels", label: "eBay · Vinted · Poshmark adapters" },
    card: {
      eyebrow: "Next life · Resale",
      title: PLATFORM_CASE_STUDY.styleCode,
      detail: "Sell this item · integrity-gated · ownership transfer",
      tone: "rose",
    },
    image: PLATFORM_CASE_STUDY.imageUrl,
    imageAlt: `${PLATFORM_CASE_STUDY.productName} — live Customer Zero passport`,
  },
] as const;

export const CARD_TONE_CLASS: Record<PlatformScrollStage["card"]["tone"], string> = {
  amber: "bg-[#f5efe6] text-[#7a5c2e] border-[#e8dcc8]",
  teal: "bg-[#e8f0ef] text-[#2c4a3e] border-[#cdded9]",
  green: "bg-[#eaf2ea] text-[#2d5a34] border-[#cfe0cf]",
  slate: "bg-[var(--platform-highlight)] text-[var(--platform-primary)] border-[var(--platform-border)]",
  rose: "bg-[#f5ece8] text-[#6b3a2e] border-[#e8d4cc]",
};
