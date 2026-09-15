"use client";

import Image from "next/image";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { useState } from "react";
import {
  caseStudyPassportUrl,
  PASSPORT_CASE_STUDY,
} from "../../../lib/enterprise/passport-case-study";
import { SERIF } from "../platform-ui";

const SOURCES = [
  { label: "PLM", icon: "▣" },
  { label: "ERP", icon: "◫" },
  { label: "Spreadsheets", icon: "▤" },
  { label: "Supplier files", icon: "▥" },
] as const;

const PASSPORT_FIELDS = [
  "Materials",
  "Supply Chain",
  "Compliance",
  "Impact",
  "Care & Repair",
] as const;

const DELIVERY_CHANNELS = [
  { id: "app", label: "Your App", sub: "In-app product page", icon: "phone" as const },
  { id: "domain", label: "Your Brand Domain", sub: "passport.yourbrand.com", icon: "globe" as const },
  { id: "api", label: "Headless API", sub: "Integrate anywhere", icon: "code" as const },
] as const;

const NEXT_LIFE_ACTIONS = [
  { label: "Sell this item", sub: "Verified resale draft" },
  { label: "Repair & rewear", sub: "Care guidance" },
  { label: "Donate", sub: "Pass on in use" },
  { label: "Recycle", sub: "Fiber-aware routing" },
] as const;

const STAGES = [
  {
    id: "create" as const,
    micro: "Input",
    label: "Create",
    title: "Capture and structure product data",
    copy: "Bring together product identity, composition, supplier inputs, specifications, and manufacturing details into one structured foundation.",
    chips: ["Product identity", "Materials & composition", "Supplier + factory data", "Source files & specifications"],
    foot: "From disconnected files to one usable data layer.",
  },
  {
    id: "verify" as const,
    micro: "Validation",
    label: "Verify",
    title: "Find gaps before they become risk",
    copy: "Identify missing composition, incomplete traceability, unsupported claims, and supplier evidence gaps across the product record.",
    chips: ["Missing composition", "Supplier evidence gaps", "Unsupported claims", "Incomplete manufacturing details"],
    foot: "Turn fragmented product data into trusted product data.",
  },
  {
    id: "comply" as const,
    micro: "Compliance",
    label: "Comply",
    title: "Prepare products for trust and regulation",
    copy: "Turn approved product data into a governed record ready for Digital Product Passports, regulatory requirements, and controlled transparency.",
    chips: ["Digital Product Passport ready", "Traceability structure", "Regulatory requirements", "Approved evidence layer"],
    foot: "One governed record. Ready for regulation, audit, and consumer use.",
  },
  {
    id: "distribute" as const,
    micro: "Delivery",
    label: "Distribute",
    title: "One record, every channel",
    copy: "Publish product data through hosted passports, branded experiences, or API so every channel works from the same governed source.",
    chips: ["Hosted passport", "Brand domain", "Headless API", "One record, every channel"],
    foot: "Infrastructure — not just a page builder.",
  },
  {
    id: "extend" as const,
    micro: "Circularity",
    label: "Extend",
    title: "Support the product after the sale",
    copy: "Power scan-based care, repair, resale, transfer, and circular next-life experiences from the same product record.",
    chips: ["Composition & origin", "Care & aftercare", "Repair guidance", "Resale & transfer"],
    foot: "From first sale to second life.",
  },
];

type StageId = (typeof STAGES)[number]["id"];

function DeliverChannelIcon({ kind }: { kind: "phone" | "globe" | "code" }) {
  const cls = "h-3.5 w-3.5 text-[var(--platform-primary)]";
  if (kind === "phone") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }
  if (kind === "globe") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}

function StageIcon({ kind }: { kind: StageId }) {
  const cls = "h-[20px] w-[20px] text-[var(--platform-primary)]";
  if (kind === "create") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
        <path d="M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
      </svg>
    );
  }
  if (kind === "verify") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    );
  }
  if (kind === "comply") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (kind === "distribute") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 12a8 8 0 0 1 13.5-5.7M20 12a8 8 0 0 1-13.5 5.7" />
      <path d="M17 3h3v3M7 21H4v-3" />
    </svg>
  );
}

function ExperienceArrow({ className = "" }: { className?: string }) {
  return (
    <span className={`platform-what-experience-arrow ${className}`} aria-hidden>
      →
    </span>
  );
}

function CreateDiagram({ active }: { active: boolean }) {
  return (
    <div className={`platform-what-diagram ${active ? "is-active" : ""}`}>
      <div className="platform-what-source-grid">
        {SOURCES.map((source) => (
          <div key={source.label} className="platform-what-diagram-pill">
            <span className="platform-what-diagram-pill-icon" aria-hidden>
              {source.icon}
            </span>
            {source.label}
          </div>
        ))}
      </div>
      <div className="platform-what-flow-lines" aria-hidden>
        <span className="platform-what-flow-line platform-what-flow-line-a" />
        <span className="platform-what-flow-line platform-what-flow-line-b" />
        <span className="platform-what-flow-line platform-what-flow-line-c" />
        <span className="platform-what-flow-line platform-what-flow-line-d" />
      </div>
      <div className="platform-what-diagram-connector">
        <ExperienceArrow />
        <span className="platform-what-diagram-connector-label">Structured record</span>
      </div>
      <div className="platform-what-diagram-output">
        <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-[#f0ebe4]">
          <Image
            src={PASSPORT_CASE_STUDY.imageUrl}
            alt={PASSPORT_CASE_STUDY.productName}
            fill
            className="object-cover"
            sizes="44px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-primary)]">Product record</p>
          <p className="text-[11px] text-[var(--platform-muted)] truncate">{PASSPORT_CASE_STUDY.styleCode}</p>
          <p className="text-[10px] text-[var(--platform-quiet)] truncate">{PASSPORT_CASE_STUDY.composition}</p>
        </div>
      </div>
    </div>
  );
}

function VerifyDiagram({ active }: { active: boolean }) {
  const issues = [
    { label: "Missing composition", tone: "warn" as const },
    { label: "Supplier evidence gap", tone: "warn" as const },
    { label: "Traceability tier 3", tone: "info" as const },
    { label: "Care instructions", tone: "ok" as const },
  ];

  return (
    <div className={`platform-what-diagram ${active ? "is-active" : ""}`}>
      <div className="platform-what-verify-list">
        {issues.map((issue) => (
          <div
            key={issue.label}
            className={`platform-what-verify-row platform-what-verify-row--${issue.tone}`}
          >
            <span className="platform-what-verify-dot" aria-hidden />
            <span>{issue.label}</span>
            {issue.tone === "warn" ? (
              <span className="platform-what-verify-badge">Open</span>
            ) : issue.tone === "ok" ? (
              <span className="platform-what-verify-badge platform-what-verify-badge--ok">Resolved</span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="platform-what-diagram-foot">3 issues flagged · guided resolution in workspace</p>
    </div>
  );
}

function ComplyDiagram({ active }: { active: boolean }) {
  const passportUrl = caseStudyPassportUrl();
  const displayName = PASSPORT_CASE_STUDY.productName;

  return (
    <div className={`platform-what-diagram ${active ? "is-active" : ""}`}>
      <div className="platform-what-publish-flow">
        <div className="platform-what-approved-chip">
          <div className="relative h-9 w-8 shrink-0 overflow-hidden rounded-md bg-[#f0ebe4]">
            <Image src={PASSPORT_CASE_STUDY.imageUrl} alt="" fill className="object-cover" sizes="32px" />
          </div>
          <div>
            <p className="text-[8px] tracking-[0.12em] uppercase text-[var(--platform-quiet)]">Governed record</p>
            <p className="text-[10px] text-[var(--platform-muted)]">{PASSPORT_CASE_STUDY.styleCode}</p>
          </div>
          <span className="platform-what-check platform-what-check-sm" aria-hidden>
            ✓
          </span>
        </div>
        <ExperienceArrow className="platform-what-experience-arrow-inline" />
        <div className="platform-what-passport-card">
          <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-[#f0ebe4]">
            <Image src={PASSPORT_CASE_STUDY.imageUrl} alt="" fill className="object-cover" sizes="48px" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">
              Digital Product Passport
            </p>
            <p className="text-[11px] text-[var(--platform-ink)] mt-0.5 leading-snug" style={SERIF}>
              {displayName}
            </p>
            <ul className="platform-what-passport-fields mt-2">
              {PASSPORT_FIELDS.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
          <div className="platform-what-passport-qr shrink-0">
            <QRCodeCanvas value={passportUrl} size={56} marginSize={1} />
            <Link href={`/p/${PASSPORT_CASE_STUDY.publicId}`} className="platform-what-passport-qr-link">
              Scan live →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DistributeDiagram({ active }: { active: boolean }) {
  const passportUrl = caseStudyPassportUrl();
  const displayName = PASSPORT_CASE_STUDY.productName;

  return (
    <div className={`platform-what-diagram platform-what-diagram-deliver ${active ? "is-active" : ""}`}>
      <div className="platform-what-experience-phone">
        <div className="platform-what-phone-mock">
          <div className="platform-what-phone-screen">
            <div className="platform-what-phone-ui">
              <p className="platform-what-phone-brand">INTERTEXE</p>
              <div className="relative h-14 w-full overflow-hidden rounded-md bg-[#f0ebe4] mb-2">
                <Image src={PASSPORT_CASE_STUDY.imageUrl} alt="" fill className="object-cover" sizes="100px" />
              </div>
              <p className="platform-what-phone-title" style={SERIF}>
                {displayName}
              </p>
              <ul className="platform-what-phone-fields">
                {["Materials", "Origin", "Care", "Impact"].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div className="platform-what-phone-qr">
                <QRCodeCanvas value={passportUrl} size={34} marginSize={0} />
              </div>
            </div>
          </div>
        </div>
        <ExperienceArrow className="platform-what-experience-arrow-deliver" />
      </div>
      <div className="platform-what-deliver-branches">
        {DELIVERY_CHANNELS.map((channel) => (
          <div key={channel.id} className="platform-what-deliver-branch">
            <span className="platform-what-deliver-icon" aria-hidden>
              <DeliverChannelIcon kind={channel.icon} />
            </span>
            <div>
              <p className="text-[10px] text-[var(--platform-ink)]">{channel.label}</p>
              <p className="text-[9px] text-[var(--platform-quiet)]">{channel.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExtendDiagram({ active }: { active: boolean }) {
  const passportUrl = caseStudyPassportUrl();

  return (
    <div className={`platform-what-diagram platform-what-diagram-extend ${active ? "is-active" : ""}`}>
      <div className="platform-what-experience-phone">
        <div className="platform-what-phone-mock">
          <div className="platform-what-phone-screen">
            <div className="platform-what-phone-ui">
              <p className="platform-what-phone-brand">Next life</p>
              <div className="relative h-10 w-full overflow-hidden rounded-md bg-[#f0ebe4] mb-2">
                <Image src={PASSPORT_CASE_STUDY.imageUrl} alt="" fill className="object-cover" sizes="80px" />
              </div>
              <ul className="platform-what-extend-actions">
                {NEXT_LIFE_ACTIONS.map((action) => (
                  <li key={action.label}>
                    <span className="platform-what-extend-action-title">{action.label}</span>
                    <span className="platform-what-extend-action-sub">{action.sub}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="platform-what-extend-meta">
        <p className="text-[9px] tracking-[0.12em] uppercase text-[var(--platform-quiet)]">Same governed record</p>
        <Link href={`/p/${PASSPORT_CASE_STUDY.publicId}/sell`} className="platform-what-passport-qr-link">
          Open resale flow →
        </Link>
        <div className="platform-what-phone-qr mt-2">
          <QRCodeCanvas value={passportUrl} size={40} marginSize={0} />
        </div>
      </div>
    </div>
  );
}

function StageDiagram({ id, active }: { id: StageId; active: boolean }) {
  if (id === "create") return <CreateDiagram active={active} />;
  if (id === "verify") return <VerifyDiagram active={active} />;
  if (id === "comply") return <ComplyDiagram active={active} />;
  if (id === "distribute") return <DistributeDiagram active={active} />;
  return <ExtendDiagram active={active} />;
}

export function WhatItIsProcessVisual() {
  const [activeId, setActiveId] = useState<StageId>("create");

  return (
    <div className="platform-what-cards platform-what-cards-five platform-what-cards-interactive">
      {STAGES.map((stage, i) => {
        const active = activeId === stage.id;
        return (
          <div key={stage.id} className="contents">
            <article
              className={`platform-what-card ${active ? "is-active" : ""}`}
              onMouseEnter={() => setActiveId(stage.id)}
            >
              <button
                type="button"
                className="platform-what-card-trigger"
                aria-pressed={active}
                onClick={() => setActiveId(stage.id)}
              >
                <p className="platform-what-card-micro">{stage.micro}</p>
                <header className="platform-what-card-header">
                  <span className="platform-what-card-icon" aria-hidden>
                    <StageIcon kind={stage.id} />
                  </span>
                  <div>
                    <p className="platform-what-card-label">{stage.label}</p>
                    <h3 className="platform-what-card-title" style={SERIF}>
                      {stage.title}
                    </h3>
                  </div>
                </header>
                <p className="platform-what-card-copy">{stage.copy}</p>
                <ul className="platform-what-card-chips">
                  {stage.chips.map((chip) => (
                    <li key={chip}>{chip}</li>
                  ))}
                </ul>
                <StageDiagram id={stage.id} active={active} />
                <p className="platform-what-card-foot">{stage.foot}</p>
              </button>
            </article>
            {i < STAGES.length - 1 ? (
              <div className="hidden xl:flex items-center justify-center px-0.5" aria-hidden>
                <span className="platform-what-between-arrow">→</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
